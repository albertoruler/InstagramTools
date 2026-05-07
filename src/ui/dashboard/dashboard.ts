import type { AccountListState, DashboardState, RelationshipListKind } from "../../types/account";
import { LocalStore } from "../../storage/local/localStore";
import { analyzeRelationships } from "../../analysis/relationshipAnalyzer";
import { buildReviewQueue } from "../../analysis/reviewQueueEngine";
import { compareSnapshots } from "../../analysis/snapshotEngine";
import { parseAccountImport } from "../../parser/accountImportParser";
import { parseCurrentProfile, profileResultToAccountPatch } from "../../parser/profileParser";
import { InternalGraphFollowingScraper } from "../../scraper/internalGraphScraper";
import { InstagramScraper } from "../../scraper/instagramScraper";
import { getSafetyStatus } from "../../safety/safety";
import { throttle } from "../../utils/throttling/throttle";
import { renderAccountTable, type SortKey } from "../table/accountTable";
import { dashboardStyles } from "./styles";

export class Dashboard {
  private root?: HTMLElement;
  private launcher?: HTMLButtonElement;
  private state: DashboardState;
  private filter: "all" | "nonFollowbacks" | "whitelist" | "blacklist" = "nonFollowbacks";
  private query = "";
  private sortKey: SortKey = "unfollowPriority";
  private helpOpen = false;
  private notice?: string;
  private position?: { left: number; top: number };
  private dragState?: { pointerId: number; offsetX: number; offsetY: number };
  readonly scraper: InstagramScraper;
  readonly internalScraper: InternalGraphFollowingScraper;

  constructor(private readonly store: LocalStore) {
    this.state = this.buildState();
    this.scraper = new InstagramScraper(store, {
      onProgress: (progress) => {
        this.state = this.buildState(progress);
        this.render();
      },
      onAccounts: () => {
        this.state = this.buildState(this.scraper.getProgress());
        this.renderThrottled();
      }
    });
    this.internalScraper = new InternalGraphFollowingScraper(store, {
      onProgress: (progress) => {
        this.state = this.buildState(progress);
        this.render();
      },
      onAccounts: () => {
        this.state = this.buildState(this.internalScraper.getProgress());
        this.renderThrottled();
      }
    });
  }

  show(): void {
    this.ensureStyles();
    this.launcher?.remove();
    this.launcher = undefined;

    if (!this.root) {
      this.root = document.createElement("section");
      this.root.className = "igrid-panel";
      document.body.append(this.root);
    }

    this.applyPosition();
    this.state = this.buildState(this.scraper.getProgress());
    this.render();
  }

  hide(): void {
    this.root?.remove();
    this.root = undefined;
    this.showLauncher();
  }

  async scrape(kind: RelationshipListKind): Promise<void> {
    await this.scraper.scrape(kind, { expectedTotal: this.state.expectedTotals[kind] });
    this.state = this.buildState(this.scraper.getProgress());
    this.render();
  }

  stop(): void {
    this.scraper.stop();
    this.internalScraper.stop();
  }

  exportData(): string {
    return this.store.export();
  }

  clearData(): void {
    this.store.clear();
    this.state = this.buildState();
    this.render();
  }

  private ensureStyles(): void {
    if (!document.getElementById("igrid-styles")) {
      const style = document.createElement("style");
      style.id = "igrid-styles";
      style.textContent = dashboardStyles;
      document.head.append(style);
    }
  }

  private showLauncher(): void {
    this.ensureStyles();
    this.launcher?.remove();
    this.launcher = document.createElement("button");
    this.launcher.className = "igrid-launcher";
    this.launcher.type = "button";
    this.launcher.title = "Show Relationship Intelligence Dashboard";
    this.launcher.textContent = "IG";
    this.launcher.addEventListener("click", () => this.show());
    document.body.append(this.launcher);
  }

  private readonly renderThrottled = throttle(() => this.render(), 250);

  private buildState(progress = this.scraper?.getProgress()): DashboardState {
    const stored = this.store.load();
    const relationships = analyzeRelationships(stored.following, stored.followers, stored.preferences);
    const reviewQueue = buildReviewQueue(relationships);
    return this.store.toDashboardState(relationships, reviewQueue, compareSnapshots(stored.snapshots), progress);
  }

  private render(): void {
    if (!this.root) return;

    const nonFollowbacks = this.state.relationships.filter((account) => account.isNonFollowback).length;
    const safety = getSafetyStatus();
    const followersVerification = this.renderVerificationStat("followers", this.state.followers);
    const followingVerification = this.renderVerificationStat("following", this.state.following);
    const directSignalCoverage = this.getDirectFollowSignalCoverage();
    const comparisonReady = this.isComparisonReady(directSignalCoverage);
    const comparisonMessage = this.getComparisonMessage(comparisonReady, directSignalCoverage);
    const snapshotStats = this.renderSnapshotStats();
    const nextReview = this.renderNextReview();

    this.root.innerHTML = `
      <header class="igrid-header">
        <div class="igrid-title">
          <strong>Relationship Intelligence</strong>
          <small>Local-first Instagram following quality review</small>
        </div>
        <div class="igrid-toolbar">
          <button data-action="scrape-followers">Scrape followers</button>
          <button data-action="scrape-following">Scrape following</button>
          <button data-action="internal-following">Internal read-only scan</button>
          <button data-action="import-followers">Import followers</button>
          <button data-action="import-following">Import following</button>
          <button data-action="analyze-current">Analyze current profile</button>
          <button data-action="snapshot">Save snapshot</button>
          <button data-action="stop">Stop</button>
          <button data-action="help">${this.helpOpen ? "Close help" : "Help"}</button>
          <button data-action="hide">Hide</button>
        </div>
      </header>
      <input data-file="import-followers" type="file" accept=".csv,.txt,.json" hidden />
      <input data-file="import-following" type="file" accept=".csv,.txt,.json" hidden />
      ${this.helpOpen ? this.renderHelp() : ""}
      ${safety.ok ? "" : `<div class="igrid-warning">${safety.messages[0]}</div>`}
      <div class="igrid-status">
        <div class="igrid-stats">
          ${followersVerification}
          ${followingVerification}
          <span class="igrid-stat">Non-followbacks ${nonFollowbacks}</span>
        </div>
        <div class="igrid-verification">
          <span>${this.notice ?? this.state.progress?.message ?? "Open a list modal manually, then start a scraper."}</span>
          <span><strong>${comparisonReady ? "Comparison ready" : "Comparison not fully verified"}</strong>${comparisonMessage}</span>
        </div>
      </div>
      ${nextReview}
      ${snapshotStats}
      <div class="igrid-controls">
        <input data-control="query" value="${this.query}" placeholder="Filter accounts" />
        <input data-control="expected-followers" type="number" min="0" step="1" value="${this.state.expectedTotals.followers ?? ""}" placeholder="Expected followers" title="Optional: helps the safe DOM scraper avoid stopping before this count" />
        <input data-control="expected-following" type="number" min="0" step="1" value="${this.state.expectedTotals.following ?? ""}" placeholder="Expected following" title="Optional: helps the safe DOM scraper avoid stopping before this count" />
        <select data-control="filter">
          <option value="all" ${this.filter === "all" ? "selected" : ""}>All following</option>
          <option value="nonFollowbacks" ${this.filter === "nonFollowbacks" ? "selected" : ""}>Non-followbacks</option>
          <option value="whitelist" ${this.filter === "whitelist" ? "selected" : ""}>Whitelist</option>
          <option value="blacklist" ${this.filter === "blacklist" ? "selected" : ""}>Review list</option>
        </select>
        <select data-control="sort">
          <option value="unfollowPriority" ${this.sortKey === "unfollowPriority" ? "selected" : ""}>Priority</option>
          <option value="reviewPriority" ${this.sortKey === "reviewPriority" ? "selected" : ""}>Review queue</option>
          <option value="relationshipStrength" ${this.sortKey === "relationshipStrength" ? "selected" : ""}>Relationship strength</option>
          <option value="ghostScore" ${this.sortKey === "ghostScore" ? "selected" : ""}>Ghost score</option>
          <option value="socialGravity" ${this.sortKey === "socialGravity" ? "selected" : ""}>Social gravity</option>
          <option value="botProbability" ${this.sortKey === "botProbability" ? "selected" : ""}>Bot probability</option>
          <option value="doNotRemove" ${this.sortKey === "doNotRemove" ? "selected" : ""}>Keep score</option>
          <option value="knownAge" ${this.sortKey === "knownAge" ? "selected" : ""}>Recently seen</option>
          <option value="username" ${this.sortKey === "username" ? "selected" : ""}>Username</option>
        </select>
        <button data-action="export">Export JSON</button>
        <button data-action="clear">Clear local data</button>
      </div>
      <div class="igrid-body"></div>
      <footer class="igrid-footer">Manual review only. Scores are hints; profile actions stay in your hands.</footer>
    `;

    const body = this.root.querySelector<HTMLElement>(".igrid-body");
    body?.append(
      renderAccountTable(this.state.relationships, {
        filter: this.filter,
        query: this.query,
        sortKey: this.sortKey,
        onWhitelist: (username) => this.togglePreference("whitelist", username),
        onBlacklist: (username) => this.togglePreference("blacklist", username),
        onAnalyze: (username) => this.analyzeCurrentProfile(username)
      })
    );

    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.root) return;

    this.bindDrag();

    this.root.querySelector<HTMLInputElement>('[data-control="query"]')?.addEventListener("input", (event) => {
      this.query = (event.target as HTMLInputElement).value;
      this.render();
    });

    this.root.querySelector<HTMLInputElement>('[data-control="expected-followers"]')?.addEventListener("change", (event) => {
      this.setExpectedTotal("followers", (event.target as HTMLInputElement).value);
      this.render();
    });

    this.root.querySelector<HTMLInputElement>('[data-control="expected-following"]')?.addEventListener("change", (event) => {
      this.setExpectedTotal("following", (event.target as HTMLInputElement).value);
      this.render();
    });

    this.root.querySelector<HTMLSelectElement>('[data-control="filter"]')?.addEventListener("change", (event) => {
      this.filter = (event.target as HTMLSelectElement).value as typeof this.filter;
      this.render();
    });

    this.root.querySelector<HTMLSelectElement>('[data-control="sort"]')?.addEventListener("change", (event) => {
      this.sortKey = (event.target as HTMLSelectElement).value as SortKey;
      this.render();
    });

    this.root.querySelectorAll<HTMLButtonElement>("button[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        if (action === "scrape-following") void this.scrape("following");
        if (action === "scrape-followers") void this.scrape("followers");
        if (action === "internal-following") void this.scrapeInternalFollowing();
        if (action === "import-followers") this.root?.querySelector<HTMLInputElement>('[data-file="import-followers"]')?.click();
        if (action === "import-following") this.root?.querySelector<HTMLInputElement>('[data-file="import-following"]')?.click();
        if (action === "analyze-current") this.analyzeCurrentProfile();
        if (action === "snapshot") this.saveSnapshot();
        if (action === "stop") this.stop();
        if (action === "help") {
          this.helpOpen = !this.helpOpen;
          this.render();
        }
        if (action === "hide") this.hide();
        if (action === "export") this.downloadExport();
        if (action === "clear" && window.confirm("Clear locally stored Instagram relationship data?")) this.clearData();
      });
    });

    this.root.querySelector<HTMLInputElement>('[data-file="import-followers"]')?.addEventListener("change", (event) => {
      void this.importAccountsFromFile("followers", event.target as HTMLInputElement);
    });

    this.root.querySelector<HTMLInputElement>('[data-file="import-following"]')?.addEventListener("change", (event) => {
      void this.importAccountsFromFile("following", event.target as HTMLInputElement);
    });
  }

  private togglePreference(list: "whitelist" | "blacklist", username: string): void {
    const current = this.store.load().preferences[list][username.toLowerCase()];
    this.store.setPreference(list, username, !current);
    this.state = this.buildState(this.scraper.getProgress());
    this.render();
  }

  private async scrapeInternalFollowing(): Promise<void> {
    const confirmed = window.confirm(
      "This read-only mode uses Instagram's internal web endpoint with your logged-in browser session. It does not unfollow or post anything. Continue?"
    );
    if (!confirmed) return;

    await this.internalScraper.scrapeFollowing();
    this.state = this.buildState(this.internalScraper.getProgress());
    this.render();
  }

  private saveSnapshot(): void {
    const nonFollowbackCount = this.state.relationships.filter((account) => account.isNonFollowback).length;
    const snapshot = this.store.createSnapshot(nonFollowbackCount);
    this.notice = `Snapshot saved: ${snapshot.followingCount} following, ${snapshot.followersCount} followers, ${snapshot.nonFollowbackCount} non-followbacks.`;
    this.state = this.buildState(this.scraper.getProgress());
    this.render();
  }

  private analyzeCurrentProfile(expectedUsername?: string): void {
    const result = parseCurrentProfile();
    if (!result) {
      this.notice = "Open an Instagram profile page manually, then run Analyze current profile.";
      this.render();
      return;
    }

    if (expectedUsername && result.username !== expectedUsername.toLowerCase()) {
      this.notice = `Current profile is @${result.username}. Open @${expectedUsername} in this tab before analyzing that row.`;
      this.render();
      return;
    }

    this.store.mergeProfileAnalysis(profileResultToAccountPatch(result));
    this.notice = `Analyzed @${result.username}: ${result.followersCount ?? "?"} followers, ${result.followingCount ?? "?"} following, ${result.postCount ?? "?"} posts.`;
    this.state = this.buildState(this.scraper.getProgress());
    this.render();
  }

  private async importAccountsFromFile(kind: RelationshipListKind, input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const accounts = parseAccountImport(text, kind);
      if (accounts.length === 0) {
        this.notice = `No valid Instagram usernames found in ${file.name}.`;
        this.render();
        return;
      }

      this.store.mergeAccounts(kind, accounts);
      this.notice = `Imported ${accounts.length} ${kind} accounts from ${file.name}.`;
      this.state = this.buildState(this.scraper.getProgress());
      this.render();
    } catch {
      this.notice = `Could not import ${file.name}. Try CSV or one username per line.`;
      this.render();
    }
  }

  private setExpectedTotal(kind: RelationshipListKind, rawValue: string): void {
    const value = Number(rawValue);
    if (!rawValue || !Number.isFinite(value) || value <= 0) {
      this.store.setExpectedTotal(kind, undefined);
      this.state = this.buildState(this.scraper.getProgress());
      return;
    }

    this.store.setExpectedTotal(kind, Math.floor(value));
    this.state = this.buildState(this.scraper.getProgress());
  }

  private renderVerificationStat(kind: RelationshipListKind, list: AccountListState): string {
    const count = Object.keys(list.accounts).length;
    const expected = this.state.expectedTotals[kind];
    if (!expected) {
      return `<span class="igrid-stat">${this.labelForKind(kind)} ${count}</span>`;
    }

    const percentage = Math.min(100, Math.round((count / expected) * 100));
    const verified = count >= expected;
    return `<span class="igrid-stat ${verified ? "igrid-stat-ok" : "igrid-stat-warn"}">${this.labelForKind(kind)} ${count}/${expected} (${percentage}%)</span>`;
  }

  private isListVerified(kind: RelationshipListKind, list: AccountListState): boolean {
    const expected = this.state.expectedTotals[kind];
    if (!expected) return Object.keys(list.accounts).length > 0;
    return Object.keys(list.accounts).length >= expected;
  }

  private isComparisonReady(directSignalCoverage: number): boolean {
    const listComparisonReady = this.isListVerified("followers", this.state.followers) && this.isListVerified("following", this.state.following);
    return listComparisonReady || directSignalCoverage >= 0.98;
  }

  private getDirectFollowSignalCoverage(): number {
    const followingAccounts = Object.values(this.state.following.accounts);
    if (followingAccounts.length === 0) return 0;
    const withDirectSignal = followingAccounts.filter((account) => account.followsMe !== undefined).length;
    return withDirectSignal / followingAccounts.length;
  }

  private getComparisonMessage(comparisonReady: boolean, directSignalCoverage: number): string {
    if (directSignalCoverage >= 0.98) {
      return `: using direct follows-me signals from internal read-only scan (${Math.round(directSignalCoverage * 100)}% coverage).`;
    }

    if (comparisonReady) {
      return ": both lists reached their expected totals.";
    }

    if (directSignalCoverage > 0) {
      return `: direct follows-me coverage is ${Math.round(directSignalCoverage * 100)}%; run internal scan again or complete both lists.`;
    }

    return ": non-followbacks may be wrong until both lists are complete.";
  }

  private labelForKind(kind: RelationshipListKind): string {
    return kind === "followers" ? "Followers" : "Following";
  }

  private renderNextReview(): string {
    const next = this.state.reviewQueue.next;
    if (!next) {
      return `<div class="igrid-intel">Review queue is clear. No high-priority candidate right now.</div>`;
    }

    return `
      <div class="igrid-intel">
        <strong>Next review: @${next.username}</strong>
        <span>Priority ${next.priority} · confidence ${next.confidence} · action ${next.suggestedAction.replace("_", " ")}</span>
        <small>${next.reasons.slice(0, 3).join(", ")}</small>
      </div>
    `;
  }

  private renderSnapshotStats(): string {
    const comparison = this.state.snapshotComparison;
    if (!comparison?.currentSnapshot) {
      return `<div class="igrid-snapshot">No snapshots yet. Save one after a good scan to start historical tracking.</div>`;
    }

    if (!comparison.previousSnapshot) {
      return `<div class="igrid-snapshot">Latest snapshot saved. Save another later to compare changes over time.</div>`;
    }

    return `
      <div class="igrid-snapshot">
        <span>New following ${comparison.newFollowing.length}</span>
        <span>Removed following ${comparison.removedFollowing.length}</span>
        <span>New followers ${comparison.newFollowers.length}</span>
        <span>Lost followers ${comparison.lostFollowers.length}</span>
        <span>Non-followback delta ${comparison.nonFollowbackDelta >= 0 ? "+" : ""}${comparison.nonFollowbackDelta}</span>
      </div>
    `;
  }

  private downloadExport(): void {
    const blob = new Blob([this.exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `igrid-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private renderHelp(): string {
    return `
      <section class="igrid-help">
        <div class="igrid-help-grid">
          <div>
            <h3>Basic flow</h3>
            <ol>
              <li>Open your Instagram followers modal manually.</li>
              <li>Optionally enter the follower count Instagram shows.</li>
              <li>Run Scrape followers and keep the modal open.</li>
              <li>Open your following modal manually.</li>
              <li>Optionally enter the following count, then scan it.</li>
            </ol>
          </div>
          <div>
            <h3>Import</h3>
            <p>You can import CSV or text files without being logged into Instagram. Use a username column or one @ per line.</p>
          </div>
          <div>
            <h3>Internal scan</h3>
            <p>Internal read-only scan reads your following list through Instagram Web and uses follows-me signals. It is optional and never performs account actions.</p>
          </div>
          <div>
            <h3>Controls</h3>
            <p>Stop pauses the current scraper. Hide collapses the panel into the small IG button. Drag the header to move this window while you work in Instagram.</p>
          </div>
          <div>
            <h3>Profile analysis</h3>
            <p>Open a profile manually, then run Analyze current profile. It reads visible profile counts and updates local scores without unfollowing or background actions.</p>
          </div>
          <div>
            <h3>Scores</h3>
            <p>Priority highlights accounts worth reviewing. Bot is a rough suspicion signal. Keep protects mutuals, whitelisted accounts, and accounts known locally for longer.</p>
          </div>
          <div>
            <h3>Known age</h3>
            <p>Instagram does not expose the exact follow date here. Known age means the first time this local tool saw that account in your data.</p>
          </div>
        </div>
      </section>
    `;
  }

  private bindDrag(): void {
    const header = this.root?.querySelector<HTMLElement>(".igrid-header");
    if (!header || !this.root) return;

    header.addEventListener("pointerdown", (event) => {
      const target = event.target as HTMLElement;
      if (target.closest("button, input, select, a")) return;
      const rect = this.root?.getBoundingClientRect();
      if (!rect || !this.root) return;

      this.dragState = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };
      header.setPointerCapture(event.pointerId);
      this.root.classList.add("is-dragging");
      event.preventDefault();
    });

    header.addEventListener("pointermove", (event) => {
      if (!this.dragState || this.dragState.pointerId !== event.pointerId) return;
      const width = this.root?.offsetWidth ?? 0;
      const height = this.root?.offsetHeight ?? 0;
      const left = Math.max(8, Math.min(window.innerWidth - width - 8, event.clientX - this.dragState.offsetX));
      const top = Math.max(8, Math.min(window.innerHeight - height - 8, event.clientY - this.dragState.offsetY));
      this.position = { left, top };
      this.applyPosition();
    });

    const stopDrag = (event: PointerEvent) => {
      if (!this.dragState || this.dragState.pointerId !== event.pointerId) return;
      this.dragState = undefined;
      this.root?.classList.remove("is-dragging");
      if (header.hasPointerCapture(event.pointerId)) {
        header.releasePointerCapture(event.pointerId);
      }
    };

    header.addEventListener("pointerup", stopDrag);
    header.addEventListener("pointercancel", stopDrag);
  }

  private applyPosition(): void {
    if (!this.root) return;

    if (!this.position) {
      this.root.style.left = "";
      this.root.style.top = "";
      this.root.style.right = "18px";
      this.root.style.bottom = "18px";
      return;
    }

    this.root.style.left = `${this.position.left}px`;
    this.root.style.top = `${this.position.top}px`;
    this.root.style.right = "auto";
    this.root.style.bottom = "auto";
  }
}
