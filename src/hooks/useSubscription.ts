import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserRole, Profile } from "../types";
import { PAYMENT } from "../config/constants";

export function useSubscription(userId: string | undefined) {
  const [userRole, setUserRole] = useState<UserRole>('free');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserRole();
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (data) setProfile(data as unknown as Profile);
  };

  const fetchUserRole = async () => {
    if (!userId) return;
    
    // Check user_roles table
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (roleData) {
      setUserRole(roleData.role as UserRole);
    } else {
      // Default to free if no record
      setUserRole('free');
    }
  };

  const initializeRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = PAYMENT.RAZORPAY_SCRIPT_URL;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const upgradeToPro = async (userEmail: string | undefined) => {
    setProcessingPayment(true);
    try {
      const res = await initializeRazorpay();
      if (!res) {
        toast.error("Failed to load payment gateway");
        return;
      }

      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order');
      if (orderError) throw orderError;

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "FlipFlow",
        description: "Pro Subscription",
        order_id: orderData.orderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const { error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });

            if (verifyError) throw verifyError;
            toast.success("Welcome to FlipFlow Pro! 🎉");
            fetchUserRole(); // Refresh role
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Payment verification failed";
            toast.error(errorMessage);
          }
        },
        prefill: { email: userEmail || "" },
        theme: { color: "#3b82f6" },
      };

      const paymentObject = new (window as unknown as { Razorpay: new (options: unknown) => { open: () => void } }).Razorpay(options);
      paymentObject.open();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Payment failed";
      toast.error(error.message || "Failed to initiate payment");
    } finally {
      setProcessingPayment(false);
    }
  };

  return { userRole, profile, processingPayment, upgradeToPro };
}
