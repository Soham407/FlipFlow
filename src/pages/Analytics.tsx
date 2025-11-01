import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart2, ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface ViewEvent {
  id: string;
  flipbook_id: string;
  user_id: string | null;
  viewed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  time_spent_seconds?: number | null;
  session_id?: string | null;
}

const Analytics = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [views, setViews] = useState<ViewEvent[]>([]);
  const [flipbookTitle, setFlipbookTitle] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });

  // Fetch view data from Supabase with date range filtering
  useEffect(() => {
    const fetchViews = async () => {
      setLoading(true);
      try {
        // Fetch the flipbook title
        const { data: bookData, error: bookErr } = await supabase.from("flipbooks").select("title").eq("id", id).maybeSingle();
        if (bookErr) throw bookErr;
        setFlipbookTitle(bookData?.title || "Flipbook");

        // Build query with date range filter
        let query = supabase
          .from("flipbook_views")
          .select("*")
          .eq("flipbook_id", id);
        if (dateRange.start) {
          query = query.gte("viewed_at", dateRange.start);
        }
        if (dateRange.end) {
          // Cover the entire day for the end date
          query = query.lte("viewed_at", dateRange.end + " 23:59:59");
        }
        query = query.order("viewed_at", { ascending: true });

        const { data, error } = await query;
        if (error) throw error;
        setViews(data || []);
      } catch (err: any) {
        toast.error("Failed to load analytics");
        setError("Could not load analytics data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchViews();
  }, [id, dateRange]);

  // Stats calculations based on fetched (already filtered) views
  const totalViews = views.length;
  const uniqueUsers = useMemo(() => {
    const set = new Set(views.map(v => v.user_id || v.session_id));
    return set.size;
  }, [views]);
  const avgTimeSpent = useMemo(() => {
    const viewsWithTime = views.filter(
      (v) => v.time_spent_seconds && v.time_spent_seconds > 0
    );
    if (viewsWithTime.length === 0) return 0;
    const total = viewsWithTime.reduce((acc, v) => acc + (v.time_spent_seconds || 0), 0);
    return Math.round(total / viewsWithTime.length);
  }, [views]);

  // Chart data: views by date
  const viewsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    views.forEach(v => {
      const date = v.viewed_at.slice(0, 10);
      map[date] = (map[date] || 0) + 1;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [views]);

  return (
    <div className="min-h-screen bg-background/90 pt-8">
      <div className="container mx-auto max-w-3xl">
        <Button variant="outline" size="sm" className="mb-3" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1" /> Back
        </Button>

        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" />
          Analytics: <span className="ml-1 text-primary">{flipbookTitle}</span>
        </h1>
        <div className="mb-6 text-muted-foreground text-sm">
          Track how your flipbook is performing.
        </div>

        <div className="mb-6">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !dateRange.start && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.start && dateRange.end ? (
                  <>
                    {format(new Date(dateRange.start), "LLL dd, y")} - {format(new Date(dateRange.end), "LLL dd, y")}
                  </>
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{
                  from: dateRange.start ? new Date(dateRange.start) : undefined,
                  to: dateRange.end ? new Date(dateRange.end) : undefined
                }}
                onSelect={(range) => {
                  setDateRange({
                    start: range?.from ? format(range.from, "yyyy-MM-dd") : null,
                    end: range?.to ? format(range.to, "yyyy-MM-dd") : null,
                  });
                }}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          {(dateRange.start || dateRange.end) && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-2"
              onClick={() => setDateRange({ start: null, end: null })}
            >
              Clear
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card className="border-2">
            <CardContent className="pt-6">
              <p className="text-center text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : views.length === 0 ? (
          <Card className="border-2">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No analytics data recorded for this flipbook yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-5 mb-8">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Total Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalViews}</div>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Unique Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{uniqueUsers}</div>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Avg. Time / View (s)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{avgTimeSpent}</div>
                </CardContent>
              </Card>
            </div>
            <Card className="border-2 mb-8">
              <CardHeader>
                <CardTitle>Views Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={viewsByDate} margin={{ top: 24, right: 24, left: 4, bottom: 8 }}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <CartesianGrid strokeDasharray="3 3" />
                    <ReTooltip />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorViews)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;
