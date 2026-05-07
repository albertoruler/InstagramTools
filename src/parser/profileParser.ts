import type { ProfileAnalysisResult } from "../types/account";
import { getUsernameFromProfileHref, isLikelyInstagramUsername, normalizeUsername, profileUrlFor } from "../utils/dom/selectors";

const DEFAULT_PROFILE_PHOTO_URL_IDS = [
  "44884218_345707102882519_2446069589734326272_n",
  "464760996_1254146839119862_3605321457742435801_n"
];

const parseCompactNumber = (raw: string): number | undefined => {
  const compact = raw
    .trim()
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/[^\d.kmb]/g, "");

  if (!compact) return undefined;

  const multiplier = compact.endsWith("k") ? 1_000 : compact.endsWith("m") ? 1_000_000 : compact.endsWith("b") ? 1_000_000_000 : 1;
  const withoutSuffix = compact.replace(/[kmb]/g, "");
  const separatorMatches = withoutSuffix.match(/[.,]/g) ?? [];
  const isThousandsFormatted =
    multiplier === 1 &&
    separatorMatches.length > 0 &&
    /^[\d]{1,3}([.,]\d{3})+$/.test(withoutSuffix);
  const numericText = isThousandsFormatted ? withoutSuffix.replace(/[.,]/g, "") : withoutSuffix.replace(/,/g, ".");
  const numeric = Number(numericText);
  if (!Number.isFinite(numeric)) return undefined;
  return Math.round(numeric * multiplier);
};

const parseLabeledCount = (text: string, labels: string[]): number | undefined => {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const beforeLabel = new RegExp(`([\\d.,]+\\s?[kKmMbB]?)\\s+${escaped}`, "i").exec(text);
    if (beforeLabel?.[1]) return parseCompactNumber(beforeLabel[1]);

    const afterLabel = new RegExp(`${escaped}\\s+([\\d.,]+\\s?[kKmMbB]?)`, "i").exec(text);
    if (afterLabel?.[1]) return parseCompactNumber(afterLabel[1]);
  }

  return undefined;
};

const getCurrentProfileUsername = (): string | undefined => {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length !== 1) return undefined;
  const username = normalizeUsername(parts[0]);
  return isLikelyInstagramUsername(username) ? username : undefined;
};

const getProfileAvatar = (username: string): { avatarUrl?: string; hasProfilePhoto?: boolean } => {
  const imageCandidates = [...document.querySelectorAll<HTMLImageElement>("header img, main img")];
  const image =
    imageCandidates.find((img) => img.alt.toLowerCase().includes(username)) ??
    imageCandidates.find((img) => img.width >= 80 || img.naturalWidth >= 80);

  const avatarUrl = image?.src;
  const hasDefaultProfilePhoto = avatarUrl ? DEFAULT_PROFILE_PHOTO_URL_IDS.some((id) => avatarUrl.includes(id)) : false;
  return {
    avatarUrl,
    hasProfilePhoto: avatarUrl ? !hasDefaultProfilePhoto : undefined
  };
};

const getExternalUrl = (): string | undefined => {
  const link = [...document.querySelectorAll<HTMLAnchorElement>('main a[href^="http"]')].find((anchor) => {
    const profileUsername = getUsernameFromProfileHref(anchor.href);
    return !profileUsername && !anchor.href.includes("instagram.com/accounts/");
  });
  return link?.href;
};

const getDisplayName = (username: string): string | undefined => {
  const headerText = document.querySelector("header")?.textContent ?? "";
  const lines = headerText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.find((line) => line.toLowerCase() !== username && !/\d/.test(line) && line.length <= 80);
};

const getBiography = (): string | undefined => {
  const headerText = document.querySelector("header")?.textContent ?? "";
  const lines = headerText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/followers|following|seguidores|seguidos|publicaciones|posts/i.test(line));

  return lines.slice(1, 5).join(" ").slice(0, 280) || undefined;
};

export function parseCurrentProfile(): ProfileAnalysisResult | undefined {
  const username = getCurrentProfileUsername();
  if (!username) return undefined;

  const text = document.body.innerText;
  const { avatarUrl, hasProfilePhoto } = getProfileAvatar(username);

  return {
    username,
    displayName: getDisplayName(username),
    avatarUrl,
    hasProfilePhoto,
    biography: getBiography(),
    externalUrl: getExternalUrl(),
    isPrivate: /this account is private|esta cuenta es privada/i.test(text),
    isVerified: Boolean(document.querySelector('svg[aria-label="Verified"], svg[aria-label="Verificado"]')),
    followersCount: parseLabeledCount(text, ["followers", "seguidores"]),
    followingCount: parseLabeledCount(text, ["following", "seguidos", "seguidas"]),
    postCount: parseLabeledCount(text, ["posts", "post", "publicaciones"]),
    analyzedAt: Date.now()
  };
}

export function profileResultToAccountPatch(result: ProfileAnalysisResult) {
  return {
    username: result.username,
    displayName: result.displayName,
    profileUrl: profileUrlFor(result.username),
    avatarUrl: result.avatarUrl,
    hasProfilePhoto: result.hasProfilePhoto,
    biography: result.biography,
    externalUrl: result.externalUrl,
    isPrivate: result.isPrivate,
    isVerified: result.isVerified,
    followersCount: result.followersCount,
    followingCount: result.followingCount,
    postCount: result.postCount,
    profileAnalyzedAt: result.analyzedAt,
    seenAt: result.analyzedAt
  };
}
