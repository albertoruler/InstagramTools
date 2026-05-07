export function getSuspiciousUsernameScore(username: string): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (/\d{5,}/.test(username)) {
    score += 24;
    reasons.push("many digits in username");
  }

  if (/^[a-z]+[._]\d+$/.test(username)) {
    score += 16;
    reasons.push("generic name plus numeric suffix");
  }

  if (username.length > 24) {
    score += 12;
    reasons.push("very long username");
  }

  if ((username.match(/[._]/g)?.length ?? 0) >= 4) {
    score += 12;
    reasons.push("many separators");
  }

  return { score: Math.min(score, 100), reasons };
}
