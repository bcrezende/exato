import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SITE_NAME = 'exato'
const SENDER_DOMAIN = 'notify.rezendetech.com.br'
const FROM_DOMAIN = 'rezendetech.com.br'
const ROOT_DOMAIN = 'rezendetech.com.br'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate caller JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify the caller is authenticated
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace('Bearer ', '')
    )
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const callerId = claimsData.claims.sub as string

    // Parse body
    const { invitation_id } = await req.json()
    if (!invitation_id) {
      return new Response(JSON.stringify({ error: 'invitation_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch invitation + company using service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: invitation, error: invError } = await adminClient
      .from('invitations')
      .select('id, email, token, company_id, companies(name)')
      .eq('id', invitation_id)
      .single()

    if (invError || !invitation) {
      console.error('Invitation not found', { invError, invitation_id })
      return new Response(JSON.stringify({ error: 'Invitation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify caller belongs to the same company
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('company_id')
      .eq('id', callerId)
      .single()

    if (callerProfile?.company_id !== invitation.company_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build the accept link using the published app URL
    const siteUrl = `https://${ROOT_DOMAIN}`
    const confirmationUrl = `https://exato.lovable.app/accept-invite?token=${invitation.token}`

    const companyName = (invitation as any).companies?.name || SITE_NAME

    // Render the email template
    const html = await renderAsync(
      React.createElement(InviteEmail, {
        siteName: companyName,
        siteUrl,
        confirmationUrl,
      })
    )
    const text = await renderAsync(
      React.createElement(InviteEmail, {
        siteName: companyName,
        siteUrl,
        confirmationUrl,
      }),
      { plainText: true }
    )

    // Enqueue into transactional_emails queue
    const messageId = crypto.randomUUID()

    await adminClient.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'invite',
      recipient_email: invitation.email,
      status: 'pending',
    })

    const { error: enqueueError } = await adminClient.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: invitation.email,
        from: `${companyName} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: 'Você foi convidado para o ' + companyName,
        html,
        text,
        purpose: 'transactional',
        label: 'invite',
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('Failed to enqueue invite email', { enqueueError })
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Invite email enqueued', { email: invitation.email, messageId })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('send-invite-email error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
