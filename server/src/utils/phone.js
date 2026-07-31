export function normalizeUgandanPhone(val) {
  if (!val) return '';
  // Strip all non-digit characters
  const clean = val.replace(/[^\d]/g, '');
  
  // Ugandan mobile and fixed numbers are 9 digits (usually starting with 7, 3, 20, etc.)
  const match = clean.match(/^(?:256|0)?([1-9]\d{8})$/);
  if (!match) {
    throw new Error('Invalid phone number. Must match Ugandan format (e.g. 07XXXXXXXX or 256XXXXXXXX)');
  }
  return `256${match[1]}`;
}
