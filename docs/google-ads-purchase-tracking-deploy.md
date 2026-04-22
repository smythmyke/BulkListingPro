# BLP Purchase Conversion Tracking — Deployment Steps

**Date prepared:** 2026-04-21
**What this enables:** Server-side Google Ads conversion upload when a BLP credit pack or subscription is purchased. Uses Enhanced Conversions with hashed email match (no GCLID required).

## What changed in code

**New file:** `api/google-ads-conversions.js` — helper module with `uploadBlpPurchaseConversion()`.

**Modified:** `api/api-server.js`
- Line ~14: added `require('./google-ads-conversions')`
- ~line 4953: fires conversion after successful `checkout.session.completed` for BLP credit_purchase
- ~line 5024: fires conversion on `invoice.paid` when `billing_reason === 'subscription_create'` and `product === 'BulkListingPro'`

**Modified:** `api/package.json`
- Added `google-ads-api: ^18.0.0` dependency

Renewals (`billing_reason === 'subscription_cycle'`) intentionally do NOT fire a conversion.

## Google Ads resources already created

- **Conversion Action**: "BulkListingPro - Credit Purchase"
  - ID: `7583741225`
  - Resource name: `customers/8702609992/conversionActions/7583741225`
  - Type: WEBPAGE, Category: PURCHASE, MANY_PER_CLICK, primary_for_goal=True
  - Default value: 0 (overridden per-upload with actual Stripe amount)

## Deployment checklist

### 1. Install new dependency
```bash
cd C:\Users\smyth\OneDrive\Desktop\Projects\GovToolsPro\api
npm install
```

### 2. Generate Google Ads refresh token for the backend

The Python scripts in `C:\Projects\ideas\google-ads-tools\` already have a valid refresh token at `.google_ads_token.json`. Extract the `refresh_token` field — same value works for the Node.js backend.

```bash
# On your machine, get the value (do NOT commit):
cat C:\Projects\ideas\google-ads-tools\.google_ads_token.json
```

### 3. Add secrets to GCP Secret Manager

Same GCP project as `GEMINI_API_KEY` (`sam-extension`). Create these secrets:

```bash
# Replace <value> with actual values
echo -n "<value>" | gcloud secrets create GOOGLE_ADS_CLIENT_ID --data-file=- --project=sam-extension
echo -n "<value>" | gcloud secrets create GOOGLE_ADS_CLIENT_SECRET --data-file=- --project=sam-extension
echo -n "<value>" | gcloud secrets create GOOGLE_ADS_DEVELOPER_TOKEN --data-file=- --project=sam-extension
echo -n "<value>" | gcloud secrets create GOOGLE_ADS_REFRESH_TOKEN --data-file=- --project=sam-extension
```

Values — pull from `C:\Projects\ideas\google-ads-tools\.env` and `.google_ads_token.json`:
- `GOOGLE_ADS_CLIENT_ID` — from `.env`
- `GOOGLE_ADS_CLIENT_SECRET` — from `.env`
- `GOOGLE_ADS_DEVELOPER_TOKEN` — from `.env`
- `GOOGLE_ADS_REFRESH_TOKEN` — `refresh_token` field from `.google_ads_token.json`

### 4. Grant the Cloud Run service account access to the new secrets

```bash
# Get the Cloud Run service account (likely already has access to GEMINI_API_KEY)
SA=$(gcloud run services describe business-search-api --region=us-central1 --format='value(spec.template.spec.serviceAccountName)' --project=sam-extension)

for SECRET in GOOGLE_ADS_CLIENT_ID GOOGLE_ADS_CLIENT_SECRET GOOGLE_ADS_DEVELOPER_TOKEN GOOGLE_ADS_REFRESH_TOKEN; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project=sam-extension
done
```

### 5. Update Cloud Run deploy config

Add these env vars to the Cloud Run service (either via `deploy.sh` or `gcloud run deploy`):

```
GOOGLE_ADS_CUSTOMER_ID=8702609992
GOOGLE_ADS_BLP_PURCHASE_CONVERSION=customers/8702609992/conversionActions/7583741225
GOOGLE_ADS_CLIENT_ID=<from-secret>
GOOGLE_ADS_CLIENT_SECRET=<from-secret>
GOOGLE_ADS_DEVELOPER_TOKEN=<from-secret>
GOOGLE_ADS_REFRESH_TOKEN=<from-secret>
```

`deploy.sh` flags example:
```
--set-env-vars GOOGLE_ADS_CUSTOMER_ID=8702609992,GOOGLE_ADS_BLP_PURCHASE_CONVERSION=customers/8702609992/conversionActions/7583741225 \
--set-secrets GOOGLE_ADS_CLIENT_ID=GOOGLE_ADS_CLIENT_ID:latest,GOOGLE_ADS_CLIENT_SECRET=GOOGLE_ADS_CLIENT_SECRET:latest,GOOGLE_ADS_DEVELOPER_TOKEN=GOOGLE_ADS_DEVELOPER_TOKEN:latest,GOOGLE_ADS_REFRESH_TOKEN=GOOGLE_ADS_REFRESH_TOKEN:latest
```

### 6. Deploy
```bash
cd C:\Users\smyth\OneDrive\Desktop\Projects\GovToolsPro\api
bash deploy.sh      # or whichever deploy command is used
```

### 7. Manual step in Google Ads UI — scope campaign to BLP conversions only

The API v23 rejected scoping the BLP campaign to its own conversions. Do this in the UI:

- Google Ads → Campaigns → "BulkListingPro - Search Ads"
- Settings → Conversion goals → "Use this campaign's specific conversion goals"
- Include: **"BulkListingPro - Install Click"** and **"BulkListingPro - Credit Purchase"**
- Exclude all others (expunge-it, markitup, JK)

### 8. Optional: Enable Enhanced Conversions for Leads (account-level)

API rejected this with PERMISSION_DENIED. Enable in UI:

- Google Ads → Admin → Conversion settings → Enhanced conversions
- Enable "Enhanced conversions for leads"
- Accept terms if prompted

The backend upload may work without this toggle since we use `user_identifiers[].hashed_email` with a PURCHASE conversion (which falls under Enhanced Conversions for Web, not Leads). If upload fails with an auth error in logs, this is the fix.

## Testing

### Test mode first
1. In Stripe test mode, buy a credit pack as a test user (email matching a real Google Ads viewer)
2. Watch Cloud Run logs for `[GoogleAds] uploaded BLP purchase conversion`
3. Check Google Ads → Goals → Conversion actions → "BulkListingPro - Credit Purchase" → Diagnostics
4. Conversion appears within ~3 hours (offline conversion processing delay)

### If upload fails
Common issues:
- `ads_not_configured` → env vars not set on Cloud Run
- `partial_failure` with `UNAUTHENTICATED` → refresh token expired; regenerate via `C:\Projects\ideas\google-ads-tools\refresh_token.py` (or equivalent)
- `partial_failure` with `INVALID_CUSTOMER_DATA` → Enhanced Conversions for Web not enabled; enable in UI (see step 8)
- `partial_failure` with `CONVERSION_ACTION_NOT_FOUND` → wrong GOOGLE_ADS_BLP_PURCHASE_CONVERSION env var

### Failure mode is safe
Upload failures are caught and logged but do NOT break the purchase flow. User still gets their credits.

## Roll-back

If anything goes wrong, set `GOOGLE_ADS_BLP_PURCHASE_CONVERSION=` (empty) in Cloud Run and redeploy. The module will return early with `missing_conversion_action_env` and do nothing.
