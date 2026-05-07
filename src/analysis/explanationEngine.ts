import type { RelationshipAccount } from "../types/account";

export function explainReviewCandidate(account: RelationshipAccount): string[] {
  const reasons = [
    ...account.intelligence.reviewPriority.reasons,
    ...account.intelligence.ghostScore.reasons.slice(0, 2),
    ...account.intelligence.relationshipStrength.reasons
      .filter((reason) => reason.includes("low") || reason.includes("review"))
      .slice(0, 1)
  ];

  if (account.isNonFollowback) reasons.unshift("does not follow back");
  if (account.intelligence.socialGravity.value >= 65) reasons.push("has creator/network value, review carefully");
  if (account.intelligence.confidence === "low") reasons.push("low confidence, analyze profile before deciding");

  return [...new Set(reasons)].slice(0, 6);
}

export function explainRelationshipSummary(account: RelationshipAccount): string {
  return [
    `strength ${account.intelligence.relationshipStrength.value}`,
    `ghost ${account.intelligence.ghostScore.value}`,
    `gravity ${account.intelligence.socialGravity.value}`,
    `confidence ${account.intelligence.confidence}`
  ].join(" · ");
}
