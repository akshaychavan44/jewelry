/** Derive the displayed summary from the same published reviews as the list. */
export function summarizeRatings(distribution: readonly { stars: number; count: number }[]) {
  const count = distribution.reduce((total, group) => total + group.count, 0);
  const weighted = distribution.reduce((total, group) => total + group.stars * group.count, 0);
  return { count, average: count ? weighted / count : 0 };
}
