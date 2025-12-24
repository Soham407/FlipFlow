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

      // Sort unlocked flipbooks to the top, then by created_at descending
      const sortedData = ((data as unknown as Flipbook[]) || []).sort(
        (a, b) => {
          // 1. Active (Unlocked) first
          // Treat undefined/null as false (unlocked)
          const aLocked = !!a.is_locked;
          const bLocked = !!b.is_locked;

          if (aLocked !== bLocked) {
            return aLocked ? 1 : -1;
          }

          // 2. If both locked, prioritize those that CAN be unlocked
          if (aLocked && bLocked) {
            const aUnlockable = a.lock_reason !== "size_limit";
            const bUnlockable = b.lock_reason !== "size_limit";
            if (aUnlockable !== bUnlockable) {
              return aUnlockable ? -1 : 1; // Unlockable first
            }
          }

          // 3. Sort by created_at descending (newest first)
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
      );

      setFlipbooks(sortedData);
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
      const { data, error } = await supabase.functions.invoke(
        "delete-from-r2",
        {
          body: { flipbookId: id },
        }
      );

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Delete failed");

      toast.success("Flipbook deleted successfully!");
      await fetchFlipbooks(); // Refresh list
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete flipbook";
      console.error("Delete error:", error);
      toast.error(errorMessage);
    }
  };

  return {
    flipbooks,
    loading,
    refetch: fetchFlipbooks,
    deleteFlipbook,
  };
}
