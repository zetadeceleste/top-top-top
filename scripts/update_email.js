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
    console.error('❌ Email inválido. Debe ser un email (ej: nombre@gmail.com)')
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

  // Update email in Supabase
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { email: newEmail }
  )

  if (updateError) {
    console.error('❌ Error al actualizar email:', updateError.message)
    process.exit(1)
  }

  console.log(`✅ Email de ${member.name} actualizado en Supabase!`)

  // Update email in config.js
  try {
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')

    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const configPath = path.join(__dirname, '../config.js')

    let configContent = fs.readFileSync(configPath, 'utf8')

    // Find and replace the email for this user
    const oldEmailPattern = new RegExp(
      `(username: '${username}',[^}]*email: ')([^']+)(')`,
      'g'
    )

    if (!configContent.match(oldEmailPattern)) {
      console.warn('⚠️  No se pudo encontrar el email en config.js para actualizar')
      console.log(`\n📧 Ahora ${member.name} puede usar "¿Olvidaste tu contraseña?" con: ${newEmail}`)
      console.log(`⚠️  IMPORTANTE: Actualizá manualmente el email en config.js\n`)
      process.exit(0)
    }

    configContent = configContent.replace(oldEmailPattern, `$1${newEmail}$3`)

    fs.writeFileSync(configPath, configContent, 'utf8')

    console.log(`✅ Email de ${member.name} actualizado en config.js!`)
    console.log(`\n📧 Ahora ${member.name} puede usar "¿Olvidaste tu contraseña?" con: ${newEmail}`)
    console.log(`\n⚠️  IMPORTANTE: Hacé commit y push de los cambios:`)
    console.log(`   git add config.js`)
    console.log(`   git commit -m "Update ${username} email to ${newEmail}"`)
    console.log(`   git push\n`)
  } catch (err) {
    console.error('⚠️  Error al actualizar config.js:', err.message)
    console.log(`\n📧 El email fue actualizado en Supabase pero NO en config.js`)
    console.log(`   Actualizalo manualmente en config.js y hacé commit\n`)
  }
}

updateEmail()
