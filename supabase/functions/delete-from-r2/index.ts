import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { S3Client, DeleteObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.621.0';

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

    const { flipbookId } = await req.json();
    
    if (!flipbookId) {
      throw new Error('Missing flipbook ID');
    }

    // Get flipbook details
    const { data: flipbook, error: fetchError } = await supabase
      .from('flipbooks')
      .select('file_path, user_id')
      .eq('id', flipbookId)
      .single();

    if (fetchError || !flipbook) {
      throw new Error('Flipbook not found');
    }

    // Verify ownership
    if (flipbook.user_id !== user.id) {
      throw new Error('Unauthorized to delete this flipbook');
    }

    // Delete from R2 using AWS SDK
    console.log('Deleting from R2:', { filePath: flipbook.file_path, bucket: R2_BUCKET_NAME });
    
    const deleteCommand = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: flipbook.file_path,
    });

    try {
      await s3Client.send(deleteCommand);
      console.log('Successfully deleted from R2');
    } catch (error) {
      console.warn('R2 delete warning:', error);
      // Continue even if R2 delete fails (file might already be gone)
    }

    // Delete flipbook record from database
    const { error: dbError } = await supabase
      .from('flipbooks')
      .delete()
      .eq('id', flipbookId);

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to delete flipbook record');
    }

    console.log('Delete successful:', { flipbookId, filePath: flipbook.file_path });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in delete-from-r2:', error);
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
