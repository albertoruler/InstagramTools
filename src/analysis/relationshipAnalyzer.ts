import type {
  AccountListState,
  ListTag,
  RelationshipAccount,
  UserPreferenceState
} from "../types/account";
import { buildRelationshipIntelligence } from "./relationshipIntelligenceEngine";
import { scoreRelationship } from "../scoring/scoringEngine";

export function analyzeRelationships(
  following: AccountListState,
  followers: AccountListState,
  preferences: UserPreferenceState
): RelationshipAccount[] {
  const followerNames = new Set(Object.keys(followers.accounts));

  return Object.values(following.accounts)
    .map((account) => {
      const username = account.username;
      const followsMe = account.followsMe ?? followerNames.has(username);
      const tags: ListTag[] = [];
      if (preferences.whitelist[username]) tags.push("whitelist");
      if (preferences.blacklist[username]) tags.push("blacklist");

      const scored = scoreRelationship(
        {
          ...account,
          followsMe,
          followedByMe: true,
          isNonFollowback: !followsMe,
          tags
        },
        preferences
      );

      return {
        ...scored,
        intelligence: buildRelationshipIntelligence(scored, preferences)
      };
    })
    .sort((a, b) => b.intelligence.reviewPriority.value - a.intelligence.reviewPriority.value);
}
