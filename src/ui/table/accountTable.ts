import type { RelationshipAccount } from "../../types/account";

export type SortKey =
  | "username"
  | "unfollowPriority"
  | "botProbability"
  | "doNotRemove"
  | "knownAge"
  | "relationshipStrength"
  | "ghostScore"
  | "socialGravity"
  | "reviewPriority";

export interface TableOptions {
  filter: "all" | "nonFollowbacks" | "whitelist" | "blacklist";
  query: string;
  sortKey: SortKey;
  onWhitelist: (username: string) => void;
  onBlacklist: (username: string) => void;
  onAnalyze: (username: string) => void;
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

const scoreBadge = (label: string, value: number, tone: "risk" | "safe" | "neutral"): string =>
  `<span class="igrid-score igrid-score-${tone}" title="${escapeHtml(label)}">${value}</span>`;

const daysSince = (timestamp?: number): number | undefined => {
  if (!timestamp) return undefined;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
};

const formatKnownAge = (timestamp?: number): string => {
  const days = daysSince(timestamp);
  if (days === undefined) return "Unknown";
  if (days === 0) return "New";
  if (days === 1) return "1 day";
  if (days < 60) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months} mo`;
  return `${Math.floor(months / 12)} yr`;
};

const formatAnalyzedAt = (timestamp?: number): string => {
  const days = daysSince(timestamp);
  if (days === undefined) return "Not analyzed";
  if (days === 0) return "Analyzed today";
  if (days === 1) return "Analyzed 1 day ago";
  return `Analyzed ${days} days ago`;
};

const scoreTitle = (account: RelationshipAccount, label: string): string => {
  const reasons = account.scores.reasons.length > 0 ? account.scores.reasons.join(", ") : "no strong signals";
  return `${label}: ${reasons}`;
};

const intelTitle = (label: string, reasons: string[]): string => `${label}: ${reasons.length > 0 ? reasons.join(", ") : "limited signals"}`;

export function filterAndSortRows(accounts: RelationshipAccount[], options: Pick<TableOptions, "filter" | "query" | "sortKey">): RelationshipAccount[] {
  const query = options.query.trim().toLowerCase();
  return accounts
    .filter((account) => {
      if (options.filter === "nonFollowbacks" && !account.isNonFollowback) return false;
      if (options.filter === "whitelist" && !account.tags.includes("whitelist")) return false;
      if (options.filter === "blacklist" && !account.tags.includes("blacklist")) return false;
      if (query && !account.username.includes(query) && !(account.displayName ?? "").toLowerCase().includes(query)) return false;
      return true;
    })
    .sort((a, b) => {
      if (options.sortKey === "username") return a.username.localeCompare(b.username);
      if (options.sortKey === "knownAge") return (b.firstSeenAt ?? 0) - (a.firstSeenAt ?? 0);
      if (options.sortKey === "relationshipStrength") return b.intelligence.relationshipStrength.value - a.intelligence.relationshipStrength.value;
      if (options.sortKey === "ghostScore") return b.intelligence.ghostScore.value - a.intelligence.ghostScore.value;
      if (options.sortKey === "socialGravity") return b.intelligence.socialGravity.value - a.intelligence.socialGravity.value;
      if (options.sortKey === "reviewPriority") return b.intelligence.reviewPriority.value - a.intelligence.reviewPriority.value;
      return b.scores[options.sortKey] - a.scores[options.sortKey];
    });
}

export function renderAccountTable(accounts: RelationshipAccount[], options: TableOptions): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "igrid-table-wrap";

  const rows = filterAndSortRows(accounts, options);
  wrapper.innerHTML = `
    <table class="igrid-table">
      <thead>
        <tr>
          <th>Account</th>
          <th>Relation</th>
          <th>Priority</th>
          <th>Strength</th>
          <th>Ghost</th>
          <th>Gravity</th>
          <th>Bot</th>
          <th>Keep</th>
          <th>Known</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (account) => `
              <tr>
                <td>
                  <div class="igrid-account">
                    ${account.avatarUrl ? `<img src="${escapeHtml(account.avatarUrl)}" alt="" />` : `<span class="igrid-avatar-fallback"></span>`}
                    <div>
                      <strong>@${escapeHtml(account.username)}</strong>
                      <small>${escapeHtml(account.displayName ?? "")}</small>
                    </div>
                  </div>
                </td>
                <td><span class="igrid-pill ${account.isNonFollowback ? "igrid-pill-warn" : "igrid-pill-ok"}">${account.isNonFollowback ? "No followback" : "Mutual"}</span></td>
                <td>${scoreBadge(scoreTitle(account, "Unfollow priority"), account.scores.unfollowPriority, "risk")}</td>
                <td>${scoreBadge(intelTitle("Relationship strength", account.intelligence.relationshipStrength.reasons), account.intelligence.relationshipStrength.value, "safe")}</td>
                <td>${scoreBadge(intelTitle("Ghost score", account.intelligence.ghostScore.reasons), account.intelligence.ghostScore.value, "risk")}</td>
                <td>${scoreBadge(intelTitle("Social gravity", account.intelligence.socialGravity.reasons), account.intelligence.socialGravity.value, "neutral")}</td>
                <td>${scoreBadge(scoreTitle(account, "Bot probability"), account.scores.botProbability, "neutral")}</td>
                <td>${scoreBadge(scoreTitle(account, "Do not remove"), account.scores.doNotRemove, "safe")}</td>
                <td><span class="igrid-pill" title="Known since this tool first saw the account in your local data">${formatKnownAge(account.firstSeenAt)}</span></td>
                <td>
                  <div class="igrid-actions">
                    <button data-action="profile" data-username="${escapeHtml(account.username)}" title="Open profile">Open</button>
                    <button data-action="analyze" data-username="${escapeHtml(account.username)}" title="${formatAnalyzedAt(account.profileAnalyzedAt)}">Analyze</button>
                    <button data-action="whitelist" data-username="${escapeHtml(account.username)}" class="${account.tags.includes("whitelist") ? "is-active" : ""}" title="Toggle whitelist">Keep</button>
                    <button data-action="blacklist" data-username="${escapeHtml(account.username)}" class="${account.tags.includes("blacklist") ? "is-active" : ""}" title="Toggle blacklist">Review</button>
                  </div>
                </td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;

  wrapper.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("button[data-action]");
    if (!button) return;
    const username = button.dataset.username;
    if (!username) return;

    if (button.dataset.action === "profile") {
      window.open(`https://www.instagram.com/${username}/`, "_blank", "noopener,noreferrer");
    }
    if (button.dataset.action === "analyze") options.onAnalyze(username);
    if (button.dataset.action === "whitelist") options.onWhitelist(username);
    if (button.dataset.action === "blacklist") options.onBlacklist(username);
  });

  return wrapper;
}
