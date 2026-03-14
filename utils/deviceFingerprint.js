/**
 * Simple device fingerprint for same-device hint (client-side only).
 * Not cryptographically unique – use only for analytics/abuse hints.
 */
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h = ((h << 5) - h) + c;
    h = h & h;
  }
  return (h >>> 0).toString(36);
}

export function getDeviceFingerprint() {
  if (typeof window === 'undefined') return '';
  try {
    const nav = window.navigator;
    const screen = window.screen;
    const parts = [
      nav?.userAgent ?? '',
      nav?.language ?? '',
      (nav?.languages && nav.languages.length) ? nav.languages.join(',') : '',
      typeof Intl !== 'undefined' && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : '',
      screen?.width ?? 0,
      screen?.height ?? 0,
      screen?.colorDepth ?? 0,
      nav?.hardwareConcurrency ?? '',
      nav?.deviceMemory ?? '',
    ].map(String);
    return simpleHash(parts.join('|')) || '0';
  } catch {
    return '0';
  }
}
