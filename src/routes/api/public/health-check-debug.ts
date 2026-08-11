import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/health-check-debug')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');
        
        const results: any = {
          grants: {},
          rls: {},
          token_info: token ? 'present' : 'absent'
        };

        // Check grants
        const { data: grants } = await supabaseAdmin.rpc('get_table_privileges', { t_name: 'feedback' });
        results.grants = grants;

        if (token) {
           const { createClient } = await import('@supabase/supabase-js');
           const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
             global: { headers: { Authorization: `Bearer ${token}` } }
           });
           
           const { data: user } = await sb.auth.getUser();
           results.user = user;
           
           const { data: feedback, error } = await sb.from('feedback').select('id').limit(1);
           results.feedback_test = { count: feedback?.length, error };
        }

        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }
})
