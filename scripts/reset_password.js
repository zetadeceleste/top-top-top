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

async function resetPassword() {
  const args = process.argv.slice(2)

  if (args.length !== 2) {
    console.log('Uso: npm run reset-password <username> <nueva_contraseña>')
    console.log('\nUsuarios disponibles:')
    FAMILY_MEMBERS.forEach((m) => console.log(`  - ${m.username}`))
    process.exit(1)
  }

  const [username, newPassword] = args

  if (newPassword.length < 6) {
    console.error('❌ La contraseña debe tener al menos 6 caracteres')
    process.exit(1)
  }

  const member = FAMILY_MEMBERS.find((m) => m.username === username)

  if (!member) {
    console.error(`❌ Usuario "${username}" no encontrado`)
    console.log('\nUsuarios disponibles:')
    FAMILY_MEMBERS.forEach((m) => console.log(`  - ${m.username}`))
    process.exit(1)
  }

  console.log(`\n🔄 Reseteando contraseña de ${member.name} (${member.email})...`)

  // Get user by email
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Error al obtener usuarios:', listError.message)
    process.exit(1)
  }

  const user = users.users.find((u) => u.email === member.email)

  if (!user) {
    console.error(`❌ Usuario no encontrado en la base de datos`)
    process.exit(1)
  }

  // Update password
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  )

  if (updateError) {
    console.error('❌ Error al actualizar contraseña:', updateError.message)
    process.exit(1)
  }

  console.log(`✅ Contraseña de ${member.name} actualizada exitosamente!\n`)
}

resetPassword()
