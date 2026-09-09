/**
 * Utility functions for formatting and sanitization
 */

// Comprehensive regex matching all Unicode emojis, pictographs, symbols, and variation selectors
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{200D}\u{FE0F}\u{FE0E}]/gu;

/**
 * Strips all emojis and pictographs from a string.
 * Used to guarantee zero emojis appear in the UI (even from DB usernames or notes).
 */
export function stripEmojis(str?: string | null): string {
  if (!str) return "";
  return str.replace(EMOJI_REGEX, "").replace(/\s+/g, " ").trim();
}

/**
 * Formats Rupiah currency cleanly
 */
export function formatRp(amount: number): string {
  return `Rp ${(amount || 0).toLocaleString("id-ID")}`;
}
