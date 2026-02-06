import { CATEGORIES } from '../../services/listingUtils.js';

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
