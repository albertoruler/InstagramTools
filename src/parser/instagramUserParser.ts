import type { RelationshipListKind, ScrapedAccount } from "../types/account";
import { getUsernameFromProfileHref, profileUrlFor } from "../utils/dom/selectors";

const DEFAULT_PROFILE_PHOTO_URL_IDS = [
  "44884218_345707102882519_2446069589734326272_n",
  "464760996_1254146839119862_3605321457742435801_n"
];

const uniqueByUsername = (accounts: ScrapedAccount[]): ScrapedAccount[] => {
  const map = new Map<string, ScrapedAccount>();
  for (const account of accounts) {
    map.set(account.username, account);
  }
  return [...map.values()];
};

const findRowText = (anchor: HTMLAnchorElement): string[] => {
  const row = anchor.closest('div[role="button"], div[style], li, div') ?? anchor.parentElement;
  const raw = row?.textContent ?? anchor.textContent ?? "";
  return raw
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
};

const getDisplayName = (anchor: HTMLAnchorElement, username: string): string | undefined => {
  const textParts = findRowText(anchor);
  return textParts.find((part) => part.toLowerCase() !== username && !/^follow/i.test(part));
};

const getAvatar = (anchor: HTMLAnchorElement): { avatarUrl?: string; hasProfilePhoto?: boolean } => {
  const row = anchor.closest('div[role="button"], div[style], li, div') ?? anchor.parentElement;
  const img = row?.querySelector("img") as HTMLImageElement | null;
  const avatarUrl = img?.src;
  const hasDefaultProfilePhoto = avatarUrl ? DEFAULT_PROFILE_PHOTO_URL_IDS.some((id) => avatarUrl.includes(id)) : false;
  const hasProfilePhoto = avatarUrl ? !hasDefaultProfilePhoto : undefined;
  return { avatarUrl, hasProfilePhoto };
};

export function parseVisibleAccounts(root: ParentNode, source: RelationshipListKind): ScrapedAccount[] {
  const anchors = [...root.querySelectorAll<HTMLAnchorElement>('a[href^="/"], a[href^="https://www.instagram.com/"]')];
  const accounts = anchors.flatMap((anchor): ScrapedAccount[] => {
    const username = getUsernameFromProfileHref(anchor.href);
    if (!username) return [];

    const { avatarUrl, hasProfilePhoto } = getAvatar(anchor);
    const seenAt = Date.now();
    return [
      {
        username,
        displayName: getDisplayName(anchor, username),
        profileUrl: profileUrlFor(username),
        avatarUrl,
        hasProfilePhoto,
        firstSeenAt: seenAt,
        seenAt,
        source
      }
    ];
  });

  return uniqueByUsername(accounts);
}
