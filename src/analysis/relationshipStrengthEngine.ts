import type { RelationshipAccount, ScoreWithExplanation, UserPreferenceState } from "../types/account";
import { clampScore, daysSince } from "../utils/scoring/scoreUtils";

export function calculateRelationshipStrength(
  account: Omit<RelationshipAccount, "intelligence">,
  preferences: UserPreferenceState
): ScoreWithExplanation {
  const reasons: string[] = [];
  const knownDays = daysSince(account.firstSeenAt);
  let score = 12;

  if (account.followsMe) {
    score += 34;
    reasons.push("follows you back");
  }

  if (preferences.whitelist[account.username]) {
    score += 38;
    reasons.push("manually marked keep");
  }

  if (preferences.blacklist[account.username]) {
    score -= 24;
    reasons.push("manually marked review");
  }

  if (account.isVerified) {
    score += 14;
    reasons.push("verified account");
  }

  if (account.isPrivate) {
    score += 8;
    reasons.push("private account");
  }

  if (account.followersCount !== undefined && account.followersCount >= 10_000) {
    score += 8;
    reasons.push("large audience");
  }

  if (knownDays !== undefined && knownDays >= 180) {
    score += 12;
    reasons.push("known locally for 6+ months");
  } else if (knownDays !== undefined && knownDays >= 30) {
    score += 6;
    reasons.push("known locally for 30+ days");
  }

  if (account.profileAnalyzedAt) {
    score += 4;
    reasons.push("profile manually analyzed");
  }

  if (account.scores.botProbability >= 70) {
    score -= 18;
    reasons.push("high bot probability");
  }

  return {
    value: clampScore(score),
    reasons: reasons.length > 0 ? reasons : ["limited relationship signals"]
  };
}
