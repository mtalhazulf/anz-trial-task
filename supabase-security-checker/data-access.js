import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const TARGET_AGENCY_ID =
  process.env.TARGET_AGENCY_ID ?? '1d012b92-7ae3-407c-b204-3167a3672af0'

const USER1 = {
  email: process.env.TEST_USER1_EMAIL ?? 'test1@yopmail.com',
  password: process.env.TEST_USER1_PASSWORD ?? 'Test1@yopmail.com',
}

const USER2 = {
  email: process.env.TEST_USER2_EMAIL ?? 'talha@agency.com',
  password: process.env.TEST_USER2_PASSWORD ?? 'talha@agency.com',
}

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing ${name} in environment (.env)`)
    process.exit(1)
  }
  return v
}

function createSupabase() {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function signIn(supabase, label, { email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(`${label} sign-in failed: ${error.message}`)
  }
  if (!data.session?.user) {
    throw new Error(`${label} sign-in returned no session`)
  }
  return data.session.user
}

async function getAgencyNameForUser(supabase, agencyId) {
  const { data, error } = await supabase
    .from('agencies')
    .select('id, name')
    .eq('id', agencyId)
    .maybeSingle()

  if (error) {
    return { error: error.message, agency: null }
  }
  return { error: null, agency: data }
}

async function attemptCrossTenantAccess(supabase, peerAgencyId) {
  const results = {
    agenciesById: null,
    agenciesError: null,
    bookingsForAgency: null,
    bookingsError: null,
    membersForAgency: null,
    membersError: null,
  }

  const agencyRes = await supabase
    .from('agencies')
    .select('id, name, created_at')
    .eq('id', peerAgencyId)
    .maybeSingle()

  results.agenciesError = agencyRes.error?.message ?? null
  results.agenciesById = agencyRes.data

  const bookingsRes = await supabase
    .from('bookings')
    .select('id, agency_id, booking_ref, client_name')
    .eq('agency_id', peerAgencyId)
    .limit(50)

  results.bookingsError = bookingsRes.error?.message ?? null
  results.bookingsForAgency = bookingsRes.data

  const membersRes = await supabase
    .from('agency_members')
    .select('id, user_id, agency_id, role')
    .eq('agency_id', peerAgencyId)
    .limit(50)

  results.membersError = membersRes.error?.message ?? null
  results.membersForAgency = membersRes.data

  return results
}

function summarizeLeak(attempt) {
  const leaks = []

  if (attempt.agenciesById) {
    leaks.push({
      surface: 'agencies (SELECT by target agency id)',
      detail: JSON.stringify(attempt.agenciesById),
    })
  }

  if (attempt.bookingsForAgency?.length) {
    leaks.push({
      surface: `bookings (SELECT for target agency_id, ${attempt.bookingsForAgency.length} row(s))`,
      detail: attempt.bookingsForAgency.map((b) => b.booking_ref ?? b.id).join(', '),
    })
  }

  if (attempt.membersForAgency?.length) {
    leaks.push({
      surface: `agency_members (SELECT for target agency_id, ${attempt.membersForAgency.length} row(s))`,
      detail: attempt.membersForAgency.map((m) => `${m.user_id} (${m.role})`).join('; '),
    })
  }

  return leaks
}

async function userIsMemberOfAgency(supabase, userId, agencyId) {
  const { data, error } = await supabase
    .from('agency_members')
    .select('id')
    .eq('user_id', userId)
    .eq('agency_id', agencyId)
    .limit(1)
    .maybeSingle()

  if (error) {
    return { ok: false, error: error.message, member: false }
  }
  return { ok: true, error: null, member: !!data }
}

async function run() {
  console.log('=== Cross-tenant data access test ===\n')
  console.log(`Target agency id: ${TARGET_AGENCY_ID}`)
  console.log(`User1 (attacker): ${USER1.email}`)
  console.log(`User2 (reference): ${USER2.email}\n`)

  const supabase = createSupabase()

  let user2
  try {
    user2 = await signIn(supabase, 'User2', USER2)
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }

  const ref = await getAgencyNameForUser(supabase, TARGET_AGENCY_ID)
  await supabase.auth.signOut()

  if (ref.error) {
    console.log(`User2 baseline agencies query error: ${ref.error}\n`)
  } else if (ref.agency) {
    console.log(
      `Reference — User2 can see this agency name (member access): "${ref.agency.name}"\n`
    )
  } else {
    console.log(
      'Reference — User2 sees no row for this agency id (not a member, or id missing). User1 test still runs.\n'
    )
  }

  let user1
  try {
    user1 = await signIn(supabase, 'User1', USER1)
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }

  const membership = await userIsMemberOfAgency(supabase, user1.id, TARGET_AGENCY_ID)
  if (!membership.ok) {
    console.error(`Could not check User1 membership: ${membership.error}`)
    process.exit(1)
  }
  if (membership.member) {
    console.log(
      '[INFO] User1 is a member of this agency id — RLS is expected to return name and rows (not a cross-tenant check).\n'
    )
    const attempt = await attemptCrossTenantAccess(supabase, TARGET_AGENCY_ID)
    const name = attempt.agenciesById?.name ?? '(no agencies row)'
    console.log(`User1 sees agency name: "${name}"`)
    console.log(`bookings: ${attempt.bookingsForAgency?.length ?? 0} row(s)`)
    process.exit(0)
  }

  console.log(
    'As User1, querying target organization by id (User1 is not a member — must not see name/rows)...\n'
  )

  const attempt = await attemptCrossTenantAccess(supabase, TARGET_AGENCY_ID)

  if (attempt.agenciesError) {
    console.log(`agencies query error: ${attempt.agenciesError}`)
  } else {
    const nameLeak = attempt.agenciesById?.name
    console.log(
      `agencies row for target id: ${attempt.agenciesById ? `FOUND (unexpected) name="${nameLeak}"` : 'none (expected — no name leaked)'}`
    )
  }

  if (attempt.bookingsError) {
    console.log(`bookings query error: ${attempt.bookingsError}`)
  } else {
    console.log(
      `bookings for target agency: ${attempt.bookingsForAgency?.length ?? 0} row(s) ${attempt.bookingsForAgency?.length ? '(unexpected)' : '(expected)'}`
    )
  }

  if (attempt.membersError) {
    console.log(`agency_members query error: ${attempt.membersError}`)
  } else {
    console.log(
      `agency_members for target agency: ${attempt.membersForAgency?.length ?? 0} row(s) ${attempt.membersForAgency?.length ? '(unexpected)' : '(expected)'}`
    )
  }

  const leaks = summarizeLeak(attempt)
  console.log('')

  if (leaks.length > 0) {
    console.log('[VULNERABLE] User1 can access another user\'s organization data:\n')
    for (const L of leaks) {
      console.log(`  - ${L.surface}`)
      console.log(`    ${L.detail}\n`)
    }
    process.exit(1)
  }

  console.log(
    '[SECURE] User1 cannot read the target agency name, bookings, or other users\' membership rows via these queries.'
  )
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
