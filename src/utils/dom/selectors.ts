const RESERVED_PATHS = new Set([
  "accounts",
  "direct",
  "explore",
  "p",
  "reels",
  "stories",
  "about",
  "developer",
  "legal",
  "privacy",
  "terms"
]);

export const normalizeUsername = (value: string): string =>
  value.trim().replace(/^@/, "").toLowerCase();

export const isLikelyInstagramUsername = (value: string): boolean => {
  const username = normalizeUsername(value);
  return /^[a-z0-9._]{1,30}$/.test(username) && !RESERVED_PATHS.has(username);
};

export const profileUrlFor = (username: string): string =>
  `https://www.instagram.com/${normalizeUsername(username)}/`;

export const getUsernameFromProfileHref = (href: string): string | undefined => {
  try {
    const url = new URL(href, window.location.origin);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 1) return undefined;
    const username = normalizeUsername(parts[0]);
    return isLikelyInstagramUsername(username) ? username : undefined;
  } catch {
    return undefined;
  }
};
