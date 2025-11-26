import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.18';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage, timestamp: new Date().toISOString() }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
