import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Share2 } from "lucide-react";
import { toast } from "sonner";
import { trackFlipbookView, trackTimeSpent } from "@/lib/analytics";
import { getR2PublicUrl } from "@/lib/r2";
import ViewerToolbar from "../components/ViewerToolbar";
import { useIsMobile } from "@/hooks/use-mobile";
import { DflipViewer } from "@/components/DflipViewer";
import type { Flipbook } from "@/types";

const Viewer = () => {
  const { id } = useParams();
  const isMobile = useIsMobile();
  const [flipbook, setFlipbook] = useState<Flipbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const viewIdRef = useRef<string | null>(null);
  const viewStartTimeRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const fetchFlipbook = async () => {
      try {
        const routeParam = (id as string) || "";
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeParam);
        const { data, error } = await supabase.from("flipbooks").select("*").eq(isUuid ? "id" : "slug", routeParam).maybeSingle();
        if (error) throw error;
        if (data) setFlipbook(data as any);
      } catch (error) {
        toast.error("Failed to load flipbook");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchFlipbook();
  }, [id]);

  useEffect(() => {
    if (flipbook?.file_path) {
      try {
        setPublicUrl(getR2PublicUrl(flipbook.file_path));
      } catch (error) {
        toast.error("Failed to load PDF");
      }
    }
  }, [flipbook]);

  useEffect(() => {
    const trackView = async () => {
      if (!flipbook?.id || viewIdRef.current) return;
      viewStartTimeRef.current = Date.now();
      try {
        const { data: viewId } = await supabase.rpc('track_flipbook_view', {
          _flipbook_id: flipbook.id,
          _session_id: sessionIdRef.current,
          _user_agent: navigator.userAgent,
          _ip_address: null,
        });
        viewIdRef.current = viewId;
        trackFlipbookView(flipbook.id, flipbook.title);
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    };
    if (flipbook && publicUrl) trackView();
  }, [flipbook, publicUrl]);

  useEffect(() => {
    const updateTime = async () => {
      if (viewIdRef.current) {
        const time = Math.floor((Date.now() - viewStartTimeRef.current) / 1000);
        if (time > 0) await supabase.rpc('update_view_time_spent', { _view_id: viewIdRef.current, _time_spent_seconds: time });
      }
    };
    window.addEventListener('beforeunload', updateTime);
    return () => {
      window.removeEventListener('beforeunload', updateTime);
      updateTime();
    };
  }, [flipbook]);

  if (loading || !flipbook || !publicUrl) {
    return <div className="flex min-h-screen items-center justify-center"><Card><CardContent className="py-8"><p className="text-muted-foreground">Loading...</p></CardContent></Card></div>;
  }

  const readingPercent = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;

  return (
    <div className="flex flex-col h-screen relative">
      {/* Desktop Header */}
      {!isMobile && (
        <header className="flex items-center justify-between px-4 py-3 bg-background border-b z-30">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-2" />Dashboard</Link></Button>
            <h1 className="text-lg font-semibold truncate max-w-[40vw]">{flipbook.title}</h1>
          </div>
          <Button variant="outline" size="sm" onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/view/${flipbook.slug || flipbook.id}`); toast.success("Link copied!"); }}>
            <Share2 className="h-4 w-4 mr-2" />Share
          </Button>
        </header>
      )}

      {/* Floating Back Button (Mobile) */}
      {isMobile && (
        <Button asChild variant="ghost" size="icon" className="fixed top-4 left-4 z-50 rounded-full bg-background/60 backdrop-blur-md shadow-sm border border-border/40">
          <Link to="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
      )}

      {/* Unified Toolbar */}
      <ViewerToolbar pdfUrl={publicUrl} />

      <main className="flex-1 overflow-hidden">
        <DflipViewer
          pdfUrl={publicUrl}
          flipbookId={flipbook.id}
          onProgress={() => {}}
          onReady={() => {}}
          onPageChange={(current, total) => {
            setCurrentPage(current);
            setTotalPages(total);
          }}
        />
      </main>

      {/* Reading Progress Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-[3px] bg-muted/30 z-40">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${readingPercent}%` }}
        />
      </div>
    </div>
  );
};

export default Viewer;
