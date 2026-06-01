import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
    const authHeader = req.headers.get('Authorization')

    if (!supabaseUrl || !secretKeys || !authHeader) {
      throw new Error('Missing server configuration or authorization')
    }

    const admin = createClient(supabaseUrl, JSON.parse(secretKeys).default, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await admin.auth.getUser(token)

    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const { data: requester } = await admin
      .from('members')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!requester?.is_admin) {
      return json({ error: 'Forbidden' }, 403)
    }

    const { userId } = await req.json()
    if (!userId || userId === user.id) {
      return json({ error: 'Invalid member' }, 400)
    }

    for (const table of [
      'points_logs',
      'point_logs',
      'daily_logins',
      'boss_purchases',
      'shop_orders',
      'shipping_orders',
      'grading_submissions',
      'card_owners',
    ]) {
      const { error } = await admin.from(table).delete().eq('member_id', userId)
      if (error) throw error
    }

    const { error: authError } = await admin.auth.admin.deleteUser(userId)
    if (authError) throw authError

    const { error: memberError } = await admin.from('members').delete().eq('id', userId)
    if (memberError) throw memberError

    return json({ ok: true })
  } catch (error) {
    return json({ error: error.message }, 500)
  }
})

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
