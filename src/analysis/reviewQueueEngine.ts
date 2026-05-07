import type { RelationshipAccount, ReviewQueue, ScoreWithExplanation } from "../types/account";
import { clampScore } from "../utils/scoring/scoreUtils";
import { explainReviewCandidate } from "./explanationEngine";

export function calculateReviewPriority(
  account: Omit<RelationshipAccount, "intelligence">,
  ghostScore: number,
  relationshipStrength: number,
  socialGravity: number
): ScoreWithExplanation {
  const reasons: string[] = [];
  let score = account.scores.unfollowPriority * 0.35 + ghostScore * 0.35 + account.scores.botProbability * 0.18;

  if (relationshipStrength < 35) {
    score += 10;
    reasons.push("weak relationship");
  }

  if (socialGravity >= 65) {
    score -= 12;
    reasons.push("high social gravity lowers review urgency");
  }

  if (account.tags.includes("whitelist")) {
    score = 0;
    reasons.push("whitelisted");
  }

  if (account.tags.includes("blacklist")) {
    score += 18;
    reasons.push("manually marked review");
  }

  if (!account.profileAnalyzedAt && score >= 45) {
    reasons.push("profile needs manual analysis");
  }

  return {
    value: clampScore(score),
    reasons: reasons.length > 0 ? reasons : ["review priority from combined scores"]
  };
}

export function buildReviewQueue(relationships: RelationshipAccount[]): ReviewQueue {
  const items = relationships
    .filter((account) => !account.tags.includes("whitelist"))
    .map((account) => ({
      username: account.username,
      priority: account.intelligence.reviewPriority.value,
      confidence: account.intelligence.confidence,
      reasons: explainReviewCandidate(account),
      suggestedAction: account.intelligence.nextBestAction
    }))
    .filter((item) => item.priority >= 35)
    .sort((a, b) => b.priority - a.priority);

  return {
    generatedAt: Date.now(),
    items,
    next: items[0]
  };
}
