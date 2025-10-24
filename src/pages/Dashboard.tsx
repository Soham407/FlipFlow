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
    try {
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading user role:', error);
        setUserRole('free'); // Default to free on error
        return;
      }

      if (roleData) {
        setUserRole(roleData.role);
      } else {
        // No role found, create a default free role
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert([{ user_id: session?.user?.id, role: 'free' }]);
        
        if (insertError) {
          console.error('Error creating user role:', insertError);
        }
        setUserRole('free');
      }
    } catch (error) {
      console.error('Error loading user role:', error);
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
      setFlipbooks(data || []);
    } catch (error: any) {
      toast.error("Failed to load flipbooks");
    } finally {
      setLoading(false);
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
        .insert([{ title, file_path: fileName, user_id: session.user.id, file_size: file.size }]);

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
        description: "Pro Subscription - ₹100/year",
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              FlipFlow
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={userRole === 'pro' ? 'default' : 'secondary'} className="gap-1">
                {userRole === 'pro' && <Crown className="h-3 w-3" />}
                {userRole === 'pro' ? 'Pro' : 'Free'} Plan
              </Badge>
              <span className="text-sm text-muted-foreground">
                {userRole === 'free' ? `${flipbooks.length}/3 flipbooks` : 'Unlimited flipbooks'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {userRole === 'free' && (
              <Button onClick={handleUpgradeToPro} disabled={processingPayment} className="gap-2">
                {processingPayment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crown className="h-4 w-4" />
                )}
                Upgrade to Pro - ₹100/year
              </Button>
            )}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Flipbook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload New Flipbook</DialogTitle>
                  <DialogDescription>Upload a PDF file to create a new flipbook</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpload}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        placeholder="My Awesome Flipbook"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="file">PDF File</Label>
                      <Input
                        id="file"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <Button type="submit" disabled={uploading} className="w-full">
                      {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Flipbook
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Your Flipbooks</h2>
          {flipbooks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No flipbooks yet. Upload your first PDF to get started!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {flipbooks.map((flipbook) => (
                <Card key={flipbook.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {flipbook.title}
                    </CardTitle>
                    <CardDescription>
                      {new Date(flipbook.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/view/${flipbook.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
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
