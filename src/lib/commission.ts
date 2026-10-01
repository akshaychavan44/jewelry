// Commission resolution, in order of precedence:
//   1. explicit seller override on the SellerProfile
//   2. active seller-scoped rule        (highest priority wins)
//   3. active category-scoped rule      (item category or its parent)
//   4. platform default
// Subscription-plan discounts apply to 2–4, never to an explicit override.

export type CommissionRuleLite = {
  rateBps: number;
  categoryId: string | null;
  sellerId: string | null;
  priority: number;
  isActive: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
};

export function resolveCommissionBps(args: {
  sellerId: string;
  categoryIds: string[];
  sellerOverrideBps?: number | null;
  planDiscountBps?: number;
  defaultBps: number;
  rules: CommissionRuleLite[];
  now?: Date;
}) {
  if (args.sellerOverrideBps !== null && args.sellerOverrideBps !== undefined) return args.sellerOverrideBps;

  const now = args.now ?? new Date();
  const live = args.rules.filter(
    (r) => r.isActive && (!r.startsAt || r.startsAt <= now) && (!r.endsAt || r.endsAt > now),
  );
  const byPriority = (a: CommissionRuleLite, b: CommissionRuleLite) => b.priority - a.priority;

  const sellerRule = live.filter((r) => r.sellerId === args.sellerId).sort(byPriority)[0];
  const categoryRule = live
    .filter((r) => !r.sellerId && r.categoryId && args.categoryIds.includes(r.categoryId))
    .sort(byPriority)[0];

  const base = sellerRule?.rateBps ?? categoryRule?.rateBps ?? args.defaultBps;
  return Math.max(0, base - (args.planDiscountBps ?? 0));
}
