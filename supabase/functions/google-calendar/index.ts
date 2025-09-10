import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const pathname = url.pathname.split('/').pop()
  
  // Parse body for action parameter
  let action = pathname
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      action = body.action || pathname
    } catch {
      // If body parsing fails, use pathname
    }
  }
  
  try {
    switch (action) {
      case 'auth':
        // Generate OAuth URL
        const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar/callback`
        const scope = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events'
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${GOOGLE_CLIENT_ID}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent(scope)}&` +
          `access_type=offline&` +
          `prompt=consent`
        
        return new Response(
          JSON.stringify({ authUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      
      case 'callback':
        // Handle OAuth callback
        const code = url.searchParams.get('code')
        if (!code) {
          return Response.redirect(`${Deno.env.get('CLIENT_URL')}?calendar_auth=error`)
        }
        
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: `${SUPABASE_URL}/functions/v1/google-calendar/callback`,
            grant_type: 'authorization_code',
          }),
        })
        
        const tokens = await tokenResponse.json()
        
        // Store tokens in Supabase (you'd need to get the user ID from session)
        // For now, redirect back to app with success
        return Response.redirect(`${Deno.env.get('CLIENT_URL') || 'http://localhost:5173'}?calendar_auth=success`)
      
      case 'sync':
        // Sync calendar events
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
          throw new Error('No authorization header')
        }
        
        // Get user's Google tokens from database
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
        
        if (!user) {
          throw new Error('User not authenticated')
        }
        
        // For now, return mock events since we need to set up token storage
        const mockEvents = [
          {
            id: 'google-1',
            summary: 'Team Standup',
            start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
            end: { dateTime: new Date(Date.now() + 90000000).toISOString() },
            location: 'Zoom',
          },
          {
            id: 'google-2',
            summary: 'Project Review',
            start: { dateTime: new Date(Date.now() + 172800000).toISOString() },
            end: { dateTime: new Date(Date.now() + 176400000).toISOString() },
            location: 'Office',
          }
        ]
        
        return new Response(
          JSON.stringify({ events: mockEvents }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown endpoint' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})