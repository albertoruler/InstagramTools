import type { RelationshipAccount, RelationshipIntelligence, UserPreferenceState } from "../types/account";
import { calculateGhostScore } from "./ghostEngine";
import { calculateRelationshipStrength } from "./relationshipStrengthEngine";
import { calculateReviewPriority } from "./reviewQueueEngine";
import { calculateSocialGravity } from "./socialGravityEngine";

const getConfidence = (account: Omit<RelationshipAccount, "intelligence">): RelationshipIntelligence["confidence"] => {
  const signals = [
    account.followsMe !== undefined,
    account.profileAnalyzedAt !== undefined,
    account.followersCount !== undefined,
    account.followingCount !== undefined,
    account.postCount !== undefined,
    account.firstSeenAt !== undefined,
    account.internalGraphScannedAt !== undefined
  ].filter(Boolean).length;

  if (signals >= 5) return "high";
  if (signals >= 3) return "medium";
  return "low";
};

const getNextBestAction = (
  account: Omit<RelationshipAccount, "intelligence">,
  strength: number,
  ghost: number,
  gravity: number
): RelationshipIntelligence["nextBestAction"] => {
  if (account.tags.includes("whitelist") || strength >= 70 || gravity >= 75) return "preserve";
  if (!account.profileAnalyzedAt && (ghost >= 50 || account.scores.botProbability >= 55)) return "analyze_profile";
  if (ghost >= 55 || account.scores.unfollowPriority >= 55) return "review";
  return "monitor";
};

export function buildRelationshipIntelligence(
  account: Omit<RelationshipAccount, "intelligence">,
  preferences: UserPreferenceState
): RelationshipIntelligence {
  const relationshipStrength = calculateRelationshipStrength(account, preferences);
  const socialGravity = calculateSocialGravity(account);
  const ghostScore = calculateGhostScore(account, relationshipStrength.value, socialGravity.value);
  const reviewPriority = calculateReviewPriority(account, ghostScore.value, relationshipStrength.value, socialGravity.value);

  return {
    relationshipStrength,
    ghostScore,
    socialGravity,
    reviewPriority,
    confidence: getConfidence(account),
    nextBestAction: getNextBestAction(account, relationshipStrength.value, ghostScore.value, socialGravity.value)
  };
}
