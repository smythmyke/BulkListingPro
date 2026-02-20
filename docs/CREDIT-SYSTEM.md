# BulkListingPro Credit System

## Overview

Credits are the monetization mechanism for BulkListingPro. Users purchase credit packs and spend credits when uploading listings.

## Credit Pricing

### Credit Packs

| Pack | Credits | Price | Per Credit | Per Listing |
|------|---------|-------|------------|-------------|
| Starter | 50 | $1.99 | $0.04 | $0.08 |
| Standard | 150 | $4.99 | $0.03 | $0.07 |
| Pro | 400 | $11.99 | $0.03 | $0.06 |
| Power | 1000 | $24.99 | $0.025 | $0.05 |

### Free Tier

- **10 free credits** on signup
- Allows users to test the extension (~5 listings)
- No credit card required

### Credit Usage

| Action | Credits | Notes |
|--------|---------|-------|
| Upload 1 listing | 2 | Flat rate |
| Failed upload | 0 | Refunded automatically |

## Credit Flow

### Purchase Flow

```
User clicks "Buy Credits"
    ↓
Extension → POST /api/payments/create-checkout
    ↓
Stripe Checkout opens
    ↓
User completes payment
    ↓
Stripe → POST /api/webhooks/stripe
    ↓
Backend adds credits to Firebase
    ↓
Extension fetches updated balance
```

### Usage Flow

```
User starts upload
    ↓
Extension → GET /api/user/credits (check balance)
    ↓
Sufficient? Continue : Show "Buy Credits"
    ↓
For each listing:
    Content script creates listing
    ↓
    On success → POST /api/user/credits/use
    ↓
    Backend deducts, returns new balance
    ↓
    Extension updates local cache
```

## API Endpoints

### Get Credits

```
GET /api/user/credits
Headers: Authorization: Bearer <token>

Response:
{
  "available": 25,
  "used": 10,
  "purchased": 30,
  "freeCredits": 10
}
```

### Use Credits

```
POST /api/user/credits/use
Headers: Authorization: Bearer <token>
Body:
{
  "amount": 1,
  "feature": "listing_upload",
  "metadata": {
    "listingTitle": "Product Name",
    "listingSku": "SKU-001"
  }
}

Response (success):
{
  "success": true,
  "creditsUsed": 1,
  "creditsRemaining": 24
}

Response (insufficient):
{
  "success": false,
  "error": "insufficient_credits",
  "creditsAvailable": 0,
  "creditsRequired": 1
}
```

### Create Checkout Session

```
POST /api/payments/create-checkout
Headers: Authorization: Bearer <token>
Body:
{
  "creditPack": "pro", // starter, standard, pro, power
  "successUrl": "chrome-extension://xxx/credits.html?success=true",
  "cancelUrl": "chrome-extension://xxx/credits.html?canceled=true"
}

Response:
{
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

## Firebase Schema

### Collection: `extension_credits`

Document ID: User's email (lowercase)

```javascript
{
  email: "user@example.com",
  available: 25,        // Current balance
  used: 10,             // Total ever used
  purchased: 30,        // Total ever purchased
  freeCredits: 10,      // Initial free credits (never changes)
  lastUpdated: Timestamp,
  createdAt: Timestamp
}
```

### Collection: `credit_transactions`

```javascript
{
  email: "user@example.com",
  type: "use",          // "purchase", "use", "refund"
  amount: 1,
  feature: "listing_upload",
  metadata: {
    listingTitle: "Product Name"
  },
  timestamp: Timestamp,
  balanceAfter: 24
}
```

## Stripe Configuration

### Products (Stripe Dashboard)

Create four products:

1. **BulkListingPro - Starter Pack**
   - Price: $1.99
   - Metadata: `credits: 50`

2. **BulkListingPro - Standard Pack**
   - Price: $4.99
   - Metadata: `credits: 150`

3. **BulkListingPro - Pro Pack**
   - Price: $11.99
   - Metadata: `credits: 400`

4. **BulkListingPro - Power Pack**
   - Price: $24.99
   - Metadata: `credits: 1000`

### Webhook Events

Listen for:
- `checkout.session.completed` - Add credits
- `charge.refunded` - Remove credits

## Local Storage Cache

```javascript
// chrome.storage.local
{
  credits: {
    available: 25,
    used: 10,
    purchased: 30,
    lastFetched: 1706900000000 // timestamp
  }
}
```

### Cache Strategy

1. Fetch from server on:
   - Extension startup
   - After successful upload
   - After purchase
   - Every 5 minutes (background refresh)

2. Use cache when:
   - Displaying balance in UI
   - Quick checks (server as source of truth for actual deduction)

## Error Handling

### Insufficient Credits

```javascript
if (error === 'insufficient_credits') {
  // Pause upload queue
  // Show modal: "You need more credits"
  // Link to purchase page
}
```

### Network Errors

```javascript
if (error === 'network_error') {
  // Don't deduct locally
  // Retry 3 times with backoff
  // If still failing, pause and notify user
}
```

### Refunds

If a listing upload fails AFTER credit deduction:
1. Log the failure
2. Automatic refund via API
3. User sees credit restored

## UI Components

### Credit Balance Display

```
┌────────────────────┐
│  💳 50 credits     │
│  [$1.99 for 50]    │
└────────────────────┘
```

### Purchase Modal

```
┌──────────────────────────────────────┐
│         Buy Credits                   │
├──────────────────────────────────────┤
│  ○ Starter    50 credits    $1.99    │
│  ● Standard  150 credits    $4.99    │
│  ○ Pro       400 credits   $11.99    │
│  ○ Power    1000 credits   $24.99    │
├──────────────────────────────────────┤
│         [Buy Now]                     │
└──────────────────────────────────────┘
```

### Low Credits Warning

When credits < 5:
```
⚠️ Low credits! Only 3 remaining.
   [Buy More]
```

## Analytics Events

Track:
- `credits_purchased` - pack type, amount
- `credits_used` - feature, amount
- `credits_insufficient` - attempted feature
- `purchase_started` - pack type
- `purchase_completed` - pack type, amount
- `purchase_abandoned` - pack type

## Future Considerations

1. **Subscription Model**
   - Monthly credits allocation
   - Rollover unused credits

2. **Volume Discounts**
   - Enterprise tier
   - Annual billing

3. **Referral Credits**
   - Earn credits for referrals

4. **Promotional Codes**
   - Discount codes for credit packs
   - Free credit giveaways
