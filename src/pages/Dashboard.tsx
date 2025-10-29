import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Upload, FileText, Eye, Trash2, LogOut, Plus, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Session } from "@supabase/supabase-js";

interface Flipbook {
  id: string;
  title: string;
  file_path: string;
  created_at: string;
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
    }
  }, [session]);

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
    if (!file || !session) return;

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
      const fileExt = file.name.split(".").pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("user_pdfs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("flipbooks")
        .insert({ title, file_path: fileName, user_id: session.user.id, file_size: file.size });

      if (dbError) throw dbError;

      toast.success("Flipbook uploaded successfully!");
      setTitle("");
      setFile(null);
      setIsModalOpen(false);
      fetchFlipbooks();
      fetchUserRole();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload flipbook");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from("user_pdfs")
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("flipbooks")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      toast.success("Flipbook deleted successfully!");
      fetchFlipbooks();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete flipbook");
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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Flipbooks</p>
                  <p className="text-3xl font-bold mt-1">{flipbooks.length}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plan Status</p>
                  <p className="text-3xl font-bold mt-1 capitalize">{userRole}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {userRole === 'free' ? 'Remaining' : 'Capacity'}
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {userRole === 'free' ? `${3 - flipbooks.length}` : '∞'}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                          required
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
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-accent/10 mb-4">
                  <FileText className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No flipbooks yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Upload your first PDF to create a beautiful, interactive flipbook in seconds.
                </p>
                <Button onClick={() => setIsModalOpen(true)} size="lg" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Flipbook
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {flipbooks.map((flipbook) => (
                <Card key={flipbook.id} className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="inline-flex p-2 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {new Date(flipbook.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                    <CardTitle className="line-clamp-2 mt-3 group-hover:text-primary transition-colors">
                      {flipbook.title}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="flex gap-2 pt-0">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => navigate(`/view/${flipbook.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDelete(flipbook.id, flipbook.file_path)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
