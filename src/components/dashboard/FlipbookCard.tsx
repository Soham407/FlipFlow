import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MoreVertical,
  Trash,
  ExternalLink,
  Copy,
  FileText,
  Eye,
  BarChart2,
  Lock,
  Unlock,
  FileWarning,
  Pencil,
  Loader2,
  Crown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Flipbook } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { usePdfThumbnail } from "@/hooks/usePdfThumbnail";
import { Badge } from "@/components/ui/badge";
import { QRCodeModal } from "./QRCodeModal";
import { QrCode } from "lucide-react";

interface FlipbookCardProps {
  flipbook: Flipbook;
  onDelete: (id: string) => void;
  onCopyEmbed: (flipbook: Flipbook) => void;
  onUpdate: () => void;
  onRename: (id: string, newTitle: string) => Promise<any>;
  onUpgrade?: () => void;
}

export function FlipbookCard({
  flipbook,
  onDelete,
  onCopyEmbed,
  onUpdate,
  onRename,
  onUpgrade,
}: FlipbookCardProps) {
  const navigate = useNavigate();
  const [isRenaming, setIsRenaming] = useState(false);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [newTitle, setNewTitle] = useState(flipbook.title);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const identifier = flipbook.slug || flipbook.id;
  const isPermanentlyLocked =
    flipbook.is_locked &&
    (flipbook.lock_reason === "size_limit" ||
      flipbook.lock_reason === "plan_limit");

  // Generate thumbnail from PDF first page
  const { thumbnailUrl, loading: thumbLoading } = usePdfThumbnail(
    flipbook.pdf_storage_path,
    !flipbook.is_locked // Only generate thumbnails for unlocked flipbooks
  );

  const handleToggleLock = async () => {
    try {
      const { error } = await supabase.rpc("toggle_flipbook_lock", {
        flipbook_id: flipbook.id,
      });

      if (error) {
        toast.error(error.message); // Will show "Plan limit reached..."
        return;
      }

      onUpdate(); // Refresh the list
      toast.success(
        flipbook.is_locked ? "Flipbook unlocked!" : "Flipbook locked"
      );
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleRename = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim() || newTitle === flipbook.title) {
      setIsRenaming(false);
      setIsEditingInline(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onRename(flipbook.id, newTitle.trim());
      setIsRenaming(false);
      setIsEditingInline(false);
      toast.success("Title updated successfully");
    } catch (error) {
      // toast.error is handled in the hook
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Card
        className={`group relative overflow-hidden transition-all hover:shadow-md border-4 ${
          isPermanentlyLocked
            ? "border-destructive/50 dark:border-destructive/50 opacity-75 border-dashed"
            : flipbook.is_locked
            ? "border-dashed border-border dark:border-white/20 opacity-75"
            : "border-border dark:border-white/20"
        }`}
      >
        {/* Locked Overlay */}
        {flipbook.is_locked && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg p-4 text-center"
            role="alert"
            aria-live="polite"
          >
            {isPermanentlyLocked ? (
              <FileWarning
                className="w-8 h-8 mb-2 text-destructive"
                aria-hidden="true"
              />
            ) : (
              <Lock
                className="w-8 h-8 mb-2 text-muted-foreground"
                aria-hidden="true"
              />
            )}

            {/* Quick Actions for Locked Cards */}
            <div className="absolute top-2 right-2 flex gap-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8 rounded-full shadow-lg"
                onClick={() => onDelete(flipbook.id)}
                title="Delete permanently locked flipbook"
              >
                <Trash className="h-4 w-4" />
              </Button>
              {onUpgrade && (
                <Button
                  variant="default"
                  size="icon"
                  className="h-8 w-8 rounded-full shadow-lg bg-primary hover:bg-primary/90"
                  onClick={onUpgrade}
                  title="Upgrade to unlock"
                >
                  <Crown className="h-4 w-4" />
                </Button>
              )}
            </div>

            <p
              className={`font-medium ${
                isPermanentlyLocked ? "text-destructive" : ""
              }`}
            >
              {isPermanentlyLocked ? "Permanently Locked" : "Locked"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {flipbook.lock_reason === "size_limit"
                ? "File too large for current plan"
                : flipbook.lock_reason === "user_locked"
                ? "Manually locked to free up space"
                : "Plan limit reached - Lock other books to unlock this one"}
            </p>

            {/* Only show Unlock for manual user locks */}
            {flipbook.is_locked && flipbook.lock_reason === "user_locked" && (
              <Button
                onClick={handleToggleLock}
                size="sm"
                variant="outline"
                aria-label={`Unlock ${flipbook.title}`}
              >
                <Unlock className="w-4 h-4 mr-2" aria-hidden="true" />
                Unlock
              </Button>
            )}
          </div>
        )}

        {/* Thumbnail Container */}
        <div className="h-48 w-full bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center border-b overflow-hidden">
          {thumbLoading ? (
            <div
              className="text-center p-4"
              role="status"
              aria-label="Loading thumbnail"
            >
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"
                aria-hidden="true"
              ></div>
              <p className="text-xs text-muted-foreground">
                Loading thumbnail...
              </p>
            </div>
          ) : thumbnailUrl ? (
            <div className="relative w-full h-full p-6 flex items-center justify-center [perspective:1000px] group-hover:p-4 transition-all duration-500">
              {/* Back Page Shadow Peek */}
              <div className="absolute inset-x-12 inset-y-10 bg-muted-foreground/20 rounded-sm translate-x-1 -translate-y-1 group-hover:translate-x-3 group-hover:-translate-y-3 transition-transform duration-500" />
              <div className="absolute inset-x-10 inset-y-8 bg-muted-foreground/10 rounded-sm translate-x-0.5 -translate-y-0.5 group-hover:translate-x-1.5 group-hover:-translate-y-1.5 transition-transform duration-500" />

              <img
                src={thumbnailUrl}
                alt={`${flipbook.title} thumbnail`}
                className="relative z-10 w-full h-full object-contain shadow-md rounded-sm transition-all duration-500 group-hover:[transform:rotateY(-20deg)_rotateX(5deg)] group-hover:shadow-2xl"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="text-center p-4 group-hover:scale-105 transition-transform duration-300">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Interactive PDF
              </p>
            </div>
          )}

          {/* View Count Badge - Feature 1.2 */}
          {!flipbook.is_locked && (
            <Badge
              variant="secondary"
              className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm border-white/20 shadow-sm"
            >
              <Eye className="h-3 w-3 mr-1" />
              {flipbook.view_count || 0}
            </Badge>
          )}
        </div>

        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            {isEditingInline ? (
              <form
                className="flex-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRename();
                }}
              >
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={() => {
                    if (newTitle === flipbook.title) setIsEditingInline(false);
                    else handleRename(); // Save on blur if title changed
                  }}
                  className="h-7 py-0 px-2 text-sm font-semibold"
                  autoFocus
                />
              </form>
            ) : (
              <CardTitle
                className="text-lg font-semibold leading-tight truncate cursor-text hover:text-primary transition-colors"
                title="Double-click to rename"
                onDoubleClick={() => {
                  setNewTitle(flipbook.title); // Initialize newTitle with current title
                  setIsEditingInline(true);
                }}
              >
                {flipbook.title}
              </CardTitle>
            )}

            <div className="flex items-center gap-1">
              {/* Add a Lock button to the actions menu for active cards */}
              {!flipbook.is_locked && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={handleToggleLock}
                  aria-label="Lock flipbook to free up space"
                >
                  <Lock className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -mr-2 text-muted-foreground"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => navigate(`/analytics/${flipbook.id}`)}
                  >
                    <BarChart2 className="mr-2 h-4 w-4" /> View Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                    <Pencil className="mr-2 h-4 w-4" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCopyEmbed(flipbook)}>
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Copy Embed Link</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsQRModalOpen(true)}>
                    <QrCode className="mr-2 h-4 w-4" />
                    <span>Share via QR</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href={`/view/${identifier}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" /> Open Public Link
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(flipbook.id)}
                  >
                    <Trash className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <p className="text-xs text-muted-foreground">
            Created {formatDistanceToNow(new Date(flipbook.created_at))} ago
          </p>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          <Button asChild className="w-full" variant="outline">
            <Link to={`/view/${identifier}`}>
              <Eye className="mr-2 h-4 w-4" /> View Flipbook
            </Link>
          </Button>
        </CardFooter>

        {/* Rename Dialog */}
        <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Flipbook</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRename}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-title">New Title</Label>
                  <Input
                    id="new-title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Enter new title"
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsRenaming(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Card>

      <QRCodeModal
        open={isQRModalOpen}
        onOpenChange={setIsQRModalOpen}
        title={flipbook.title}
        url={`${window.location.origin}/view/${flipbook.slug || flipbook.id}`}
      />
    </>
  );
}
