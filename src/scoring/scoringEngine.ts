import type { AccountScores, RelationshipAccount, ScrapedAccount, UserPreferenceState } from "../types/account";
import { getSuspiciousUsernameScore } from "../heuristics/usernameHeuristics";

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const ratio = (followers?: number, following?: number): number | undefined => {
  if (followers === undefined || following === undefined || following === 0) return undefined;
  return followers / following;
};

const daysSince = (timestamp?: number): number | undefined => {
  if (!timestamp) return undefined;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
};

export function scoreAccount(
  account: ScrapedAccount,
  followsMe: boolean,
  preferences: UserPreferenceState
): AccountScores {
  const reasons: string[] = [];
  const usernameSignals = getSuspiciousUsernameScore(account.username);
  const followerRatio = ratio(account.followersCount, account.followingCount);
  const knownDays = daysSince(account.firstSeenAt);
  const whitelisted = Boolean(preferences.whitelist[account.username]);
  const blacklisted = Boolean(preferences.blacklist[account.username]);

  let botProbability = usernameSignals.score;
  reasons.push(...usernameSignals.reasons);

  if (account.hasProfilePhoto === false) {
    botProbability += 20;
    reasons.push("no visible profile photo");
  }

  if (account.followingCount !== undefined && account.followingCount > 3000) {
    botProbability += 18;
    reasons.push("very high following count");
  }

  if (account.followersCount !== undefined && account.followersCount < 25) {
    botProbability += 14;
    reasons.push("very low follower count");
  }

  if (account.postCount !== undefined && account.postCount <= 1) {
    botProbability += 12;
    reasons.push("very low post count");
  }

  if (account.biography !== undefined && account.biography.trim().length === 0) {
    botProbability += 8;
    reasons.push("empty bio");
  }

  if (account.externalUrl && /(bit\.ly|tinyurl|t\.me|whatsapp|crypto|airdrop|free|promo)/i.test(account.externalUrl)) {
    botProbability += 14;
    reasons.push("suspicious external link");
  }

  if (account.isVerified) {
    botProbability -= 18;
    reasons.push("verified account");
  }

  if (account.isPrivate) {
    botProbability -= 6;
    reasons.push("private account");
  }

  let unfollowPriority = followsMe ? 8 : 45;
  if (!followsMe) reasons.push("does not follow back");
  if (followerRatio !== undefined && followerRatio < 0.2) {
    unfollowPriority += 18;
    reasons.push("low followers/following ratio");
  }
  unfollowPriority += clampScore(botProbability) * 0.28;
  if (blacklisted) unfollowPriority += 25;
  if (whitelisted) unfollowPriority = 0;

  let doNotRemove = followsMe ? 52 : 10;
  if (followsMe) reasons.push("follows you back");
  if (account.isVerified) {
    doNotRemove += 14;
  }
  if (account.isPrivate) {
    doNotRemove += 6;
  }
  if (knownDays !== undefined && knownDays >= 180) {
    doNotRemove += 16;
    unfollowPriority -= 8;
    reasons.push("known locally for 6+ months");
  } else if (knownDays !== undefined && knownDays >= 30) {
    doNotRemove += 8;
    unfollowPriority -= 4;
    reasons.push("known locally for 30+ days");
  }
  if (whitelisted) {
    doNotRemove = 100;
    reasons.push("whitelisted");
  }
  if (blacklisted) {
    doNotRemove = 0;
    reasons.push("blacklisted");
  }

  return {
    botProbability: clampScore(botProbability),
    unfollowPriority: clampScore(unfollowPriority),
    doNotRemove: clampScore(doNotRemove),
    reasons: [...new Set(reasons)]
  };
}

export function scoreRelationship(
  account: Omit<RelationshipAccount, "scores" | "intelligence">,
  preferences: UserPreferenceState
): Omit<RelationshipAccount, "intelligence"> {
  return {
    ...account,
    scores: scoreAccount(account, account.followsMe, preferences)
  };
}
