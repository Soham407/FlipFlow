import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Users, Clock, BarChart3 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { ViewEvent } from "@/types";

const Analytics = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [views, setViews] = useState<ViewEvent[]>([]);
  const [flipbookTitle, setFlipbookTitle] = useState<string>("");

  // Fetch view data from Supabase with date range filtering
  useEffect(() => {
    const fetchViews = async () => {
      setLoading(true);
      try {
        // Fetch the flipbook title
        const { data: bookData, error: bookErr } = await supabase
          .from("flipbooks")
          .select("title")
          .eq("id", id)
          .maybeSingle();
        if (bookErr) throw bookErr;
        setFlipbookTitle(bookData?.title || "Flipbook");

        // Fetch all views
        const { data, error } = await supabase
          .from("flipbook_views")
          .select("*")
          .eq("flipbook_id", id)
          .order("viewed_at", { ascending: true });
        if (error) throw error;
        setViews(data || []);
      } catch (err) {
        toast.error("Failed to load analytics");
        setError("Could not load analytics data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchViews();
  }, [id]);

  // Stats calculations based on fetched (already filtered) views
  const totalViews = views.length;
  const uniqueUsers = useMemo(() => {
    const set = new Set(views.map((v) => v.user_id || v.session_id));
    return set.size;
  }, [views]);
  const avgTimeSpent = useMemo(() => {
    const viewsWithTime = views.filter(
      (v) => v.time_spent_seconds && v.time_spent_seconds > 0
    );
    if (viewsWithTime.length === 0) return 0;
    const total = viewsWithTime.reduce(
      (acc, v) => acc + (v.time_spent_seconds || 0),
      0
    );
    return Math.round(total / viewsWithTime.length);
  }, [views]);

  // Chart data: views by date (including days with 0 views)
  const viewsByDate = useMemo(() => {
    // Show last 30 days by default even if no views
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);

    // Count views by date
    const map: Record<string, number> = {};
    views.forEach((v) => {
      const date = v.viewed_at.slice(0, 10);
      map[date] = (map[date] || 0) + 1;
    });

    // Determine date range
    let firstDate = thirtyDaysAgo;
    let lastDate = today;

    if (views.length > 0) {
      const dates = Object.keys(map).sort();
      const earliestView = new Date(dates[0]);
      const latestView = new Date(dates[dates.length - 1]);

      // Use the wider range between default 30 days and actual view range
      firstDate = earliestView < thirtyDaysAgo ? earliestView : thirtyDaysAgo;
      lastDate = latestView > today ? latestView : today;
    }

    // Fill in all dates in range
    const result = [];
    const current = new Date(firstDate);
    while (current <= lastDate) {
      const dateStr = current.toISOString().slice(0, 10);
      result.push({ date: dateStr, count: map[dateStr] || 0 });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }, [views]);

  return (
    <div className="min-h-screen bg-background pt-8 pb-16">
      <div className="container mx-auto max-w-6xl px-4">
        <Button
          variant="outline"
          size="sm"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Analytics
          </h1>
          <p className="text-muted-foreground">
            {flipbookTitle || "Loading..."}
          </p>
        </div>

        {loading && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          </div>
        )}

        {!loading && error && (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-center">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && (
          <>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Views
                  </CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalViews}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Unique Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{uniqueUsers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg. Time Spent
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{avgTimeSpent}s</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Views Over Time</CardTitle>
                <CardDescription>
                  {views.length === 0 ? "Last 30 days" : "Activity over time"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={viewsByDate}>
                    <defs>
                      <linearGradient
                        id="colorViews"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis className="text-xs" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#colorViews)"
                      name="Views"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                {views.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    No views yet. Share your flipbook to start seeing analytics!
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;
