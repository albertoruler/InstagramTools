export type RelationshipListKind = "following" | "followers";

export type ListTag = "whitelist" | "blacklist";

export interface ScrapedAccount {
  username: string;
  displayName?: string;
  profileUrl: string;
  avatarUrl?: string;
  hasProfilePhoto?: boolean;
  biography?: string;
  externalUrl?: string;
  isPrivate?: boolean;
  isVerified?: boolean;
  followersCount?: number;
  followingCount?: number;
  postCount?: number;
  profileAnalyzedAt?: number;
  followsMe?: boolean;
  internalGraphScannedAt?: number;
  firstSeenAt?: number;
  seenAt: number;
  source: RelationshipListKind;
}

export interface ProfileAnalysisResult {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  hasProfilePhoto?: boolean;
  biography?: string;
  externalUrl?: string;
  isPrivate?: boolean;
  isVerified?: boolean;
  followersCount?: number;
  followingCount?: number;
  postCount?: number;
  analyzedAt: number;
}

export interface AccountListState {
  kind: RelationshipListKind;
  accounts: Record<string, ScrapedAccount>;
  lastUpdatedAt?: number;
  scrollTop?: number;
  completedAt?: number;
}

export interface RelationshipAccount extends ScrapedAccount {
  followsMe: boolean;
  followedByMe: boolean;
  isNonFollowback: boolean;
  tags: ListTag[];
  notes?: string;
  scores: AccountScores;
  intelligence: RelationshipIntelligence;
}

export interface AccountScores {
  botProbability: number;
  unfollowPriority: number;
  doNotRemove: number;
  reasons: string[];
}

export interface RelationshipIntelligence {
  relationshipStrength: ScoreWithExplanation;
  ghostScore: ScoreWithExplanation;
  socialGravity: ScoreWithExplanation;
  reviewPriority: ScoreWithExplanation;
  confidence: "low" | "medium" | "high";
  nextBestAction: "preserve" | "review" | "analyze_profile" | "monitor";
}

export interface ScoreWithExplanation {
  value: number;
  reasons: string[];
}

export interface UserPreferenceState {
  whitelist: Record<string, ListPreference>;
  blacklist: Record<string, ListPreference>;
}

export type ExpectedTotals = Partial<Record<RelationshipListKind, number>>;

export interface ListPreference {
  username: string;
  createdAt: number;
  note?: string;
}

export interface ScrapeProgress {
  kind: RelationshipListKind;
  uniqueCount: number;
  iterations: number;
  idleCycles?: number;
  expectedTotal?: number;
  startedAt: number;
  updatedAt: number;
  status: "idle" | "running" | "paused" | "complete" | "incomplete" | "error";
  message?: string;
}

export interface RelationshipSnapshot {
  id: string;
  createdAt: number;
  followingUsernames: string[];
  followerUsernames: string[];
  followingCount: number;
  followersCount: number;
  nonFollowbackCount: number;
}

export interface SnapshotComparison {
  currentSnapshot?: RelationshipSnapshot;
  previousSnapshot?: RelationshipSnapshot;
  newFollowing: string[];
  removedFollowing: string[];
  newFollowers: string[];
  lostFollowers: string[];
  nonFollowbackDelta: number;
}

export interface ReviewQueueItem {
  username: string;
  priority: number;
  confidence: RelationshipIntelligence["confidence"];
  reasons: string[];
  suggestedAction: RelationshipIntelligence["nextBestAction"];
}

export interface ReviewQueue {
  generatedAt: number;
  items: ReviewQueueItem[];
  next?: ReviewQueueItem;
}

export interface DashboardState {
  following: AccountListState;
  followers: AccountListState;
  preferences: UserPreferenceState;
  expectedTotals: ExpectedTotals;
  relationships: RelationshipAccount[];
  snapshots: RelationshipSnapshot[];
  snapshotComparison?: SnapshotComparison;
  reviewQueue: ReviewQueue;
  progress?: ScrapeProgress;
}
