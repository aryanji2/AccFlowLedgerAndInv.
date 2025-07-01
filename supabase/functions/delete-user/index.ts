import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the user ID from the request body
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify the user to be deleted exists
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, username')
      .eq('id', userId)
      .single();

    if (targetUserError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Attempting to delete user ${targetUser.username || targetUser.id} (${targetUser.full_name})`);

    // Delete in the correct order to avoid foreign key constraint violations
    
    // 1. First, delete user_firm_access entries
    try {
      const { error: accessError } = await supabaseAdmin
        .from('user_firm_access')
        .delete()
        .eq('user_id', userId);
        
      if (accessError) {
        console.error('Error deleting user firm access:', accessError);
        // Continue anyway, as this might not exist
      } else {
        console.log('Successfully deleted user firm access');
      }
    } catch (error) {
      console.error('Error deleting user firm access:', error);
      // Continue anyway
    }

    // 2. Then delete the user profile
    try {
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', userId);
        
      if (profileError) {
        console.error('Error deleting user profile:', profileError);
        return new Response(
          JSON.stringify({ error: `Failed to delete user profile: ${profileError.message}` }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        console.log('Successfully deleted user profile');
      }
    } catch (error) {
      console.error('Error deleting user profile:', error);
      return new Response(
        JSON.stringify({ error: `Failed to delete user profile: ${error.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 3. Finally delete the user from auth
    try {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (deleteError) {
        console.error('Error deleting user from auth:', deleteError);
        return new Response(
          JSON.stringify({ error: `Failed to delete user from authentication: ${deleteError.message}` }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        console.log('Successfully deleted user from auth');
      }
    } catch (error) {
      console.error('Error deleting user from auth:', error);
      return new Response(
        JSON.stringify({ error: `Failed to delete user from authentication: ${error.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Successfully deleted user ${targetUser.username || targetUser.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${targetUser.full_name} has been successfully deleted` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in delete-user function:', error);
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});