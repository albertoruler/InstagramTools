import type { RelationshipListKind, ScrapedAccount } from "../types/account";
import { isLikelyInstagramUsername, normalizeUsername, profileUrlFor } from "../utils/dom/selectors";

const USERNAME_HEADERS = ["username", "user_name", "handle", "profile", "profile_url", "url", "account"];
const DISPLAY_NAME_HEADERS = ["display_name", "full_name", "name", "nombre"];

const splitCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
};

const extractUsername = (raw: string): string | undefined => {
  const trimmed = raw.trim();
  const instagramUrlMatch = /instagram\.com\/([a-z0-9._]+)/i.exec(trimmed);
  const username = normalizeUsername(instagramUrlMatch?.[1] ?? trimmed);
  return isLikelyInstagramUsername(username) ? username : undefined;
};

const findHeaderIndex = (headers: string[], candidates: string[]): number =>
  headers.findIndex((header) => candidates.includes(header.trim().toLowerCase()));

export function parseAccountImport(text: string, source: RelationshipListKind): ScrapedAccount[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstLine = splitCsvLine(lines[0]);
  const normalizedHeaders = firstLine.map((value) => value.trim().toLowerCase());
  const usernameHeaderIndex = findHeaderIndex(normalizedHeaders, USERNAME_HEADERS);
  const displayNameHeaderIndex = findHeaderIndex(normalizedHeaders, DISPLAY_NAME_HEADERS);
  const hasHeader = usernameHeaderIndex >= 0;
  const rows = hasHeader ? lines.slice(1).map(splitCsvLine) : lines.map(splitCsvLine);
  const seenAt = Date.now();
  const accounts = new Map<string, ScrapedAccount>();

  for (const row of rows) {
    const usernameValue = hasHeader ? row[usernameHeaderIndex] : row[0];
    const username = usernameValue ? extractUsername(usernameValue) : undefined;
    if (!username) continue;

    const displayName = displayNameHeaderIndex >= 0 ? row[displayNameHeaderIndex] : undefined;
    accounts.set(username, {
      username,
      displayName,
      profileUrl: profileUrlFor(username),
      firstSeenAt: seenAt,
      seenAt,
      source
    });
  }

  return [...accounts.values()];
}
