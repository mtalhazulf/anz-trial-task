import 'dotenv/config'
import { inspect } from 'node:util'
import { createClient } from '@supabase/supabase-js'

const TABLES = [
  'users',
  'agencies',
  'agency_members',
  'bookings'
]

const USER = {
  email: process.env.TEST_USER1_EMAIL ?? 'test1@yopmail.com',
  password: process.env.TEST_USER1_PASSWORD ?? 'Test1@yopmail.com',
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

async function signIn(supabase) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: USER.email,
    password: USER.password,
  })
  if (error) {
    throw new Error(`Sign-in failed: ${error.message}`)
  }
  if (!data.session?.user) {
    throw new Error('Sign-in returned no session')
  }
  return data.session
}

function banner(title) {
  const line = '═'.repeat(Math.max(60, title.length + 4))
  console.log(`\n\x1b[36m${line}\x1b[0m`)
  console.log(`\x1b[1;36m  ${title}\x1b[0m`)
  console.log(`\x1b[36m${line}\x1b[0m\n`)
}

function printPayload(label, payload) {
  console.log(
    inspect(payload, {
      depth: null,
      colors: true,
      maxArrayLength: null,
      maxStringLength: null,
      compact: false,
      breakLength: 80,
    })
  )
}

async function fetchTable(supabase, tableName) {
  const { data, error, count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact' })

  return { data, error, count }
}

async function main() {
  console.log('\x1b[1mSupabase — rows visible to authenticated test user\x1b[0m')
  console.log(`User: \x1b[33m${USER.email}\x1b[0m\n`)

  const supabase = createSupabase()
  const session = await signIn(supabase)

  banner('Session (JWT user)')
  printPayload('auth user', {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    app_metadata: session.user.app_metadata,
    user_metadata: session.user.user_metadata,
  })

  for (const table of TABLES) {
    banner(`Table: ${table}`)
    const { data, error, count } = await fetchTable(supabase, table)

    if (error) {
      console.log(`\x1b[31mError:\x1b[0m ${error.message}`)
      console.log(`\x1b[90m(code: ${error.code ?? 'n/a'}, details: ${error.details ?? 'n/a'})\x1b[0m`)
      continue
    }

    const rows = data ?? []
    console.log(
      `\x1b[90mRows returned: ${rows.length}${count != null ? ` · total matching (RLS): ${count}` : ''}\x1b[0m\n`
    )
    if (rows.length === 0) {
      console.log('\x1b[90m(no rows)\x1b[0m')
    } else {
      printPayload('rows', rows)
    }
  }

  await supabase.auth.signOut()
  console.log('\n\x1b[32mDone.\x1b[0m\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
