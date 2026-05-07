import type { RelationshipAccount, ScoreWithExplanation } from "../types/account";
import { clampScore, followerRatio } from "../utils/scoring/scoreUtils";

export function calculateSocialGravity(account: Omit<RelationshipAccount, "intelligence">): ScoreWithExplanation {
  const reasons: string[] = [];
  let score = 10;
  const ratio = followerRatio(account.followersCount, account.followingCount);

  if (account.isVerified) {
    score += 26;
    reasons.push("verified account");
  }

  if (account.followersCount !== undefined) {
    if (account.followersCount >= 100_000) {
      score += 28;
      reasons.push("major audience");
    } else if (account.followersCount >= 10_000) {
      score += 18;
      reasons.push("large audience");
    } else if (account.followersCount >= 1_000) {
      score += 8;
      reasons.push("meaningful audience");
    }
  }

  if (ratio !== undefined && ratio >= 2) {
    score += 12;
    reasons.push("strong followers/following ratio");
  }

  if (account.postCount !== undefined && account.postCount >= 20) {
    score += 7;
    reasons.push("active profile footprint");
  }

  if (account.externalUrl) {
    score += 5;
    reasons.push("has external presence");
  }

  if (account.followsMe) {
    score += 8;
    reasons.push("connected back to you");
  }

  if (account.scores.botProbability >= 70) {
    score -= 22;
    reasons.push("high bot probability reduces gravity");
  }

  return {
    value: clampScore(score),
    reasons: reasons.length > 0 ? reasons : ["limited ecosystem signals"]
  };
}
