import type { RelationshipListKind } from "./account";
import type { InstagramScraper } from "../scraper/instagramScraper";

export interface IGridConsoleApi {
  show: () => void;
  hide: () => void;
  scrape: (kind: RelationshipListKind) => Promise<void>;
  scrapeInternalFollowing: () => Promise<void>;
  stop: () => void;
  exportData: () => string;
  clearData: () => void;
  scraper: InstagramScraper;
}

declare global {
  interface Window {
    IGRID?: IGridConsoleApi;
  }
}
