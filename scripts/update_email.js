import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { FAMILY_MEMBERS } from '../config.js'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

async function updateEmail() {
  const args = process.argv.slice(2)

  if (args.length !== 2) {
    console.log('Uso: npm run update-email <username> <nuevo_email>')
    console.log('\nUsuarios disponibles:')
    FAMILY_MEMBERS.forEach((m) => console.log(`  - ${m.username}`))
    process.exit(1)
  }

  const [username, newEmail] = args

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(newEmail)) {
    console.error('❌ Email inválido. Debe ser un email real (ej: nombre@gmail.com)')
    process.exit(1)
  }

  const member = FAMILY_MEMBERS.find((m) => m.username === username)

  if (!member) {
    console.error(`❌ Usuario "${username}" no encontrado`)
    console.log('\nUsuarios disponibles:')
    FAMILY_MEMBERS.forEach((m) => console.log(`  - ${m.username}`))
    process.exit(1)
  }

  console.log(`\n🔄 Actualizando email de ${member.name}...`)
  console.log(`   Email anterior: ${member.email}`)
  console.log(`   Email nuevo: ${newEmail}`)

  // Get user by old email
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Error al obtener usuarios:', listError.message)
    process.exit(1)
  }

  const user = users.users.find((u) => u.email === member.email)

  if (!user) {
    console.error(`❌ Usuario no encontrado en la base de datos`)
    console.log(`   Buscando: ${member.email}`)
    process.exit(1)
  }

  // Update email
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { email: newEmail }
  )

  if (updateError) {
    console.error('❌ Error al actualizar email:', updateError.message)
    process.exit(1)
  }

  console.log(`✅ Email de ${member.name} actualizado exitosamente!`)
  console.log(`\n📧 Ahora ${member.name} puede usar "¿Olvidaste tu contraseña?" con: ${newEmail}\n`)
}

updateEmail()
