import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.621.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// R2 configuration
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!;
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!;
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!;
const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME')!;

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const fileSize = parseInt(formData.get('fileSize') as string);

    if (!file || !title) {
      throw new Error('Missing required fields');
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

    // Convert file to ArrayBuffer and then to Uint8Array
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);

    // Upload to R2 using AWS SDK
    console.log('Uploading to R2:', { fileName, bucket: R2_BUCKET_NAME, size: fileBytes.length });
    
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
      Body: fileBytes,
      ContentType: file.type,
      ContentLength: fileBytes.length,
    });

    try {
      await s3Client.send(uploadCommand);
      console.log('Successfully uploaded to R2');
    } catch (error) {
      console.error('R2 upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to upload to R2: ${errorMessage}`);
    }

    // Create flipbook record in database
    const { data: flipbook, error: dbError } = await supabase
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
      // Try to clean up R2 file if DB insert fails
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: fileName,
        });
        await s3Client.send(deleteCommand);
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
      throw new Error('Failed to create flipbook record');
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
