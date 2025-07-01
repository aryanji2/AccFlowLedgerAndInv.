import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create service role client for privileged operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Fetch all users with their firm access using service role client (bypasses RLS)
    const { data: users, error: usersError } = await supabaseService
      .from('user_profiles')
      .select(`
        *,
        user_firm_access (
          firm_id,
          firms (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users', details: usersError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get auth users to add email information
    const { data: authUsers, error: authError } = await supabaseService.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      // Continue with user profiles only
    }

    // Combine user profiles with auth users to get emails
    const combinedUsers = users?.map(profile => {
      const authUser = authUsers?.users.find(u => u.id === profile.id);
      return {
        ...profile,
        email: authUser?.email || profile.username || 'No email',
        last_login: authUser?.last_sign_in_at || null
      };
    }) || [];

    return new Response(
      JSON.stringify(combinedUsers || []),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-all-users function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});