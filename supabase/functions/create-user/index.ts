// supabase/functions/create-user/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// These are the CORS headers that will be sent with every response
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or, for better security, your specific frontend URL
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Specify the allowed methods
};

serve(async (req) => {
  // This is how you handle a preflight request.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, full_name, role, firms } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    console.log('--- Edge Function Debugging (v3) ---');
    console.log('Received request for email:', email);
    console.log('SUPABASE_URL (first 10 chars):', supabaseUrl.substring(0, 10) + '...');
    console.log('SUPABASE_SERVICE_ROLE_KEY (first 5 chars):', supabaseServiceRoleKey.substring(0, 5) + '...');

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    // 1. Create the user in the auth.users table
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role }, // Ensure role is passed here for the trigger
    });

    if (authError) {
      console.error('Supabase Auth Admin createUser failed:', authError);
      return new Response(JSON.stringify({
        error: "Authentication error: Database error creating new user",
        details: authError.message,
        supabase_error_code: (authError as any).code,
        supabase_error_details: (authError as any).details
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!authData?.user) {
        return new Response(JSON.stringify({ error: 'User could not be created in authentication system (no user data returned).' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
    }

    const userId = authData.user.id;

    // 2. Insert the user's profile and role into the user_profiles table
    // IMPORTANT: This block is commented out because the `handle_new_user` trigger
    // is already responsible for creating the user profile in `public.user_profiles`.
    // Doing it here explicitly would cause a "duplicate key" error.
    /*
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({ id: userId, full_name, role }); // Assuming role is passed from client to Edge Function

    if (profileError) {
      console.error('Profile creation failed:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId); // Clean up auth user
      return new Response(JSON.stringify({
        error: `Profile creation error: ${profileError.message}`,
        supabase_error_code: (profileError as any).code,
        supabase_error_details: (profileError as any).details
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    */

    // 3. Handle firm access in the user_firm_access table
    if (firms && firms.length > 0) {
        const firmAccessRecords = firms.map((firmId: string) => ({
            user_id: userId,
            firm_id: firmId,
        }));

        const { error: firmAccessError } = await supabaseAdmin
            .from('user_firm_access')
            .insert(firmAccessRecords);

        if (firmAccessError) {
            console.error('Firm access assignment failed:', firmAccessError);
            await supabaseAdmin.auth.admin.deleteUser(userId); // Clean up auth user
            return new Response(JSON.stringify({
              error: `Firm access assignment error: ${firmAccessError.message}`,
              supabase_error_code: (firmAccessError as any).code,
              supabase_error_details: (firmAccessError as any).details
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            });
        }
    }

    return new Response(JSON.stringify({ message: "User created successfully", userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Caught unexpected error in Edge Function:', error);
    return new Response(JSON.stringify({
      error: error.message || "An unknown error occurred in the Edge Function.",
      stack: error.stack
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
