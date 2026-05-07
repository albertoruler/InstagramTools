import type { RelationshipAccount, ScoreWithExplanation } from "../types/account";
import { clampScore, daysSince } from "../utils/scoring/scoreUtils";

export function calculateGhostScore(
  account: Omit<RelationshipAccount, "intelligence">,
  relationshipStrength: number,
  socialGravity: number
): ScoreWithExplanation {
  const reasons: string[] = [];
  const knownDays = daysSince(account.firstSeenAt);
  let score = 10;

  if (!account.followsMe) {
    score += 34;
    reasons.push("does not follow back");
  }

  if (knownDays !== undefined && knownDays >= 180) {
    score += 18;
    reasons.push("old known follow with weak reciprocity");
  } else if (knownDays !== undefined && knownDays >= 30) {
    score += 8;
    reasons.push("known for 30+ days");
  }

  if (relationshipStrength < 35) {
    score += 18;
    reasons.push("low relationship strength");
  }

  if (socialGravity < 35) {
    score += 12;
    reasons.push("low social gravity");
  }

  if (account.profileAnalyzedAt && account.postCount !== undefined && account.postCount <= 1) {
    score += 10;
    reasons.push("low profile activity");
  }

  if (account.scores.botProbability >= 60) {
    score += 8;
    reasons.push("bot-like signals");
  }

  if (account.tags.includes("whitelist") || account.followsMe) {
    score -= 26;
    reasons.push("protected relationship signal");
  }

  return {
    value: clampScore(score),
    reasons: reasons.length > 0 ? reasons : ["limited ghost signals"]
  };
}
