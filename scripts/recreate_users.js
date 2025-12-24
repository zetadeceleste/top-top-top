import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar definidas en .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const users = [
  { email: 'alfredo@toptoptop.local', password: '123alfredo', name: 'Alfredo' },
  { email: 'celes@toptoptop.local', password: '123celes', name: 'Celes' },
  { email: 'flor@toptoptop.local', password: '123flor', name: 'Flor' },
  { email: 'kiki@toptoptop.local', password: '123kiki', name: 'Kiki' },
  { email: 'luna@toptoptop.local', password: '123luna', name: 'Luna' },
  { email: 'luz@toptoptop.local', password: '123luz', name: 'Luz' },
  { email: 'nico@toptoptop.local', password: '123nico', name: 'Nico' },
  { email: 'renzo@toptoptop.local', password: '123renzo', name: 'Renzo' },
  { email: 'sandra@toptoptop.local', password: '123sandra', name: 'Sandra' },
  { email: 'sasha@toptoptop.local', password: '123sasha', name: 'Sasha' }
]

async function recreateUsers() {
  console.log('🚀 Iniciando recreación de usuarios...\n')

  for (const user of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        display_name: user.name,
        needs_password_change: true
      }
    })

    if (error) {
      console.error(`❌ Error creando ${user.email}:`, error.message)
    } else {
      console.log(`✅ Creado ${user.email}`)
    }
  }

  console.log('\n✨ Proceso completado')
}

recreateUsers()
