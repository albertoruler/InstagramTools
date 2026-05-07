import { Dashboard } from "../ui/dashboard/dashboard";
import { LocalStore } from "../storage/local/localStore";
import type { IGridConsoleApi } from "../types/window";

export function createApp(): IGridConsoleApi {
  const store = new LocalStore();
  const dashboard = new Dashboard(store);

  return {
    show: () => dashboard.show(),
    hide: () => dashboard.hide(),
    scrape: (kind) => dashboard.scrape(kind),
    scrapeInternalFollowing: () => dashboard.internalScraper.scrapeFollowing(),
    stop: () => dashboard.stop(),
    exportData: () => dashboard.exportData(),
    clearData: () => dashboard.clearData(),
    scraper: dashboard.scraper
  };
}
