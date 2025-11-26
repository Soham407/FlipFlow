import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.18';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define 5-tier plan limits (must match frontend PLANS constant)
const PLANS = {
  FREE: { maxFileSizeMB: 2 },
  STARTER: { maxFileSizeMB: 5 },
  HOBBY: { maxFileSizeMB: 10 },
  BUSINESS: { maxFileSizeMB: 25 },
  PRO: { maxFileSizeMB: 50 }
} as const;

type PlanRole = keyof typeof PLANS;

// R2 configuration
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!;
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!;
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!;
const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME')!;

// Initialize AWS client for R2
const r2 = new AwsClient({
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Client for auth verification (uses anon key with user's token)
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Admin client for database operations (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch user's subscription role to enforce plan limits
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleError) {
      console.error('Error fetching user role:', roleError);
    }

    const userRole = (roleData?.role?.toUpperCase() || 'FREE') as PlanRole;
    const planConfig = PLANS[userRole] || PLANS.FREE;
    const maxSizeBytes = planConfig.maxFileSizeMB * 1024 * 1024;

    console.log('User plan:', { 
      userId: user.id, 
      role: userRole, 
      roleData: roleData,
      maxFileSizeMB: planConfig.maxFileSizeMB 
    });

    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const fileSize = parseInt(formData.get('fileSize') as string);

    if (!file || !title) {
      throw new Error('Missing required fields');
    }

    // Validate file size against user's plan limit
    if (file.size > maxSizeBytes) {
      console.error(`File size validation failed: ${file.size} bytes exceeds ${maxSizeBytes} bytes for ${userRole} plan`);
      throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds your ${userRole} plan limit of ${planConfig.maxFileSizeMB}MB. Please upgrade your plan.`);
    }

    console.log('File size validation passed:', { fileSize: file.size, limit: maxSizeBytes });

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

    // Convert file to ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // Upload to R2 using aws4fetch
    console.log('Uploading to R2:', { fileName, bucket: R2_BUCKET_NAME, size: fileBuffer.byteLength });
    
    const r2Url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${fileName}`;
    
    try {
      const uploadResponse = await r2.fetch(r2Url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          'Content-Length': fileBuffer.byteLength.toString(),
        },
        body: fileBuffer,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('R2 upload failed:', errorText);
        throw new Error(`R2 upload failed: ${uploadResponse.status} ${errorText}`);
      }

      console.log('Successfully uploaded to R2');
    } catch (error) {
      console.error('R2 upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to upload to R2: ${errorMessage}`);
    }

    // Create flipbook record in database
    const { data: flipbook, error: dbError } = await supabaseAdmin
      .from('flipbooks')
      .insert({
        user_id: user.id,
        title: title,
        file_path: fileName,
        file_size: fileSize,
        is_public: true,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      console.error('Error details:', JSON.stringify(dbError, null, 2));
      // Try to clean up R2 file if DB insert fails
      try {
        const deleteUrl = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${fileName}`;
        await r2.fetch(deleteUrl, { method: 'DELETE' });
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
      throw new Error(`Failed to create flipbook record: ${dbError.message || JSON.stringify(dbError)}`);
    }

    console.log('Upload successful:', { flipbookId: flipbook.id, fileName });

    return new Response(
      JSON.stringify({ 
        success: true, 
        flipbook,
        publicUrl: `https://pub-${R2_ACCOUNT_ID}.r2.dev/${fileName}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in upload-to-r2:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error type:', typeof error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage, 
        success: false,
        timestamp: new Date().toISOString() 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
