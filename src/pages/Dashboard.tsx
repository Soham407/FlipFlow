import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Upload, Plus, Crown, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Session } from "@supabase/supabase-js";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { FlipbookCard } from "@/components/dashboard/FlipbookCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { PricingModal } from "@/components/dashboard/PricingModal";
import { toast } from "sonner";
import { ModeToggle } from "@/components/mode-toggle";

// Hooks & Types
import { useFlipbooks } from "@/hooks/useFlipbooks";
import { useFileUpload } from "@/hooks/useFileUpload";

import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { PLANS } from "@/config/constants";
import type { Flipbook } from "@/types";

const Dashboard = () => {
  const navigate = useNavigate();

  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  // 2. Custom Hooks (Business Logic)

  const {
    flipbooks,
    loading: loadingFlipbooks,
    deleteFlipbook,
    updateFlipbook,
    refetch: refetchFlipbooks,
  } = useFlipbooks(user?.id);

  const { userRole, profile, processingPayment, subscribeToPlan } =
    useSubscription(user?.id);

  const {
    file,
    title,
    setTitle,
    uploading,
    isDragging,
    setIsDragging,
    handleFileSelect,
    uploadFlipbook,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useFileUpload(userRole, user?.id, () => {
    setIsModalOpen(false); // Close modal on success
    refetchFlipbooks(); // Refresh list
  });

  // 3. Event Handlers

  const handleUploadClick = async (e: React.FormEvent) => {
    e.preventDefault();
    // Pass current count to validator
    await uploadFlipbook(flipbooks.length);
  };

  const handleCopyEmbed = async (flipbook: Flipbook) => {
    try {
      const slugOrId = flipbook.slug || flipbook.id;
      const base = window.location.origin;
      const url = `${base}/view/${slugOrId}`;
      const iframe = `<iframe src="${url}" style="width:100%;height:600px;border:0;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;

      await navigator.clipboard.writeText(iframe);
      toast.success("Embed code copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy embed code");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleSelectPlan = async (planId: string) => {
    await subscribeToPlan(planId, user?.email);
    setIsPricingModalOpen(false);
  };

  if (loadingFlipbooks) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img
                src="/Images/FF Logo.png"
                alt="FlipFlow"
                className="h-10 w-10 sm:h-12 sm:w-12"
              />
              <div>
                <h1 className="text-xl font-bold">FlipFlow</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={userRole === "free" ? "secondary" : "default"}
                className="gap-1 hidden sm:flex"
              >
                {userRole !== "free" && <Crown className="h-3 w-3" />}
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Plan
              </Badge>
              {userRole === "free" && (
                <Button
                  onClick={() => setIsPricingModalOpen(true)}
                  disabled={processingPayment}
                  size="sm"
                  className="gap-1.5"
                >
                  {processingPayment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Crown className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Upgrade Plan</span>
                  <span className="sm:hidden">Upgrade</span>
                </Button>
              )}

              <ModeToggle />

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative h-9 w-9 rounded-full p-0"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={
                          profile?.avatar_url ||
                          user?.user_metadata?.avatar_url ||
                          undefined
                        }
                        alt={profile?.full_name || user?.email || "User"}
                      />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.full_name ||
                          user?.user_metadata?.name ||
                          "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <StatsCards flipbooksCount={flipbooks.length} userRole={userRole} />

        {/* Main Content */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Your Flipbooks</h2>
              <p className="text-muted-foreground mt-1">
                {flipbooks.length === 0
                  ? "Create your first flipbook to get started"
                  : `Managing ${flipbooks.length} flipbook${
                      flipbooks.length !== 1 ? "s" : ""
                    }`}
              </p>
            </div>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create New Flipbook</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload New Flipbook</DialogTitle>
                  <DialogDescription>
                    Upload a PDF file to create a new flipbook.
                    {(() => {
                      const planKey =
                        userRole.toUpperCase() as keyof typeof PLANS;
                      const plan = PLANS[planKey] || PLANS.FREE;
                      const remaining = plan.maxFlipbooks - flipbooks.length;
                      return plan.maxFlipbooks !== Infinity && remaining > 0
                        ? ` (${remaining} upload${
                            remaining !== 1 ? "s" : ""
                          } remaining)`
                        : "";
                    })()}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUploadClick}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="file">PDF File</Label>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`
                          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
                          ${
                            isDragging
                              ? "border-primary bg-primary/5"
                              : "border-muted-foreground/25"
                          }
                          ${file ? "bg-muted/50" : ""}
                        `}
                      >
                        <Input
                          id="file"
                          type="file"
                          accept=".pdf"
                          onChange={(e) =>
                            handleFileSelect(e.target.files?.[0] || null)
                          }
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          aria-describedby="file-description"
                          aria-invalid={
                            !!(file && file.size > 2 * 1024 * 1024 * 10)
                          } // Example simple check, actual logic is in hook
                        />
                        <div
                          className="pointer-events-none"
                          id="file-description"
                        >
                          <Upload
                            className="h-10 w-10 mx-auto mb-3 text-muted-foreground"
                            aria-hidden="true"
                          />
                          {file ? (
                            <div>
                              <p className="font-medium text-foreground">
                                {file.name}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium text-foreground">
                                Drop your PDF here or click to browse
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Maximum file size:{" "}
                                {(() => {
                                  const planKey =
                                    userRole.toUpperCase() as keyof typeof PLANS;
                                  const plan = PLANS[planKey] || PLANS.FREE;
                                  return `${plan.maxFileSizeMB}MB`;
                                })()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        placeholder="My Awesome Flipbook"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        aria-describedby="title-hint"
                      />
                      <p
                        className="text-xs text-muted-foreground"
                        id="title-hint"
                      >
                        Auto-filled from PDF name, edit if needed
                      </p>
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <Button
                      type="submit"
                      disabled={uploading}
                      className="w-full"
                    >
                      {uploading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? "Uploading..." : "Upload Flipbook"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {flipbooks.length === 0 ? (
            <EmptyState onCreateClick={() => setIsModalOpen(true)} />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {flipbooks.map((flipbook) => (
                <FlipbookCard
                  key={flipbook.id}
                  flipbook={flipbook}
                  onDelete={(id) => deleteFlipbook(id)}
                  onCopyEmbed={handleCopyEmbed}
                  onUpdate={refetchFlipbooks}
                  onRename={(id, title) => updateFlipbook(id, { title })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pricing Modal */}
      <PricingModal
        open={isPricingModalOpen}
        onOpenChange={setIsPricingModalOpen}
        onSelectPlan={handleSelectPlan}
        processingPayment={processingPayment}
        currentPlan={userRole}
      />
    </div>
  );
};

export default Dashboard;
