import { CATEGORIES } from '../../services/listingUtils.js';
import { findSimilarTags } from './tag-manager.js';

export function validateListing(listing) {
  const errors = [];
  const warnings = [];

  if (!listing.title || !listing.title.trim()) {
    errors.push('Title is required');
  } else if (listing.title.length > 140) {
    errors.push('Title exceeds 140 characters');
  } else if (listing.title.length > 120) {
    warnings.push(`Title is ${listing.title.length}/140 characters`);
  }

  if (!listing.description || !listing.description.trim()) {
    errors.push('Description is required');
  }

  if (!listing.price && listing.price !== 0) {
    errors.push('Price is required');
  } else {
    const price = parseFloat(listing.price);
    if (isNaN(price) || price < 0.20) {
      errors.push('Price must be at least $0.20');
    }
  }

  if (!listing.category || !listing.category.trim()) {
    errors.push('Category is required');
  }

  if (listing.tags && listing.tags.length > 13) {
    errors.push('Maximum 13 tags allowed');
  }

  if (listing.tags) {
    for (const tag of listing.tags) {
      if (tag.length > 20) {
        warnings.push(`Tag "${tag.substring(0, 15)}..." exceeds 20 characters`);
      }
    }
    if (listing.tags.length >= 2) {
      const pairs = findSimilarTags(listing.tags);
      for (const [t1, t2] of pairs) {
        warnings.push(`Tags "${t1}" and "${t2}" are similar (consider keeping one)`);
      }
    }
  }

  for (let i = 1; i <= 5; i++) {
    const meta = listing[`_image_${i}_meta`];
    if (!meta) continue;
    if (meta.fileSize > 10 * 1024 * 1024) {
      warnings.push(`Image ${i}: file size exceeds 10MB`);
    }
    if (meta.width && meta.height && Math.min(meta.width, meta.height) < 1000) {
      warnings.push(`Image ${i}: smallest side is ${Math.min(meta.width, meta.height)}px (recommended 1000+)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function getCharCountClass(count, max, warnThreshold) {
  if (count > max) return 'over';
  if (count >= warnThreshold) return 'warn';
  return '';
}

export function formatPrice(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return num.toFixed(2);
}

export function validateTag(tag) {
  const trimmed = tag.trim();
  if (!trimmed) return { valid: false, tag: trimmed, reason: 'empty' };
  if (trimmed.length > 20) return { valid: false, tag: trimmed, reason: 'too long (max 20 chars)' };
  return { valid: true, tag: trimmed, reason: null };
}

export function autoformatTitle(title) {
  if (!title) return '';
  return title.trim().replace(/\s{2,}/g, ' ');
}

const LOWERCASE_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
  'in', 'on', 'at', 'to', 'of', 'by', 'up', 'as', 'is', 'it',
  'with', 'from', 'into', 'over', 'after', 'under', 'between'
]);

export function titleCaseTitle(title) {
  if (!title) return '';
  const cleaned = autoformatTitle(title);
  return cleaned.split(' ').map((word, i) => {
    if (!word) return word;
    if (i === 0) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    if (LOWERCASE_WORDS.has(word.toLowerCase())) return word.toLowerCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

export function autoformatDescription(desc) {
  if (!desc) return '';
  return desc.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

export function autoformatTags(tags) {
  if (!tags || !Array.isArray(tags)) return [];
  const seen = new Set();
  const result = [];
  for (const tag of tags) {
    const t = tag.toLowerCase().trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    result.push(t);
  }
  return result.slice(0, 13);
}

export function autoformatMaterials(mats) {
  if (!mats || !Array.isArray(mats)) return [];
  const seen = new Set();
  const result = [];
  for (const m of mats) {
    const t = m.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(t);
  }
  return result;
}

export function autoformatPrice(price) {
  if (price === null || price === undefined || price === '') return '';
  const cleaned = String(price).replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return '';
  return num.toFixed(2);
}

export function autoformatListing(listing) {
  const l = { ...listing };
  l.title = autoformatTitle(l.title);
  l.description = autoformatDescription(l.description);
  l.tags = autoformatTags(l.tags);
  l.materials = autoformatMaterials(l.materials);
  const p = autoformatPrice(l.price);
  if (p) l.price = parseFloat(p);
  return l;
}

function jaccardSimilarity(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter(w => w));
  const setB = new Set(b.toLowerCase().split(/\s+/).filter(w => w));
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

export function validateAllListings(listings) {
  const results = listings.map((listing, index) => {
    const { errors, warnings } = validateListing(listing);
    return {
      listingId: listing.id,
      listingTitle: listing.title || `Listing #${index + 1}`,
      index,
      errors: [...errors],
      warnings: [...warnings]
    };
  });

  const titles = listings.map(l => (l.title || '').trim());
  for (let i = 0; i < titles.length; i++) {
    if (!titles[i]) continue;
    for (let j = i + 1; j < titles.length; j++) {
      if (!titles[j]) continue;
      if (titles[i].toLowerCase() === titles[j].toLowerCase()) {
        results[i].errors.push(`Duplicate title with listing #${j + 1}`);
        results[j].errors.push(`Duplicate title with listing #${i + 1}`);
      } else if (jaccardSimilarity(titles[i], titles[j]) > 0.8) {
        results[i].warnings.push(`Very similar title to listing #${j + 1}`);
        results[j].warnings.push(`Very similar title to listing #${i + 1}`);
      }
    }
  }

  for (let i = 0; i < listings.length; i++) {
    const tagsA = (listings[i].tags || []).map(t => t.toLowerCase()).sort();
    if (tagsA.length === 0) continue;
    const keyA = tagsA.join(',');
    for (let j = i + 1; j < listings.length; j++) {
      const tagsB = (listings[j].tags || []).map(t => t.toLowerCase()).sort();
      if (tagsB.length === 0) continue;
      if (keyA === tagsB.join(',')) {
        results[i].warnings.push(`Identical tags as listing #${j + 1}`);
        results[j].warnings.push(`Identical tags as listing #${i + 1}`);
      }
    }
  }

  const prices = listings.map(l => parseFloat(l.price)).filter(p => !isNaN(p) && p > 0);
  if (prices.length >= 3) {
    const sorted = [...prices].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const threshold = median * 0.2;
    listings.forEach((l, i) => {
      const p = parseFloat(l.price);
      if (!isNaN(p) && p > 0 && p < threshold) {
        results[i].warnings.push(`Price $${p.toFixed(2)} is unusually low (median: $${median.toFixed(2)})`);
      }
    });
  }

  listings.forEach((l, i) => {
    if (!l.image_1) {
      results[i].warnings.push('No images attached');
    }
    if ((!l.tags || l.tags.length === 0) && !l.image_1) {
      results[i].warnings.push('Listing is incomplete (no tags and no images)');
    }
  });

  let totalErrors = 0, totalWarnings = 0, errorListings = 0, warningListings = 0, cleanListings = 0;
  results.forEach(r => {
    totalErrors += r.errors.length;
    totalWarnings += r.warnings.length;
    if (r.errors.length > 0) errorListings++;
    else if (r.warnings.length > 0) warningListings++;
    else cleanListings++;
  });

  return {
    results,
    summary: { totalErrors, totalWarnings, errorListings, warningListings, cleanListings }
  };
}
