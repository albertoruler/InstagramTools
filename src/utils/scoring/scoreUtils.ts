export const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const daysSince = (timestamp?: number): number | undefined => {
  if (!timestamp) return undefined;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
};

export const followerRatio = (followers?: number, following?: number): number | undefined => {
  if (followers === undefined || following === undefined || following === 0) return undefined;
  return followers / following;
};
