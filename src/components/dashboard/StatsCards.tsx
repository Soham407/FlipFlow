import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, HardDrive, Zap } from "lucide-react";
import { PLANS } from "@/config/constants";
import type { UserRole } from "@/types";

interface StatsCardsProps {
  totalCount: number;
  activeCount: number;
  userRole: UserRole;
}

export function StatsCards({
  totalCount,
  activeCount,
  userRole,
}: StatsCardsProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const planKey = userRole.toUpperCase() as keyof typeof PLANS;
  const plan = PLANS[planKey] || PLANS.FREE;

  // Calculate usage percentage (safe for Infinity)
  const usagePercent =
    plan.maxFlipbooks === Infinity
      ? 0 // Unlimited has no limit visually
      : Math.min((activeCount / plan.maxFlipbooks) * 100, 100);

  useEffect(() => {
    // Small delay to trigger animation after mount
    const timer = setTimeout(() => {
      setAnimatedPercent(usagePercent);
    }, 100);
    return () => clearTimeout(timer);
  }, [usagePercent]);

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Flipbooks</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCount}</div>
          <p className="text-xs text-muted-foreground">
            {plan.maxFlipbooks === Infinity
              ? "Unlimited uploads active"
              : `${plan.maxFlipbooks - activeCount} active slots remaining`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{plan.maxFileSizeMB}MB</div>
          <p className="text-xs text-muted-foreground">
            Max file size per upload
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Plan Usage</CardTitle>
          <Zap
            className={`h-4 w-4 ${
              userRole !== "free" ? "text-primary" : "text-muted-foreground"
            }`}
            aria-hidden="true"
          />
        </CardHeader>
        <CardContent>
          {plan.maxFlipbooks === Infinity ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">
                {plan.name.toUpperCase()}
              </span>
              <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                ACTIVE
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {animatedPercent.toFixed(0)}%
              </div>
              <Progress
                value={animatedPercent}
                className="h-2 transition-all duration-1000 ease-out"
                aria-label={`${animatedPercent.toFixed(
                  0
                )}% of flipbook limit used`}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
