import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Flipbook } from "../types";
import { toast } from "sonner";

export function useFlipbooks(userId: string | undefined) {
  const [flipbooks, setFlipbooks] = useState<Flipbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchFlipbooks = useCallback(
    async (isMounted: { current: boolean } = { current: true }) => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from("flipbooks")
          .select("*, flipbook_views(count)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!isMounted.current) return;

        // Map and Sort unlocked flipbooks to the top, then by created_at descending
        const mappedData = (data || []).map((fb: any) => ({
          ...fb,
          view_count: fb.flipbook_views?.[0]?.count || 0,
        })) as Flipbook[];

        const sortedData = mappedData.sort((a, b) => {
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
        });

        setFlipbooks(sortedData);
      } catch (error) {
        if (isMounted.current) {
          console.error("Error fetching flipbooks:", error);
          toast.error("Failed to load flipbooks");
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    const isMounted = { current: true };
    fetchFlipbooks(isMounted);
    return () => {
      isMounted.current = false;
    };
  }, [fetchFlipbooks]);

  const deleteFlipbook = async (id: string, skipUndo = false) => {
    if (!skipUndo) {
      setPendingDeleteId(id);

      toast("Flipbook deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            setPendingDeleteId(null);
          },
        },
        duration: 5000,
        onAutoClose: async (t) => {
          // If still pending, proceed with actual deletion
          setPendingDeleteId((current) => {
            if (current === id) {
              // We can't await here easily in onAutoClose if we want to return immediately
              // but we can fire and forget the actual delete
              performActualDelete(id);
              return null;
            }
            return current;
          });
        },
      });
      return;
    }

    await performActualDelete(id);
  };

  const performActualDelete = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "delete-from-r2",
        {
          body: { flipbookId: id },
        }
      );

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Delete failed");

      // No need for "Success" toast here as the undo toast would have closed
      await fetchFlipbooks({ current: true }); // Refresh list
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete flipbook";
      console.error("Delete error:", error);
      toast.error(errorMessage);
    }
  };

  const updateFlipbook = async (id: string, updates: Partial<Flipbook>) => {
    try {
      const { error } = await supabase
        .from("flipbooks")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      await fetchFlipbooks({ current: true });
      return { success: true };
    } catch (error) {
      console.error("Update error:", error);
      let errorMessage = "Failed to update flipbook";
      if (error instanceof Error) {
        if (error.message.includes("policy")) {
          errorMessage = "You don't have permission to update this flipbook.";
        } else {
          errorMessage = error.message;
        }
      }
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  return {
    flipbooks: flipbooks.filter((f) => f.id !== pendingDeleteId),
    loading,
    refetch: fetchFlipbooks,
    deleteFlipbook,
    updateFlipbook,
  };
}
