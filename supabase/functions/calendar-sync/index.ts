import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { action, data } = await req.json()
    const authHeader = req.headers.get('Authorization')
    
    // Get user from auth header
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader?.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    switch (action) {
      case 'sync':
        // Mock sync for now - returns sample events
        const mockEvents = [
          {
            id: 'mock-1',
            title: 'Team Meeting',
            start_time: new Date(Date.now() + 86400000).toISOString(),
            end_time: new Date(Date.now() + 90000000).toISOString(),
            location: 'Conference Room A',
            description: 'Weekly team sync',
            source: 'google_calendar'
          },
          {
            id: 'mock-2', 
            title: 'Dentist Appointment',
            start_time: new Date(Date.now() + 172800000).toISOString(),
            end_time: new Date(Date.now() + 176400000).toISOString(),
            location: '123 Medical Center',
            description: 'Regular checkup',
            source: 'google_calendar'
          }
        ]
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            events: mockEvents,
            message: 'Calendar sync simulated (Google Calendar API not connected yet)'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
        
      case 'status':
        // Return sync status
        const { data: userData } = await supabaseClient
          .from('users')
          .select('last_sync_time, sync_enabled')
          .eq('auth_id', user.id)
          .single()
          
        return new Response(
          JSON.stringify({ 
            connected: false, // Will be true when Google OAuth is set up
            syncEnabled: userData?.sync_enabled ?? false,
            lastSync: userData?.last_sync_time,
            mockMode: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
        
      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})