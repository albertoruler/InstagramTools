import { createApp } from "./core/app";
import "./types/window";

const api = createApp();

window.IGRID = api;
api.show();

console.info(
  "[IGRID] Phase 1 dashboard loaded. Use window.IGRID.show(), window.IGRID.scrape('following'), window.IGRID.scrape('followers'), window.IGRID.scrapeInternalFollowing(), or window.IGRID.stop()."
);
