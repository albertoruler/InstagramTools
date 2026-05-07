import type { AccountListState, RelationshipSnapshot, SnapshotComparison } from "../types/account";

const sortUsernames = (accounts: AccountListState): string[] => Object.keys(accounts.accounts).sort();

const difference = (left: string[], right: string[]): string[] => {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
};

export function createRelationshipSnapshot(
  following: AccountListState,
  followers: AccountListState,
  nonFollowbackCount: number
): RelationshipSnapshot {
  const createdAt = Date.now();
  const followingUsernames = sortUsernames(following);
  const followerUsernames = sortUsernames(followers);

  return {
    id: `snapshot-${createdAt}`,
    createdAt,
    followingUsernames,
    followerUsernames,
    followingCount: followingUsernames.length,
    followersCount: followerUsernames.length,
    nonFollowbackCount
  };
}

export function compareSnapshots(snapshots: RelationshipSnapshot[]): SnapshotComparison | undefined {
  const sorted = [...snapshots].sort((a, b) => b.createdAt - a.createdAt);
  const currentSnapshot = sorted[0];
  const previousSnapshot = sorted[1];
  if (!currentSnapshot) return undefined;

  return {
    currentSnapshot,
    previousSnapshot,
    newFollowing: previousSnapshot ? difference(currentSnapshot.followingUsernames, previousSnapshot.followingUsernames) : [],
    removedFollowing: previousSnapshot ? difference(previousSnapshot.followingUsernames, currentSnapshot.followingUsernames) : [],
    newFollowers: previousSnapshot ? difference(currentSnapshot.followerUsernames, previousSnapshot.followerUsernames) : [],
    lostFollowers: previousSnapshot ? difference(previousSnapshot.followerUsernames, currentSnapshot.followerUsernames) : [],
    nonFollowbackDelta: previousSnapshot ? currentSnapshot.nonFollowbackCount - previousSnapshot.nonFollowbackCount : 0
  };
}
