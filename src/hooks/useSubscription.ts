import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserRole, Profile } from "../types";
import { PAYMENT } from "../config/constants";

export function useSubscription(userId: string | undefined) {
  const [userRole, setUserRole] = useState<UserRole>("free");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (userId) {
        await Promise.all([fetchUserRole(isMounted), fetchProfile(isMounted)]);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchProfile = async (isMounted: boolean) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        // Ignore no rows found
        console.error("Error fetching profile:", error);
      }

      if (isMounted && data) {
        setProfile(data as unknown as Profile);
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
    }
  };

  const fetchUserRole = async (isMounted: boolean) => {
    if (!userId) return;

    try {
      // Check user_roles table
      const { data: roleData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .order("role", { ascending: true }) // We need to handle this with a manual sort or proper DB priority if we can't assume order
        .then((res) => {
          if (res.data && res.data.length > 0) {
            // Priority: pro > business > hobby > starter > free
            const priorityMap: Record<string, number> = {
              pro: 1,
              business: 2,
              hobby: 3,
              starter: 4,
              free: 5,
            };
            const sorted = res.data.sort(
              (a, b) =>
                (priorityMap[a.role] || 99) - (priorityMap[b.role] || 99)
            );
            return { data: sorted[0], error: res.error };
          }
          return res;
        });

      if (error) {
        console.error("Error fetching user role:", error);
      }

      if (isMounted) {
        if (roleData) {
          setUserRole(roleData.role as UserRole);
        } else {
          // Default to free if no record
          setUserRole("free");
        }
      }
    } catch (error) {
      console.error("Role fetch error:", error);
      if (isMounted) setUserRole("free");
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

  const subscribeToPlan = async (
    planId: string,
    userEmail: string | undefined
  ) => {
    setProcessingPayment(true);
    try {
      const res = await initializeRazorpay();
      if (!res) {
        toast.error("Failed to load payment gateway");
        return;
      }

      const { data: orderData, error: orderError } =
        await supabase.functions.invoke("create-razorpay-order", {
          body: { planId },
        });

      if (orderError) {
        // Try to extract the actual error from the response
        if (orderError.context instanceof Response) {
          const errorBody = await orderError.context.json().catch(() => null);
          if (errorBody?.error) {
            throw new Error(errorBody.error);
          }
        }

        throw orderError;
      }

      if (orderData?.error) {
        throw new Error(orderData.error);
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "FlipFlow",
        description: `Subscription to ${
          planId.charAt(0).toUpperCase() + planId.slice(1)
        } Plan`,
        order_id: orderData.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const { error: verifyError } = await supabase.functions.invoke(
              "verify-razorpay-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  planId: planId,
                },
              }
            );

            if (verifyError) throw verifyError;
            toast.success(
              `Welcome to FlipFlow ${
                planId.charAt(0).toUpperCase() + planId.slice(1)
              }! 🎉`
            );
            fetchUserRole(); // Refresh role
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Payment verification failed";
            toast.error(errorMessage);
          }
        },
        prefill: { email: userEmail || "" },
        theme: { color: "#3b82f6" },
      };

      const paymentObject = new (
        window as unknown as {
          Razorpay: new (options: unknown) => { open: () => void };
        }
      ).Razorpay(options);
      paymentObject.open();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Payment failed";
      toast.error(errorMessage);
    } finally {
      setProcessingPayment(false);
    }
  };

  return { userRole, profile, processingPayment, subscribeToPlan };
}
