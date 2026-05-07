export const SAFETY_WARNINGS = [
  "This tool only reads visible DOM content and stores data locally.",
  "Open followers/following modals manually before scraping.",
  "No automatic unfollowing or hidden Instagram actions are implemented.",
  "Use the scores as review hints, not as instructions."
];

export const MAX_SAFE_ITERATIONS = 1400;
export const SAFE_SCROLL_STEP_PX = 480;

export function getSafetyStatus(): { ok: boolean; messages: string[] } {
  const onInstagram = /(^|\.)instagram\.com$/.test(window.location.hostname);
  return {
    ok: onInstagram,
    messages: onInstagram
      ? SAFETY_WARNINGS
      : ["Run this from Instagram Web for live scraping. Local demo UI is still available."]
  };
}
