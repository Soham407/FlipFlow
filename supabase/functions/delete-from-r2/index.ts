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

    // Additional security: Verify file path structure matches user_id
    // File paths should be in format: {user_id}/{timestamp}-{uuid}.{ext}
    if (!flipbook.file_path.startsWith(`${user.id}/`)) {
      throw new Error('File path does not match user ownership');
    }

    // CRITICAL: Delete database record FIRST to prevent broken links
    // If DB deletion fails, we don't want to delete the file (user still sees it)
    // If DB deletion succeeds but R2 deletion fails, that's acceptable (just wasted storage)
    const { error: dbError } = await supabase
      .from('flipbooks')
      .delete()
      .eq('id', flipbookId);

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to delete flipbook record');
    }

    // Now attempt to delete from R2 storage
    // If this fails, we silently continue (better to waste storage than show broken links)
    console.log('Deleting from R2:', { filePath: flipbook.file_path, bucket: R2_BUCKET_NAME });
    
    const deleteUrl = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${flipbook.file_path}`;
    
    try {
      const deleteResponse = await r2.fetch(deleteUrl, { method: 'DELETE' });
      
      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.warn('R2 delete warning (non-critical):', errorText);
        // Don't throw - DB record is already deleted, this is just cleanup
      } else {
        console.log('Successfully deleted from R2');
      }
    } catch (error) {
      console.warn('R2 delete error (non-critical, continuing):', error);
      // Continue even if R2 delete fails - DB record is already deleted
      // This prevents broken links in the UI
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
