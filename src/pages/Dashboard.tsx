import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
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

interface Flipbook {
  id: string;
  title: string;
  file_path: string;
  created_at: string;
  slug?: string;
  is_public?: boolean;
}

const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [flipbooks, setFlipbooks] = useState<Flipbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<'free' | 'pro'>('free');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/login");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session) {
      fetchFlipbooks();
      fetchUserRole();
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching profile:", error);
        return;
      }

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    }
  };

  const fetchUserRole = async () => {
    if (!session?.user?.id) {
      console.log('No session user ID available');
      setUserRole('free');
      return;
    }

    try {
      console.log('Fetching user role for user:', session.user.id);
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading user role:', error);
        setUserRole('free');
        return;
      }

      if (roleData) {
        console.log('User role found:', roleData.role);
        setUserRole(roleData.role as 'free' | 'pro');
      } else {
        console.log('No role found, creating default free role');
        // No role found, create a default free role
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: session.user.id, role: 'free' });
        
        if (insertError) {
          console.error('Error creating user role:', insertError);
          console.error('Insert error details:', JSON.stringify(insertError));
        } else {
          console.log('Successfully created free role');
        }
        setUserRole('free');
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setUserRole('free');
    }
  };

  const fetchFlipbooks = async () => {
    try {
      const { data, error } = await supabase
        .from("flipbooks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFlipbooks((data as any) || []);
    } catch (error: any) {
      toast.error("Failed to load flipbooks");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-populate title from filename (without extension)
      const fileNameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(fileNameWithoutExt);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      handleFileSelect(droppedFile);
    } else {
      toast.error("Please drop a PDF file");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    
    if (!session) return;

    // Check flipbook limit
    const maxFlipbooks = userRole === 'pro' ? Infinity : 3;
    if (flipbooks.length >= maxFlipbooks) {
      toast.error(`Free users can only create ${maxFlipbooks} flipbooks. Upgrade to Pro for unlimited flipbooks!`);
      return;
    }

    // Check file size
    const maxFileSize = userRole === 'pro' ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB pro, 10MB free
    if (file.size > maxFileSize) {
      toast.error(`Maximum file size is ${userRole === 'pro' ? '50MB' : '10MB'}. ${userRole === 'free' ? 'Upgrade to Pro for 50MB limit!' : ''}`);
      return;
    }

    setUploading(true);
    try {
      // Use the R2 upload edge function
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('fileSize', file.size.toString());

      const { data, error } = await supabase.functions.invoke('upload-to-r2', {
        body: formData,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Upload failed');

      toast.success("Flipbook uploaded successfully!");
      setTitle("");
      setFile(null);
      setIsModalOpen(false);
      fetchFlipbooks();
      fetchUserRole();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || "Failed to upload flipbook");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    try {
      // Use the R2 delete edge function
      const { data, error } = await supabase.functions.invoke('delete-from-r2', {
        body: { flipbookId: id },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Delete failed');

      toast.success("Flipbook deleted successfully!");
      fetchFlipbooks();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || "Failed to delete flipbook");
    }
  };

  const handleCopyEmbed = async (flipbook: Flipbook) => {
    try {
      // Ensure flipbook is public for embedding
      if (!flipbook.is_public) {
        const { error } = await supabase
          .from('flipbooks')
          .update({ is_public: true } as any)
          .eq('id', flipbook.id);
        
        if (error) throw error;
        
        // Update local state
        setFlipbooks(prev => prev.map(f => 
          f.id === flipbook.id ? { ...f, is_public: true } : f
        ));
      }

      const slugOrId = flipbook.slug || flipbook.id;
      const base = window.location.origin;
      const url = `${base}/view/${slugOrId}`;
      const iframe = `<iframe src="${url}" style="width:100%;height:600px;border:0;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      
      await navigator.clipboard.writeText(iframe);
      toast.success("Embed code copied to clipboard!");
    } catch (error: any) {
      toast.error(error.message || "Failed to copy embed code");
    }
  };

  const initializeRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgradeToPro = async () => {
    setProcessingPayment(true);
    try {
      const res = await initializeRazorpay();
      if (!res) {
        toast.error("Failed to load payment gateway");
        return;
      }

      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order'
      );

      if (orderError) throw orderError;

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "FlipFlow",
        description: "Pro Subscription - ₹100/month",
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            const { error: verifyError } = await supabase.functions.invoke(
              'verify-razorpay-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              }
            );

            if (verifyError) throw verifyError;

            toast.success("Welcome to FlipFlow Pro! 🎉");
            fetchUserRole();
          } catch (error: any) {
            toast.error(error.message || "Payment verification failed");
          }
        },
        prefill: {
          email: session?.user?.email || "",
        },
        theme: {
          color: "#3b82f6",
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate payment");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/Images/FF Logo.png" alt="FlipFlow" className="h-10 w-10 sm:h-12 sm:w-12" />
              <div>
                <h1 className="text-xl font-bold">FlipFlow</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={userRole === 'pro' ? 'default' : 'secondary'} className="gap-1 hidden sm:flex">
                {userRole === 'pro' && <Crown className="h-3 w-3" />}
                {userRole === 'pro' ? 'Pro' : 'Free'} Plan
              </Badge>
              {userRole === 'free' && (
                <Button onClick={handleUpgradeToPro} disabled={processingPayment} size="sm" className="gap-1.5">
                  {processingPayment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Crown className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Upgrade to Pro</span>
                  <span className="sm:hidden">Pro</span>
                </Button>
              )}
              
              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative h-9 w-9 rounded-full p-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage 
                        src={profile?.avatar_url || session?.user?.user_metadata?.avatar_url || undefined} 
                        alt={profile?.full_name || session?.user?.email || "User"} 
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
                        {profile?.full_name || session?.user?.user_metadata?.name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session?.user?.email}
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
                  : `Managing ${flipbooks.length} flipbook${flipbooks.length !== 1 ? 's' : ''}`
                }
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
                    {userRole === 'free' && ` (${3 - flipbooks.length} uploads remaining)`}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpload}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="file">PDF File</Label>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`
                          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
                          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                          ${file ? 'bg-muted/50' : ''}
                        `}
                      >
                        <Input
                          id="file"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="pointer-events-none">
                          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                          {file ? (
                            <div>
                              <p className="font-medium text-foreground">{file.name}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium text-foreground">Drop your PDF here or click to browse</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Maximum file size: {userRole === 'pro' ? '50MB' : '10MB'}
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
                      />
                      <p className="text-xs text-muted-foreground">
                        Auto-filled from PDF name, edit if needed
                      </p>
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <Button type="submit" disabled={uploading} className="w-full">
                      {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? 'Uploading...' : 'Upload Flipbook'}
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
                  onDelete={handleDelete}
                  onCopyEmbed={handleCopyEmbed}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
