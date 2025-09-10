import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { eventTitle, eventDescription, eventLocation } = await req.json()
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiApiKey) {
      // Return mock data if no API key
      return new Response(
        JSON.stringify(getMockEnrichment(eventTitle, eventDescription, eventLocation)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Call OpenAI for real enrichment
    const prompt = `Given this event:
Title: ${eventTitle}
Description: ${eventDescription || 'No description'}
Location: ${eventLocation || 'No location'}

Please provide:
1. 3-5 preparation tasks
2. A packing list (3-5 items)
3. Logistics tips (parking, timing, duration)
4. Weather considerations
5. Event category (work/personal/health/education/social)
6. Priority level (1-5, 1 being highest)

Format as JSON with keys: preparation, packingList, logistics, weatherConsiderations, category, priority`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: 'You are a helpful assistant that enriches calendar events with practical suggestions. Always respond with valid JSON.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error.message)
    }

    const aiResponse = JSON.parse(data.choices[0].message.content)
    
    const enrichedData = {
      suggestions: {
        preparation: aiResponse.preparation || [],
        packingList: aiResponse.packingList || [],
        logistics: aiResponse.logistics || {}
      },
      weatherConsiderations: aiResponse.weatherConsiderations || {},
      category: aiResponse.category || 'personal',
      priority: aiResponse.priority || 3
    }
    
    return new Response(
      JSON.stringify(enrichedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('AI Enrichment error:', error)
    return new Response(
      JSON.stringify(getMockEnrichment()),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

function getMockEnrichment(title?: string, description?: string, location?: string) {
  return {
    suggestions: {
      preparation: [
        "Review agenda or event details",
        "Prepare necessary materials",
        "Set reminders"
      ],
      packingList: [
        "Phone and charger",
        "Wallet and keys",
        "Water bottle"
      ],
      logistics: {
        estimatedDuration: "1-2 hours",
        bestTimeToLeave: "15 minutes before",
        parkingTips: "Check for nearby parking"
      }
    },
    weatherConsiderations: {
      indoor: true,
      weatherDependent: false
    },
    category: 'personal',
    priority: 3
  }
}