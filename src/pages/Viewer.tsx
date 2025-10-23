import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Flipbook {
  id: string;
  title: string;
  file_path: string;
}

const Viewer = () => {
  const { id } = useParams();
  const [flipbook, setFlipbook] = useState<Flipbook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlipbook = async () => {
      try {
        const { data, error } = await supabase
          .from("flipbooks")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setFlipbook(data);
      } catch (error: any) {
        toast.error("Failed to load flipbook");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFlipbook();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!flipbook) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Flipbook not found</p>
            <Button asChild className="mt-4">
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="container mx-auto py-8">
        <Button asChild variant="outline" className="mb-4">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{flipbook.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border-2 border-dashed border-muted p-12 text-center">
              <p className="text-muted-foreground">
                PDF viewer will be implemented here. File: {flipbook.file_path}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Viewer;
