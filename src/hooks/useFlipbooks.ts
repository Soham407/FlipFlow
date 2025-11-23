import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flipbook } from "../types";
import { toast } from "sonner";

export function useFlipbooks(userId: string | undefined) {
  const [flipbooks, setFlipbooks] = useState<Flipbook[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlipbooks = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from("flipbooks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFlipbooks((data as unknown as Flipbook[]) || []);
    } catch (error) {
      console.error("Error fetching flipbooks:", error);
      toast.error("Failed to load flipbooks");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFlipbooks();
  }, [fetchFlipbooks]);

  const deleteFlipbook = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-from-r2', {
        body: { flipbookId: id },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Delete failed');

      toast.success("Flipbook deleted successfully!");
      await fetchFlipbooks(); // Refresh list
      
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || "Failed to delete flipbook");
    }
  };

  return { 
    flipbooks, 
    loading, 
    refetch: fetchFlipbooks, 
    deleteFlipbook 
  };
}
