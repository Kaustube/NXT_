import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApplicationPayload {
  record: {
    id: string
    company_name: string
    contact_email: string
    phone_number: string | null
    requested_services: string[]
    description: string | null
  }
}

const SERVICE_LABELS: Record<string, string> = {
  events: 'Events',
  jobs: 'Jobs',
  internships: 'Internships',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const body: ApplicationPayload = await req.json()
    const { company_name, contact_email, phone_number, requested_services, description } = body.record

    const prettyServices = requested_services
      .map((service) => SERVICE_LABELS[service] ?? service)
      .join(', ')

    const emailHtml = `
      <h2>New Listing Access Request on NXT</h2>
      <p>A new request has been submitted by <strong>${company_name}</strong>.</p>
      
      <h3>Contact Information</h3>
      <ul>
        <li><strong>Email:</strong> ${contact_email}</li>
        <li><strong>Phone:</strong> ${phone_number || 'Not provided'}</li>
      </ul>
      
      <h3>Requested Access</h3>
      <p>${prettyServices}</p>
      
      <h3>Request Details</h3>
      <p>${description || 'No description provided.'}</p>
      
      <p>Log into your NXT Admin Dashboard to review and approve this request.</p>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'NXT Admin <onboarding@resend.dev>', // Update this with a verified domain later if needed
        to: ['nxtcampusofficial@gmail.com'],
        subject: `New NXT Listing Request: ${company_name} (${prettyServices})`,
        html: emailHtml,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(data)}`)
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Error in notify-admin function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
