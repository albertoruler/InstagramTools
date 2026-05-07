export const dashboardStyles = `
  .igrid-panel {
    position: fixed;
    right: 18px;
    bottom: 18px;
    z-index: 2147483647;
    width: min(980px, calc(100vw - 36px));
    height: min(720px, calc(100vh - 36px));
    color: #f4f7f8;
    background: #101214;
    border: 1px solid #2b3035;
    border-radius: 8px;
    box-shadow: 0 18px 70px rgba(0, 0, 0, 0.42);
    font: 13px/1.35 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .igrid-panel.is-dragging {
    user-select: none;
    opacity: 0.96;
  }
  .igrid-panel * { box-sizing: border-box; letter-spacing: 0; }
  .igrid-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid #2b3035;
    background: #15181b;
    cursor: grab;
    touch-action: none;
  }
  .igrid-header:active {
    cursor: grabbing;
  }
  .igrid-title strong { display: block; font-size: 14px; }
  .igrid-title small { color: #9aa4ad; }
  .igrid-toolbar,
  .igrid-controls,
  .igrid-stats {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .igrid-controls {
    padding: 10px 14px;
    border-bottom: 1px solid #252a2f;
    background: #111416;
  }
  .igrid-button,
  .igrid-panel button,
  .igrid-panel select,
  .igrid-panel input {
    border: 1px solid #333a41;
    border-radius: 6px;
    background: #1b2024;
    color: #f4f7f8;
    min-height: 32px;
    padding: 0 10px;
    font: inherit;
  }
  .igrid-panel button { cursor: pointer; }
  .igrid-panel button:hover,
  .igrid-panel button.is-active { border-color: #6fd3b5; color: #dffaf2; }
  .igrid-panel input { min-width: 180px; }
  .igrid-panel input[type="number"] {
    min-width: 140px;
    width: 150px;
  }
  .igrid-body { overflow: auto; min-height: 0; flex: 1; }
  .igrid-help {
    padding: 14px;
    border-bottom: 1px solid #2b3035;
    background: #121619;
    color: #d7e0e6;
  }
  .igrid-help-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .igrid-help h3 {
    margin: 0 0 7px;
    font-size: 13px;
    color: #f4f7f8;
  }
  .igrid-help p,
  .igrid-help ol {
    margin: 0;
    color: #aeb8c0;
  }
  .igrid-help ol {
    padding-left: 18px;
  }
  .igrid-help li + li {
    margin-top: 4px;
  }
  .igrid-status {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 14px;
    border-bottom: 1px solid #252a2f;
    color: #adb7bf;
  }
  .igrid-warning {
    padding: 8px 14px;
    color: #ffd9a8;
    background: #20190f;
    border-bottom: 1px solid #3b2b17;
  }
  .igrid-intel,
  .igrid-snapshot {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 8px 14px;
    border-bottom: 1px solid #252a2f;
    color: #b8c3ca;
    background: #121619;
  }
  .igrid-intel strong {
    color: #f4f7f8;
  }
  .igrid-intel small {
    color: #8d98a1;
  }
  .igrid-snapshot span {
    color: #c9d2d9;
    background: #1a1e22;
    border: 1px solid #2c3339;
    border-radius: 6px;
    padding: 4px 7px;
  }
  .igrid-stat {
    color: #c9d2d9;
    background: #1a1e22;
    border: 1px solid #2c3339;
    border-radius: 6px;
    padding: 5px 8px;
  }
  .igrid-stat-ok {
    color: #c9f7e7;
    border-color: #286655;
    background: #15372e;
  }
  .igrid-stat-warn {
    color: #ffe0b6;
    border-color: #6b4a22;
    background: #3a2815;
  }
  .igrid-verification {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 260px;
  }
  .igrid-verification strong {
    color: #f4f7f8;
  }
  .igrid-table-wrap { min-width: 840px; }
  .igrid-table {
    width: 100%;
    border-collapse: collapse;
  }
  .igrid-table th,
  .igrid-table td {
    border-bottom: 1px solid #22282d;
    padding: 9px 10px;
    text-align: left;
    vertical-align: middle;
  }
  .igrid-table th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #15181b;
    color: #9aa4ad;
    font-weight: 600;
  }
  .igrid-account {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 220px;
  }
  .igrid-account img,
  .igrid-avatar-fallback {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #2d343a;
    flex: 0 0 auto;
  }
  .igrid-account strong,
  .igrid-account small { display: block; }
  .igrid-account small {
    color: #8d98a1;
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .igrid-pill,
  .igrid-score {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 42px;
    min-height: 24px;
    border-radius: 999px;
    padding: 0 8px;
    font-weight: 650;
  }
  .igrid-pill { min-width: 88px; color: #dce4e9; background: #22282d; }
  .igrid-pill-ok { color: #c9f7e7; background: #15372e; }
  .igrid-pill-warn { color: #ffe0b6; background: #3a2815; }
  .igrid-score-risk { color: #ffd5d5; background: #4a1f26; }
  .igrid-score-neutral { color: #d9e2ff; background: #232d4a; }
  .igrid-score-safe { color: #c9f7e7; background: #15372e; }
  .igrid-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .igrid-footer {
    padding: 9px 14px;
    border-top: 1px solid #2b3035;
    color: #8d98a1;
    background: #15181b;
  }
  .igrid-launcher {
    position: fixed;
    right: 18px;
    bottom: 18px;
    z-index: 2147483647;
    min-width: 52px;
    min-height: 44px;
    border: 1px solid #333a41;
    border-radius: 8px;
    background: #15181b;
    color: #f4f7f8;
    box-shadow: 0 12px 42px rgba(0, 0, 0, 0.36);
    font: 13px/1.2 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    cursor: pointer;
  }
  .igrid-launcher:hover {
    border-color: #6fd3b5;
    color: #dffaf2;
  }
  @media (max-width: 720px) {
    .igrid-panel {
      inset: 10px;
      width: auto;
      height: auto;
    }
    .igrid-header,
    .igrid-status {
      align-items: flex-start;
      flex-direction: column;
    }
    .igrid-help-grid {
      grid-template-columns: 1fr;
    }
  }
`;
