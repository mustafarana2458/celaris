import { STAGE_PROBABILITY } from "@/components/deals/stages";
import { bucketsOverlap, dateInBucket, type PeriodBucket } from "@/lib/forecastPeriods";
import type { Deal, SalesTarget } from "@/lib/types";

// Win probability as a 0-1 fraction: prefer the explicit win_probability field
// (captured on the deal form), fall back to the stage's default estimate for
// deals that haven't been given one yet.
export function dealWinFraction(deal: Pick<Deal, "win_probability" | "stage">) {
  return deal.win_probability != null ? deal.win_probability / 100 : STAGE_PROBABILITY[deal.stage];
}

export function weightedValue(deal: Pick<Deal, "value" | "win_probability" | "stage">) {
  return (deal.value ?? 0) * dealWinFraction(deal);
}

export function targetsOverlappingBucket(targets: SalesTarget[], bucket: PeriodBucket) {
  return targets.filter((t) => bucketsOverlap(t.period_start, t.period_end, bucket.start, bucket.end));
}

export function sumTargetGoals(targets: SalesTarget[]) {
  return targets.reduce((sum, t) => sum + t.revenue_goal, 0);
}

export type BucketMetrics = {
  bucket: PeriodBucket;
  targetRevenue: number;
  weightedForecast: number;
  wonRevenue: number;
};

export function computeBucketMetrics(bucket: PeriodBucket, deals: Deal[], targets: SalesTarget[]): BucketMetrics {
  let weightedForecast = 0;
  let wonRevenue = 0;

  for (const deal of deals) {
    if (!dateInBucket(deal.expected_close, bucket)) continue;
    if (deal.stage === "won") {
      wonRevenue += deal.value ?? 0;
    } else if (deal.stage !== "lost") {
      weightedForecast += weightedValue(deal);
    }
  }

  return {
    bucket,
    targetRevenue: sumTargetGoals(targetsOverlappingBucket(targets, bucket)),
    weightedForecast,
    wonRevenue,
  };
}
