import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart2, ArrowLeft } from "lucide-react";
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
  const [views, setViews] = useState<ViewEvent[]>([]);
  const [flipbookTitle, setFlipbookTitle] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });

  // Fetch view data from Supabase
  useEffect(() => {
    const fetchViews = async () => {
      setLoading(true);
      try {
        // Fetch the flipbook title
        const { data: bookData, error: bookErr } = await supabase.from("flipbooks").select("title").eq("id", id).maybeSingle();
        if (bookErr) throw bookErr;
        setFlipbookTitle(bookData?.title || "Flipbook");

        // Fetch views/events
        const { data, error } = await supabase
          .from("flipbook_views")
          .select("*")
          .eq("flipbook_id", id)
          .order("viewed_at", { ascending: true });
        if (error) throw error;
        setViews(data || []);
      } catch (err: any) {
        toast.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchViews();
  }, [id]);

  // Filtered views by date range
  const filteredViews = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return views;
    return views.filter(v => {
      if (dateRange.start && v.viewed_at < dateRange.start) return false;
      if (dateRange.end && v.viewed_at > dateRange.end) return false;
      return true;
    });
  }, [views, dateRange]);

  // Stats cards
  const totalViews = filteredViews.length;
  const uniqueUsers = useMemo(() => {
    const set = new Set(filteredViews.map(v => v.user_id || v.session_id));
    return set.size;
  }, [filteredViews]);
  const avgTimeSpent = useMemo(() => {
    if (filteredViews.length === 0) return 0;
    const total = filteredViews.reduce((acc, v) => acc + (v.time_spent_seconds || 0), 0);
    return Math.round(total / filteredViews.length);
  }, [filteredViews]);

  // Chart data: views by date
  const viewsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    filteredViews.forEach(v => {
      const date = v.viewed_at.slice(0, 10);
      map[date] = (map[date] || 0) + 1;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [filteredViews]);

  return (
    <div className="min-h-screen bg-background/90 pt-8">
      <div className="container mx-auto max-w-3xl">
        <Button asChild variant="outline" size="sm" className="mb-3" onClick={() => navigate(-1)}>
          <Link to="/dashboard">
            <ArrowLeft className="mr-1" /> Dashboard
          </Link>
        </Button>

        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" />
          Analytics: <span className="ml-1 text-primary">{flipbookTitle}</span>
        </h1>
        <div className="mb-6 text-muted-foreground text-sm">
          Track how your flipbook is performing. (GA4 stats shown below are placeholders)
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
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
            {/* Placeholders for more detailed stats */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Advanced Analytics (Google Analytics 4)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground text-sm">
                  For geo, referrer, device, and retention stats, connect your GA4 property and check the GA4 dashboard.<br />
                  (This section can be expanded once the GA4 API fetch is integrated.)
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;
