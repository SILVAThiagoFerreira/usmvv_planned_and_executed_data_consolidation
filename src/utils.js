export function isBlank(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

export function asText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text.trim();
    if (Object.prototype.hasOwnProperty.call(value, 'result')) return asText(value.result);
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || '').join('').trim();
    if (typeof value.hyperlink === 'string' && typeof value.text === 'string') return value.text.trim();
  }
  return String(value).trim();
}

export function normalizeDisplayId(value) {
  const text = asText(value);
  if (!text) return '';
  if (/^\d+\.0+$/.test(text)) return text.split('.')[0];
  return text;
}

export function normalizeIdValue(value) {
  const text = normalizeDisplayId(value);
  return /^\d+$/.test(text) ? Number(text) : text;
}

export function normalizeHoleKey(rawId, stripPrefixes) {
  let text = normalizeDisplayId(rawId);
  for (const prefix of stripPrefixes) {
    if (text.startsWith(prefix)) {
      text = text.slice(prefix.length);
      break;
    }
  }
  if (/^\d+\.0+$/.test(text)) text = text.split('.')[0];
  return /^\d+$/.test(text) ? String(Number(text)) : text;
}

export function prefixFromId(rawId, stripPrefixes) {
  const text = normalizeDisplayId(rawId);
  for (const prefix of stripPrefixes) {
    if (text.startsWith(prefix)) return prefix;
  }
  return '';
}

export function holeSortKey(value) {
  return /^\d+$/.test(value) ? [0, Number(value)] : [1, value];
}

export function compareHoleKeys(a, b) {
  const [ak, av] = holeSortKey(a);
  const [bk, bv] = holeSortKey(b);
  if (ak !== bk) return ak - bk;
  if (av < bv) return -1;
  if (av > bv) return 1;
  return 0;
}

export function headerIndexMap(headers) {
  const map = new Map();
  const duplicates = [];
  headers.forEach((header, idx) => {
    const text = asText(header);
    if (!text) return;
    if (map.has(text)) duplicates.push(text);
    else map.set(text, idx);
  });
  if (duplicates.length) {
    throw new Error(`Duplicate headers found: ${[...new Set(duplicates)].join(', ')}`);
  }
  return map;
}

export function toNumber(value, context, fieldName) {
  if (isBlank(value)) {
    throw new Error(`${context}: missing required field ${fieldName}`);
  }
  const num = Number(asText(value));
  if (!Number.isFinite(num)) {
    throw new Error(`${context}: invalid numeric value for ${fieldName}: ${asText(value)}`);
  }
  return num;
}

export function optionalNumber(value) {
  if (isBlank(value)) return null;
  const num = Number(asText(value));
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid numeric value: ${asText(value)}`);
  }
  return num;
}

export function firstNonBlank(...values) {
  for (const value of values) {
    if (!isBlank(value)) return value;
  }
  return null;
}

export function formatDecimal3(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : '';
}
