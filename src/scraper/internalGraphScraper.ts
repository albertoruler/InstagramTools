import type { ScrapeProgress, ScrapedAccount } from "../types/account";
import { LocalStore } from "../storage/local/localStore";
import { profileUrlFor } from "../utils/dom/selectors";
import { delay, randomBetween } from "../utils/timing/delay";

interface InternalGraphNode {
  id?: string;
  username: string;
  full_name?: string;
  profile_pic_url?: string;
  is_private?: boolean;
  is_verified?: boolean;
  follows_viewer?: boolean;
}

interface InternalGraphPage {
  count: number;
  page_info: {
    has_next_page: boolean;
    end_cursor?: string;
  };
  edges: Array<{ node: InternalGraphNode }>;
}

interface InternalGraphResponse {
  data?: {
    user?: {
      edge_follow?: InternalGraphPage;
    };
  };
}

export interface InternalGraphEvents {
  onProgress?: (progress: ScrapeProgress) => void;
  onAccounts?: (accounts: ScrapedAccount[]) => void;
}

const QUERY_HASH = "3dec7e2c57367ef3da3d987d89f9dbc8";
const PAGE_SIZE = 24;
const MAX_IDLE_PAGES = 6;

const getCookie = (name: string): string | undefined => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length !== 2) return undefined;
  return parts.pop()?.split(";").shift();
};

const buildUrl = (userId: string, cursor?: string): string => {
  const variables = {
    id: userId,
    include_reel: true,
    fetch_mutual: false,
    first: PAGE_SIZE,
    ...(cursor ? { after: cursor } : {})
  };

  return `https://www.instagram.com/graphql/query/?query_hash=${QUERY_HASH}&variables=${encodeURIComponent(JSON.stringify(variables))}`;
};

const nodeToAccount = (node: InternalGraphNode, scannedAt: number): ScrapedAccount => ({
  username: node.username.toLowerCase(),
  displayName: node.full_name,
  profileUrl: profileUrlFor(node.username),
  avatarUrl: node.profile_pic_url,
  isPrivate: node.is_private,
  isVerified: node.is_verified,
  followsMe: node.follows_viewer,
  internalGraphScannedAt: scannedAt,
  firstSeenAt: scannedAt,
  seenAt: scannedAt,
  source: "following"
});

export class InternalGraphFollowingScraper {
  private shouldStop = false;
  private progress?: ScrapeProgress;

  constructor(
    private readonly store: LocalStore,
    private readonly events: InternalGraphEvents = {}
  ) {}

  stop(): void {
    this.shouldStop = true;
    if (this.progress) {
      this.updateProgress({ ...this.progress, status: "paused", message: "Internal read-only scan paused." });
    }
  }

  getProgress(): ScrapeProgress | undefined {
    return this.progress;
  }

  async scrapeFollowing(): Promise<void> {
    this.shouldStop = false;
    const userId = getCookie("ds_user_id");
    const startedAt = Date.now();

    if (!userId) {
      this.updateProgress({
        kind: "following",
        uniqueCount: Object.keys(this.store.load().following.accounts).length,
        iterations: 0,
        startedAt,
        updatedAt: Date.now(),
        status: "error",
        message: "Instagram login cookie not found. Open Instagram while logged in."
      });
      return;
    }

    let cursor: string | undefined;
    let hasNextPage = true;
    let total: number | undefined;
    let iterations = 0;
    let previousCount = Object.keys(this.store.load().following.accounts).length;
    let idlePages = 0;
    let previousCursor: string | undefined;

    while (hasNextPage && !this.shouldStop) {
      iterations += 1;
      const response = await fetch(buildUrl(userId, cursor), {
        credentials: "include",
        headers: { accept: "application/json" }
      });

      if (!response.ok) {
        this.updateProgress({
          kind: "following",
          uniqueCount: Object.keys(this.store.load().following.accounts).length,
          iterations,
          expectedTotal: total,
          startedAt,
          updatedAt: Date.now(),
          status: "error",
          message: `Internal read-only request failed with ${response.status}.`
        });
        return;
      }

      const json = (await response.json()) as InternalGraphResponse;
      const page = json.data?.user?.edge_follow;
      if (!page) {
        this.updateProgress({
          kind: "following",
          uniqueCount: Object.keys(this.store.load().following.accounts).length,
          iterations,
          expectedTotal: total,
          startedAt,
          updatedAt: Date.now(),
          status: "error",
          message: "Instagram internal response did not include following data."
        });
        return;
      }

      total = page.count;
      this.store.setExpectedTotal("following", total);
      const scannedAt = Date.now();
      const accounts = page.edges.map((edge) => nodeToAccount(edge.node, scannedAt));
      const list = this.store.mergeAccounts("following", accounts);
      const uniqueCount = Object.keys(list.accounts).length;
      const cursorDidNotMove = cursor !== undefined && cursor === previousCursor;
      const pageAddedNothing = uniqueCount === previousCount || accounts.length === 0;
      idlePages = pageAddedNothing || cursorDidNotMove ? idlePages + 1 : 0;
      previousCount = uniqueCount;
      previousCursor = cursor;
      this.events.onAccounts?.(accounts);

      this.updateProgress({
        kind: "following",
        uniqueCount,
        iterations,
        idleCycles: idlePages,
        expectedTotal: total,
        startedAt,
        updatedAt: Date.now(),
        status: "running",
        message:
          idlePages > 0
            ? `Internal read-only scan: ${uniqueCount}/${total}. Waiting through a repeated/empty page.`
            : `Internal read-only scan: ${uniqueCount}/${total} following accounts.`
      });

      if (idlePages >= MAX_IDLE_PAGES) {
        break;
      }

      hasNextPage = page.page_info.has_next_page;
      cursor = page.page_info.end_cursor;
      await delay(randomBetween(900, 2200));
    }

    const finalCount = Object.keys(this.store.load().following.accounts).length;
    const incomplete = total !== undefined && finalCount < total;
    this.updateProgress({
      kind: "following",
      uniqueCount: finalCount,
      iterations,
      idleCycles: idlePages,
      expectedTotal: total,
      startedAt,
      updatedAt: Date.now(),
      status: this.shouldStop ? "paused" : incomplete ? "incomplete" : "complete",
      message: this.shouldStop
        ? "Internal read-only scan paused."
        : incomplete
          ? `Internal read-only scan stopped at ${finalCount}/${total}. You can still review accounts with follows-me data, or run it again later.`
          : `Internal read-only scan complete: ${finalCount}/${total ?? finalCount}.`
    });
  }

  private updateProgress(progress: ScrapeProgress): void {
    this.progress = progress;
    this.events.onProgress?.(progress);
  }
}
