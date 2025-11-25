import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define Plan Prices (in Paise)
// 1 INR = 100 Paise
const PLAN_PRICES: Record<string, number> = {
  starter: 29900,  // ₹299
  hobby: 59900,    // ₹599
  business: 99900, // ₹999
  pro: 149900      // ₹1499
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    
    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body to get the requested Plan ID
    const body = await req.json();
    console.log('Received request body:', body);
    const { planId } = body;
    
    console.log('Plan ID:', planId);
    console.log('Available plans:', Object.keys(PLAN_PRICES));
    
    if (!planId || !PLAN_PRICES[planId]) {
      const errorMsg = `Invalid or missing Plan ID. Received: ${planId}, Expected one of: ${Object.keys(PLAN_PRICES).join(', ')}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const amount = PLAN_PRICES[planId];

    // Check if user already has an active subscription
    try {
      const { data: existingSubscription, error: subError } = await supabase
        .from('subscriptions')
        .select('status, expires_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .maybeSingle();

      if (subError) {
        console.warn('Error checking existing subscription:', subError);
        // Continue anyway - don't block if subscription check fails
      }

      if (existingSubscription) {
        const expiresAt = existingSubscription.expires_at ? new Date(existingSubscription.expires_at) : null;
        if (expiresAt && expiresAt > new Date()) {
          console.log('User already has active subscription');
          return new Response(
            JSON.stringify({ error: 'You already have an active subscription' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
    } catch (checkError) {
      console.error('Subscription check failed:', checkError);
      // Continue anyway - don't block the upgrade
    }

    // Create Razorpay order
    // Create Razorpay order
    // Receipt must be max 40 chars - use shortened user ID + timestamp
    const shortId = user.id.slice(0, 8);
    const timestamp = Date.now().toString().slice(-8);
    const orderData = {
      amount: amount,
      currency: 'INR',
      receipt: `rcpt_${shortId}_${timestamp}`,
      notes: {
        plan_id: planId, // Store plan ID in Razorpay notes for reference
        user_id: user.id
      }
    };

    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Razorpay error:', error);
      throw new Error('Failed to create order');
    }

    const order = await response.json();

    // Create or update subscription record - store plan_id so we know what tier to activate
    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan_id: planId,      // Important: Save the plan they are attempting to buy
        amount: amount,
        currency: 'INR',
        status: 'pending',
        razorpay_order_id: order.id,
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Database error:', upsertError);
      throw new Error('Failed to create subscription record');
    }

    return new Response(
      JSON.stringify({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: razorpayKeyId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error message:', errorMessage);
    console.error('Error stack:', errorStack);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorStack,
        timestamp: new Date().toISOString()
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
