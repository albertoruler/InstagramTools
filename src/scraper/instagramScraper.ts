import type { RelationshipListKind, ScrapeProgress, ScrapedAccount } from "../types/account";
import { LocalStore } from "../storage/local/localStore";
import { parseVisibleAccounts } from "../parser/instagramUserParser";
import { detectInstagramListModal } from "./modalDetector";
import { MAX_SAFE_ITERATIONS, SAFE_SCROLL_STEP_PX } from "../safety/safety";
import { delay, randomBetween, safeRandomDelay } from "../utils/timing/delay";

export interface ScraperEvents {
  onProgress?: (progress: ScrapeProgress) => void;
  onAccounts?: (kind: RelationshipListKind, accounts: ScrapedAccount[]) => void;
}

export interface ScrapeOptions {
  expectedTotal?: number;
}

export class InstagramScraper {
  private shouldStop = false;
  private progress?: ScrapeProgress;

  constructor(
    private readonly store: LocalStore,
    private readonly events: ScraperEvents = {}
  ) {}

  stop(): void {
    this.shouldStop = true;
    if (this.progress) {
      this.updateProgress({ ...this.progress, status: "paused", message: "Scraping paused by user." });
    }
  }

  getProgress(): ScrapeProgress | undefined {
    return this.progress;
  }

  async scrape(kind: RelationshipListKind, options: ScrapeOptions = {}): Promise<void> {
    this.shouldStop = false;
    const modal = detectInstagramListModal();

    if (!modal) {
      this.updateProgress({
        kind,
        uniqueCount: Object.keys(this.store.load()[kind].accounts).length,
        iterations: 0,
        expectedTotal: options.expectedTotal,
        startedAt: Date.now(),
        updatedAt: Date.now(),
        status: "error",
        message: "Open the Instagram followers/following modal manually, then start scraping."
      });
      return;
    }

    const startedAt = Date.now();
    let unchangedIterations = 0;
    let previousCount = Object.keys(this.store.load()[kind].accounts).length;
    let lastScrollTop = modal.scrollContainer.scrollTop;
    let lastScrollHeight = modal.scrollContainer.scrollHeight;

    for (let iteration = 1; iteration <= MAX_SAFE_ITERATIONS; iteration += 1) {
      if (this.shouldStop) break;

      const visibleAccounts = parseVisibleAccounts(modal.dialog, kind);
      const list = this.store.mergeAccounts(kind, visibleAccounts, modal.scrollContainer.scrollTop);
      const uniqueCount = Object.keys(list.accounts).length;
      this.events.onAccounts?.(kind, Object.values(list.accounts));

      unchangedIterations = uniqueCount === previousCount ? unchangedIterations + 1 : 0;
      previousCount = uniqueCount;
      const isBelowExpectedTotal = options.expectedTotal !== undefined && uniqueCount < options.expectedTotal;

      this.updateProgress({
        kind,
        uniqueCount,
        iterations: iteration,
        idleCycles: unchangedIterations,
        expectedTotal: options.expectedTotal,
        startedAt,
        updatedAt: Date.now(),
        status: "running",
        message: this.buildRunningMessage(kind, uniqueCount, unchangedIterations, options.expectedTotal)
      });

      if (options.expectedTotal !== undefined && uniqueCount >= options.expectedTotal) {
        this.updateProgress({
          kind,
          uniqueCount,
          iterations: iteration,
          idleCycles: unchangedIterations,
          expectedTotal: options.expectedTotal,
          startedAt,
          updatedAt: Date.now(),
          status: "complete",
          message: `Verified ${kind}: read ${uniqueCount} of ${options.expectedTotal}.`
        });
        return;
      }

      if (unchangedIterations >= 42 && !isBelowExpectedTotal) {
        this.updateProgress({
          kind,
          uniqueCount,
          iterations: iteration,
          idleCycles: unchangedIterations,
          expectedTotal: options.expectedTotal,
          startedAt,
          updatedAt: Date.now(),
          status: "complete",
          message: "No new visible accounts found after an extended safe scan."
        });
        return;
      }

      await this.advanceList(modal.scrollContainer, unchangedIterations);

      const scrollChanged =
        modal.scrollContainer.scrollTop !== lastScrollTop || modal.scrollContainer.scrollHeight !== lastScrollHeight;
      lastScrollTop = modal.scrollContainer.scrollTop;
      lastScrollHeight = modal.scrollContainer.scrollHeight;

      if (!scrollChanged && unchangedIterations > 0) {
        await delay(randomBetween(1200, 2600));
      }
    }

    const list = this.store.load()[kind];
    const finalCount = Object.keys(list.accounts).length;
    this.updateProgress({
      kind,
      uniqueCount: finalCount,
      iterations: this.progress?.iterations ?? 0,
      idleCycles: this.progress?.idleCycles,
      expectedTotal: options.expectedTotal,
      startedAt,
      updatedAt: Date.now(),
      status: this.getFinalStatus(finalCount, options.expectedTotal),
      message: this.getFinalMessage(kind, finalCount, options.expectedTotal)
    });
  }

  private updateProgress(progress: ScrapeProgress): void {
    this.progress = progress;
    this.events.onProgress?.(progress);
  }

  private async advanceList(scrollContainer: HTMLElement, unchangedIterations: number): Promise<void> {
    const beforeTop = scrollContainer.scrollTop;
    const beforeHeight = scrollContainer.scrollHeight;

    if (unchangedIterations > 0 && unchangedIterations % 7 === 0) {
      scrollContainer.scrollBy({ top: -Math.round(SAFE_SCROLL_STEP_PX * 0.55), behavior: "smooth" });
      await delay(randomBetween(450, 900));
    }

    scrollContainer.scrollBy({ top: SAFE_SCROLL_STEP_PX, behavior: "smooth" });
    await Promise.race([this.waitForListActivity(scrollContainer, beforeTop, beforeHeight), safeRandomDelay(950, 2100)]);
  }

  private waitForListActivity(scrollContainer: HTMLElement, previousTop: number, previousHeight: number): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      let intervalId: number | undefined;
      let timeoutId: number | undefined;
      const finish = () => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        window.clearInterval(intervalId);
        window.clearTimeout(timeoutId);
        resolve();
      };

      const observer = new MutationObserver(finish);
      observer.observe(scrollContainer, { childList: true, subtree: true });

      const checkScroll = () => {
        if (scrollContainer.scrollTop !== previousTop || scrollContainer.scrollHeight !== previousHeight) {
          finish();
        }
      };

      intervalId = window.setInterval(checkScroll, 180);
      timeoutId = window.setTimeout(() => {
        window.clearInterval(intervalId);
        finish();
      }, 3200);
    });
  }

  private buildRunningMessage(
    kind: RelationshipListKind,
    uniqueCount: number,
    unchangedIterations: number,
    expectedTotal?: number
  ): string {
    const expected = expectedTotal ? ` / expected ${expectedTotal}` : "";
    if (unchangedIterations >= 12 && expectedTotal && uniqueCount < expectedTotal) {
      return `Still looking for more ${kind}: ${uniqueCount}${expected}. Instagram may be slow to load this list.`;
    }

    if (unchangedIterations > 0) {
      return `Reading ${kind}: ${uniqueCount}${expected}. Waiting through a loading plateau.`;
    }

    return `Reading ${kind}: ${uniqueCount}${expected}. Keep the modal open.`;
  }

  private getFinalStatus(uniqueCount: number, expectedTotal?: number): ScrapeProgress["status"] {
    if (this.shouldStop) return "paused";
    if (expectedTotal !== undefined && uniqueCount < expectedTotal) return "incomplete";
    return "complete";
  }

  private getFinalMessage(kind: RelationshipListKind, uniqueCount: number, expectedTotal?: number): string {
    if (this.shouldStop) return "Paused. You can resume later.";
    if (expectedTotal !== undefined && uniqueCount < expectedTotal) {
      return `Incomplete ${kind}: read ${uniqueCount} of ${expectedTotal}. Keep the modal open and run this scraper again.`;
    }

    return "Reached the safe iteration limit.";
  }
}
