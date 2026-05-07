import type {
  AccountListState,
  DashboardState,
  ExpectedTotals,
  RelationshipListKind,
  RelationshipSnapshot,
  ScrapedAccount,
  UserPreferenceState
} from "../../types/account";
import { createRelationshipSnapshot } from "../../analysis/snapshotEngine";

const STORAGE_KEY = "igrid.phase1.state";

interface StoredState {
  following: AccountListState;
  followers: AccountListState;
  preferences: UserPreferenceState;
  expectedTotals: ExpectedTotals;
  snapshots: RelationshipSnapshot[];
}

const emptyList = (kind: RelationshipListKind): AccountListState => ({
  kind,
  accounts: {}
});

const emptyPreferences = (): UserPreferenceState => ({
  whitelist: {},
  blacklist: {}
});

export class LocalStore {
  load(): StoredState {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        following: emptyList("following"),
        followers: emptyList("followers"),
        preferences: emptyPreferences(),
        expectedTotals: {},
        snapshots: []
      };
    }

    try {
      const parsed = JSON.parse(raw) as Partial<StoredState>;
      return {
        following: parsed.following ?? emptyList("following"),
        followers: parsed.followers ?? emptyList("followers"),
        preferences: parsed.preferences ?? emptyPreferences(),
        expectedTotals: parsed.expectedTotals ?? {},
        snapshots: parsed.snapshots ?? []
      };
    } catch {
      return {
        following: emptyList("following"),
        followers: emptyList("followers"),
        preferences: emptyPreferences(),
        expectedTotals: {},
        snapshots: []
      };
    }
  }

  saveList(kind: RelationshipListKind, accounts: Record<string, ScrapedAccount>, scrollTop?: number): void {
    const state = this.load();
    state[kind] = {
      kind,
      accounts,
      lastUpdatedAt: Date.now(),
      scrollTop
    };
    this.save(state);
  }

  mergeAccounts(kind: RelationshipListKind, accounts: ScrapedAccount[], scrollTop?: number): AccountListState {
    const state = this.load();
    const current = state[kind] ?? emptyList(kind);
    const nextAccounts = { ...current.accounts };

    for (const account of accounts) {
      const existing = nextAccounts[account.username];
      nextAccounts[account.username] = {
        ...existing,
        ...account,
        username: account.username.toLowerCase(),
        firstSeenAt: existing?.firstSeenAt ?? account.firstSeenAt ?? account.seenAt
      };
    }

    const nextList: AccountListState = {
      kind,
      accounts: nextAccounts,
      lastUpdatedAt: Date.now(),
      scrollTop
    };

    state[kind] = nextList;
    this.save(state);
    return nextList;
  }

  mergeProfileAnalysis(accountPatch: Omit<Partial<ScrapedAccount>, "source"> & { username: string; seenAt: number }): void {
    const state = this.load();
    const username = accountPatch.username.toLowerCase();

    for (const kind of ["following", "followers"] as const) {
      const existing = state[kind].accounts[username];
      if (!existing) continue;

      state[kind].accounts[username] = {
        ...existing,
        ...accountPatch,
        username,
        source: existing.source,
        firstSeenAt: existing.firstSeenAt ?? existing.seenAt
      };
      state[kind].lastUpdatedAt = Date.now();
    }

    this.save(state);
  }

  setPreference(list: "whitelist" | "blacklist", username: string, enabled: boolean): UserPreferenceState {
    const state = this.load();
    const normalized = username.toLowerCase();
    const opposite = list === "whitelist" ? "blacklist" : "whitelist";

    if (enabled) {
      state.preferences[list][normalized] = {
        username: normalized,
        createdAt: Date.now()
      };
      delete state.preferences[opposite][normalized];
    } else {
      delete state.preferences[list][normalized];
    }

    this.save(state);
    return state.preferences;
  }

  setExpectedTotal(kind: RelationshipListKind, value?: number): ExpectedTotals {
    const state = this.load();
    if (value === undefined) {
      delete state.expectedTotals[kind];
    } else {
      state.expectedTotals[kind] = value;
    }
    this.save(state);
    return state.expectedTotals;
  }

  createSnapshot(nonFollowbackCount: number): RelationshipSnapshot {
    const state = this.load();
    const snapshot = createRelationshipSnapshot(state.following, state.followers, nonFollowbackCount);
    state.snapshots = [snapshot, ...state.snapshots].slice(0, 20);
    this.save(state);
    return snapshot;
  }

  export(): string {
    return JSON.stringify(this.load(), null, 2);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  toDashboardState(
    relationships: DashboardState["relationships"],
    reviewQueue: DashboardState["reviewQueue"],
    snapshotComparison: DashboardState["snapshotComparison"],
    progress?: DashboardState["progress"]
  ): DashboardState {
    const state = this.load();
    return {
      ...state,
      relationships,
      snapshotComparison,
      reviewQueue,
      progress
    };
  }

  private save(state: StoredState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
