import { SUPABASE_CONFIG, FAMILY_MEMBERS } from './config.js'

// ============================================
// INITIALIZATION
// ============================================

const supabase = window.supabase.createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey
)

// Global state
let currentUser = null
let selectedUsername = null
let votingForUsername = null
let selectedRating = null
let votesSubscription = null

// Audio state
let audioInitialized = false
const SOUND_NOTES = ['C3', 'E4', 'G4', 'C5', 'E5']
let currentLongSynth = null

// ============================================
// APP INITIALIZATION
// ============================================

async function init() {
  showLoading(true)

  // Check if coming from password reset link
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  const isRecovery = hashParams.get('type') === 'recovery'

  // Check existing session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    await loadUserData(session.user)

    // If coming from password reset, force password change screen
    if (isRecovery) {
      // Clear the hash from URL
      window.history.replaceState(null, '', window.location.pathname)
      showScreen('change-password')
    } else if (session.user.user_metadata?.needs_password_change) {
      showScreen('change-password')
    } else {
      await renderHome()
      showScreen('home')
      setupVoteNotifications()
    }
  } else {
    renderIconGrid()
    showScreen('welcome')
  }

  showLoading(false)
}

// ============================================
// AUTHENTICATION
// ============================================

window.goToLogin = function () {
  showScreen('login')
}

function renderIconGrid() {
  const grid = document.getElementById('icon-grid')
  grid.innerHTML = FAMILY_MEMBERS.map(
    (member) => `
    <div class="icon-card" onclick="selectUser('${member.username}')">
      <img src="assets/icons/${member.icon}" alt="${member.name}">
      <span class="name">${member.name}</span>
    </div>
  `
  ).join('')
}

window.selectUser = function (username) {
  selectedUsername = username
  const member = FAMILY_MEMBERS.find((m) => m.username === username)

  document.getElementById('selected-icon').src = `assets/icons/${member.icon}`
  document.getElementById('selected-name').textContent = member.name
  document.getElementById('password-input').value = ''

  showScreen('password')

  // Focus on input after screen is visible
  setTimeout(() => {
    document.getElementById('password-input').focus()
  }, 100)
}

window.backToIcons = function () {
  showScreen('login')
  document.getElementById('login-error').classList.add('hidden')
  selectedUsername = null
}

window.goToForgotPassword = function () {
  if (!selectedUsername) {
    showError('login-error', 'Primero seleccioná un usuario')
    return
  }

  const member = FAMILY_MEMBERS.find((m) => m.username === selectedUsername)

  document.getElementById('forgot-icon').src = `assets/icons/${member.icon}`
  document.getElementById('forgot-name').textContent = member.name
  document.getElementById('forgot-error').classList.add('hidden')
  document.getElementById('forgot-success').classList.add('hidden')

  showScreen('forgot-password')
}

window.backToPasswordScreen = function () {
  showScreen('password')
  document.getElementById('forgot-error').classList.add('hidden')
  document.getElementById('forgot-success').classList.add('hidden')
}

window.sendPasswordReset = async function () {
  if (!selectedUsername) {
    showError('forgot-error', 'Error: Usuario no seleccionado')
    return
  }

  const member = FAMILY_MEMBERS.find((m) => m.username === selectedUsername)
  const email = member.email

  // Check if user has a temporary email (not real)
  if (email.endsWith('@toptoptop.local')) {
    showError(
      'forgot-error',
      'Por favor enviá tu email real a la administradora para habilitar esta función. ¡Gracias!'
    )
    return
  }

  showLoading(true)

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/index.html`,
  })

  showLoading(false)

  if (error) {
    showError('forgot-error', 'Error al enviar email: ' + error.message)
    return
  }

  // Hide error and show success
  document.getElementById('forgot-error').classList.add('hidden')
  const successEl = document.getElementById('forgot-success')
  successEl.textContent = '✅ Email enviado! Revisá tu casilla de correo.'
  successEl.classList.remove('hidden')

  // Optionally go back after 3 seconds
  setTimeout(() => {
    showScreen('password')
  }, 3000)
}

window.login = async function () {
  const password = document.getElementById('password-input').value

  if (!selectedUsername || !password) {
    showError('login-error', 'Ingresa tu contraseña')
    return
  }

  showLoading(true)

  const member = FAMILY_MEMBERS.find((m) => m.username === selectedUsername)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: member.email,
    password,
  })

  if (error) {
    showError('login-error', 'Contraseña incorrecta')
    showLoading(false)
    return
  }

  await loadUserData(data.user)

  if (data.user.user_metadata?.needs_password_change) {
    showScreen('change-password')
  } else {
    await renderHome()
    showScreen('home')
    setupVoteNotifications()
  }

  showLoading(false)
}

// ============================================
// PASSWORD CHANGE
// ============================================

window.changePassword = async function () {
  const newPass = document.getElementById('new-password').value
  const confirmPass = document.getElementById('confirm-password').value

  if (newPass !== confirmPass) {
    showError('change-error', 'Las contraseñas no coinciden')
    return
  }

  if (newPass.length < 6) {
    showError('change-error', 'Mínimo 6 caracteres')
    return
  }

  showLoading(true)

  const { error } = await supabase.auth.updateUser({
    password: newPass,
    data: { needs_password_change: false },
  })

  if (error) {
    showError('change-error', error.message)
    showLoading(false)
    return
  }

  await renderHome()
  showScreen('home')
  setupVoteNotifications()
  showLoading(false)
}

window.cancelPasswordChange = async function () {
  await supabase.auth.signOut()
  currentUser = null
  window.location.reload()
}

// ============================================
// HOME
// ============================================

async function renderHome() {
  // Find member by username or email
  const member = FAMILY_MEMBERS.find((m) =>
    m.username === currentUser.username ||
    m.email === currentUser.email ||
    currentUser.email?.includes(m.username)
  )

  // If member not found, use generic data
  if (!member) {
    console.warn('Member not found for user:', currentUser)
    document.getElementById('home-avatar').src = `assets/avatars/default.gif`
    document.getElementById('home-name').textContent = currentUser.display_name || 'Usuario'
    await requestNotificationPermission()
    return
  }

  document.getElementById('home-avatar').src = `assets/avatars/${member.gif}`

  // Get user's ranking position
  const position = await getUserRankingPosition(currentUser.id)

  // Add badge if first or last
  let badge = ''
  if (position.rank === 1) {
    badge = ' 👑'
    // Crown emoji rain when entering as first place
    setTimeout(() => createEmojiRain('👑', 25), 500)
  } else if (position.isLast) {
    badge = ' 💩'
    // Poop emoji rain when entering as last place
    setTimeout(() => createEmojiRain('💩', 20), 500)
  }

  document.getElementById('home-name').textContent = member.name + badge

  // Request notification permission
  await requestNotificationPermission()
}

async function getUserRankingPosition(userId) {
  const { data: votes } = await supabase
    .from('votes')
    .select('voted_for_id, rating')

  if (!votes) return { rank: null, isLast: false }

  const scores = {}
  const counts = {}

  votes.forEach((vote) => {
    if (!scores[vote.voted_for_id]) {
      scores[vote.voted_for_id] = 0
      counts[vote.voted_for_id] = 0
    }
    scores[vote.voted_for_id] += vote.rating
    counts[vote.voted_for_id]++
  })

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, display_name')

  const ranking = profiles
    .map((p) => ({
      ...p,
      avg: counts[p.id] ? scores[p.id] / counts[p.id] : 0,
      total: counts[p.id] || 0,
    }))
    .sort((a, b) => {
      if (b.avg !== a.avg) return b.avg - a.avg
      return b.total - a.total
    })

  const userIndex = ranking.findIndex((p) => p.id === userId)

  return {
    rank: userIndex + 1,
    isLast: userIndex === ranking.length - 1,
    total: ranking.length,
  }
}

window.goToVote = async function () {
  await renderVoteScreen()
  showScreen('vote')
}

window.goToRanking = async function () {
  await renderRankingScreen()
  showScreen('ranking')
}

window.goHome = function () {
  showScreen('home')
}

window.confirmLogout = function () {
  showModal({
    icon: '👋',
    title: '¿SALIR DE LA APP?',
    message: '¿Estás seguro/a que querés cerrar sesión?',
    buttons: [
      {
        text: 'CANCELAR',
        className: 'secondary',
        onClick: closeModal,
      },
      {
        text: 'SALIR',
        onClick: () => {
          closeModal()
          logout()
        },
      },
    ],
  })
}

window.logout = async function () {
  if (votesSubscription) {
    supabase.removeChannel(votesSubscription)
    votesSubscription = null
  }
  await supabase.auth.signOut()
  currentUser = null
  window.location.reload()
}

// ============================================
// VOTING
// ============================================

async function renderVoteScreen() {
  const voteList = document.getElementById('vote-list')
  const others = FAMILY_MEMBERS.filter(
    (m) => m.username !== currentUser.username
  )

  voteList.innerHTML = others
    .map(
      (member) => `
    <div class="vote-card" onclick="selectPersonToVote('${member.username}')">
      <img src="assets/icons/${member.icon}" alt="${member.name}">
      <span class="name">${member.name}</span>
    </div>
  `
    )
    .join('')
}

window.selectPersonToVote = function (username) {
  votingForUsername = username
  selectedRating = null

  const member = FAMILY_MEMBERS.find((m) => m.username === username)

  document.getElementById('voting-for-name').textContent = `⭐ ${member.name}`
  document.getElementById(
    'voting-for-avatar'
  ).src = `assets/avatars/${member.gif}`
  document
    .querySelectorAll('.rating-label')
    .forEach((el) => el.classList.remove('active'))

  if (!audioInitialized) {
    Tone.start()
    audioInitialized = true
  }

  setupStarTouchEvents()
  showScreen('vote-stars')
}

window.backToVoteList = function () {
  votingForUsername = null
  selectedRating = null
  showScreen('vote')
}

function setupStarTouchEvents() {
  const starLabels = document.querySelectorAll('.rating-label')

  starLabels.forEach((starEl) => {
    const rating = parseInt(starEl.getAttribute('data-rating'))

    starEl.addEventListener('click', () => {
      selectedRating = rating
      updateStarSelection(rating)
      playSound(rating)
    })

    starEl.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault()
        selectedRating = rating
        updateStarSelection(rating)
        playSound(rating)
      },
      { passive: false }
    )

    starEl.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault()
        const touch = e.touches[0]
        const element = document.elementFromPoint(touch.clientX, touch.clientY)
        const label = element?.closest('.rating-label')

        if (label) {
          const newRating = parseInt(label.getAttribute('data-rating'))
          if (newRating !== selectedRating) {
            selectedRating = newRating
            updateStarSelection(newRating)
            playSound(newRating)
          }
        }
      },
      { passive: false }
    )

    starEl.addEventListener(
      'touchend',
      (e) => {
        e.preventDefault()
      },
      { passive: false }
    )
  })
}

function updateStarSelection(rating) {
  const labels = document.querySelectorAll('.rating-label')

  labels.forEach((label) => {
    const labelRating = parseInt(label.getAttribute('data-rating'))
    if (labelRating <= rating) {
      label.classList.add('active')
    } else {
      label.classList.remove('active')
    }
  })
}

// ============================================
// EMOJI RAIN ANIMATION
// ============================================

let emojiCircles = []
let emojiAnimationId = null

function EmojiCircle(emoji, x, y, vx, vy) {
  this.x = x
  this.y = y
  this.vx = vx
  this.vy = vy
  this.opacity = 0
  this.element = document.createElement('span')
  this.element.className = 'emoji-particle'
  this.element.textContent = emoji
  this.element.style.position = 'absolute'
  this.element.style.fontSize = '32px'
  this.element.style.opacity = '0'
  this.element.style.transform = `translate3d(${x}px, ${y}px, 0)`

  const container = document.getElementById('emoji-rain-container')
  if (container) {
    container.appendChild(this.element)
  }

  this.update = function () {
    if (this.y > window.innerHeight + 100) {
      return false
    }

    this.y += this.vy
    this.x += this.vx

    if (this.opacity < 1) {
      this.opacity += 0.05
    }

    this.element.style.opacity = this.opacity
    this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`

    return true
  }

  this.remove = function () {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
  }
}

function animateEmojis() {
  emojiCircles = emojiCircles.filter((circle) => {
    const alive = circle.update()
    if (!alive) {
      circle.remove()
    }
    return alive
  })

  if (emojiCircles.length > 0) {
    emojiAnimationId = requestAnimationFrame(animateEmojis)
  } else {
    emojiAnimationId = null
  }
}

function stopEmojiRain() {
  if (emojiAnimationId) {
    cancelAnimationFrame(emojiAnimationId)
    emojiAnimationId = null
  }

  emojiCircles.forEach((circle) => circle.remove())
  emojiCircles = []

  const container = document.getElementById('emoji-rain-container')
  if (container) {
    container.innerHTML = ''
  }
}

function createEmojiRain(emoji, count = 50) {
  stopEmojiRain()

  const container = document.getElementById('emoji-rain-container')
  if (!container) return

  const screenWidth = window.innerWidth

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const x = Math.random() * screenWidth
      const y = -50 - Math.random() * 100
      const vx = -0.5 + Math.random() * 1
      const vy = 2 + Math.random() * 3

      const circle = new EmojiCircle(emoji, x, y, vx, vy)
      emojiCircles.push(circle)

      if (i === 0 && !emojiAnimationId) {
        animateEmojis()
      }
    }, i * 50)
  }
}

function playSound(rating) {
  if (!audioInitialized) return

  if (rating === 1) {
    if (currentLongSynth) {
      currentLongSynth.triggerRelease()
      currentLongSynth.dispose()
      currentLongSynth = null
    }

    const synth = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0, decay: 0.1, sustain: 0.5, release: 0.1 },
    }).toDestination()

    currentLongSynth = synth
    synth.triggerAttackRelease('C2', '0.5')

    setTimeout(() => {
      if (currentLongSynth === synth) {
        synth.dispose()
        currentLongSynth = null
      }
    }, 600)

    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 150])
    return
  }

  if (rating === 5) {
    if (currentLongSynth) {
      currentLongSynth.triggerRelease()
      currentLongSynth.dispose()
      currentLongSynth = null
    }

    const synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0, decay: 0.05, sustain: 0, release: 0.05 },
    }).toDestination()

    currentLongSynth = synth

    const now = Tone.now()
    const melody = [
      { note: 'E4', time: 0 },
      { note: 'G4', time: 0.08 },
      { note: 'C5', time: 0.16 },
      { note: 'E5', time: 0.24 },
      { note: 'G5', time: 0.32 },
      { note: 'C6', time: 0.4 },
    ]
    melody.forEach(({ note, time }) => {
      synth.triggerAttackRelease(note, '0.08', now + time)
    })

    setTimeout(() => {
      if (currentLongSynth === synth) {
        synth.dispose()
        currentLongSynth = null
      }
    }, 600)

    if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 100])
    return
  }

  const synth = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
  }).toDestination()

  synth.triggerAttackRelease(SOUND_NOTES[rating - 1], '0.1')

  if (navigator.vibrate) navigator.vibrate(30)
}

window.confirmVote = async function () {
  if (!selectedRating || !votingForUsername) {
    alert('Selecciona una calificación')
    return
  }

  showLoading(true)

  // Get voted person's ID
  const member = FAMILY_MEMBERS.find((m) => m.username === votingForUsername)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', member.email)
    .single()

  if (!profiles) {
    showLoading(false)
    return
  }

  // Register vote
  const { error } = await supabase.from('votes').insert({
    voter_id: currentUser.id,
    voted_for_id: profiles.id,
    rating: selectedRating,
  })

  if (error) {
    console.error('Error votando:', error)
    showLoading(false)
    showModal({
      icon: '😞',
      title: 'ERROR',
      message: 'Hubo un problema al registrar tu voto. Intentá de nuevo.',
      buttons: [{ text: 'OK', onClick: closeModal }],
    })
  } else {
    showLoading(false)

    // Success vibration
    if (navigator.vibrate) navigator.vibrate([100, 50, 100])

    // Trigger emoji animation based on rating
    if (selectedRating === 1) {
      createEmojiRain('💩', 30)
    } else if (selectedRating === 5) {
      createEmojiRain('🎉', 40)
    }

    // Show success modal
    const member = FAMILY_MEMBERS.find((m) => m.username === votingForUsername)
    showModal({
      icon: selectedRating === 1 ? '💩' : selectedRating === 5 ? '🎉' : '⭐',
      title: '¡VOTO REGISTRADO!',
      message: `Le diste ${selectedRating} ${
        selectedRating === 1 ? 'estrella' : 'estrellas'
      } a ${member.name}`,
      buttons: [
        {
          text: 'OK',
          onClick: () => {
            closeModal()
            stopEmojiRain() // Stop animation when closing modal
            votingForUsername = null
            selectedRating = null
            showScreen('home')
          },
        },
      ],
    })
  }
}

// ============================================
// RANKING
// ============================================

async function renderRankingScreen() {
  await loadRanking()
}

window.goToRecentVotes = async function () {
  await loadRecentVotes()
  showScreen('recent-votes')
}

async function loadRanking() {
  const { data: votes } = await supabase
    .from('votes')
    .select('voted_for_id, rating')

  if (!votes) return

  // Calculate average per user
  const scores = {}
  const counts = {}

  votes.forEach((vote) => {
    if (!scores[vote.voted_for_id]) {
      scores[vote.voted_for_id] = 0
      counts[vote.voted_for_id] = 0
    }
    scores[vote.voted_for_id] += vote.rating
    counts[vote.voted_for_id]++
  })

  // Get profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, display_name')

  // Create ranking with ALL users
  const ranking = profiles
    .map((p) => ({
      ...p,
      avg: counts[p.id] ? scores[p.id] / counts[p.id] : 0,
      total: counts[p.id] || 0,
      username: p.email.split('@')[0],
    }))
    .sort((a, b) => {
      // First by average, then by vote count
      if (b.avg !== a.avg) return b.avg - a.avg
      return b.total - a.total
    })

  // Render
  const rankingTable = document.getElementById('ranking-table')
  const totalUsers = ranking.length

  rankingTable.innerHTML = ranking
    .map((user, i) => {
      const member = FAMILY_MEMBERS.find((m) => m.username === user.username)
      const isFirst = i === 0
      const isLast = i === totalUsers - 1
      const posClass =
        i === 0 ? 'first' : i === 1 ? 'second' : i === 2 ? 'third' : ''
      const sizeClass = isFirst ? 'rank-first' : isLast ? 'rank-last' : ''

      return `
      <div class="rank-row ${posClass} ${sizeClass}">
        <div class="position">${i + 1}</div>
        <img src="assets/icons/${member?.icon || 'default.png'}" alt="${
        user.display_name
      }">
        <div class="info">
          <div class="name">${user.display_name}</div>
          <div class="score">${
            user.total > 0
              ? `⭐ ${user.avg.toFixed(1)} (${user.total} votos)`
              : 'Sin votos'
          }</div>
        </div>
        ${isLast ? '<div class="poop-badge">💩</div>' : ''}
      </div>
    `
    })
    .join('')
}

async function loadRecentVotes() {
  const { data: votes } = await supabase
    .from('votes')
    .select(
      `
      rating,
      timestamp,
      voter:profiles!voter_id(email, display_name),
      voted_for:profiles!voted_for_id(email, display_name)
    `
    )
    .order('timestamp', { ascending: false })
    .limit(10)

  if (!votes) return

  const recentVotes = document.getElementById('recent-votes')
  recentVotes.innerHTML = votes
    .map((vote) => {
      const stars = '⭐'.repeat(vote.rating)
      const date = new Date(vote.timestamp)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      let timeAgo
      if (diffMins < 1) {
        timeAgo = 'Ahora'
      } else if (diffMins < 60) {
        timeAgo = `Hace ${diffMins} min`
      } else if (diffHours < 24) {
        timeAgo = `Hace ${diffHours}h`
      } else if (diffDays === 1) {
        timeAgo = 'Ayer'
      } else if (diffDays < 7) {
        timeAgo = `Hace ${diffDays} días`
      } else {
        timeAgo = date.toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
        })
      }

      return `
      <div class="vote-item">
        <div class="vote-info">
          <strong class="voter-name">${
            vote.voter?.display_name || 'Alguien'
          }</strong> votó a
          <strong class="voted-for-name">${
            vote.voted_for?.display_name || 'alguien'
          }</strong> con
          <span class="stars-display">${stars}</span>
        </div>
        <div class="vote-time">${timeAgo}</div>
      </div>
    `
    })
    .join('')
}

// ============================================
// UTILIDADES
// ============================================

async function loadUserData(user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  currentUser = {
    id: user.id,
    email: user.email,
    username: user.email.split('@')[0],
    ...profile,
  }
}

function showScreen(screenName) {
  document
    .querySelectorAll('.screen')
    .forEach((s) => s.classList.remove('active'))
  document.getElementById(`screen-${screenName}`).classList.add('active')
}

function showLoading(show) {
  document.getElementById('loading').classList.toggle('hidden', !show)
}

function showError(elementId, message) {
  const el = document.getElementById(elementId)
  el.textContent = message
  el.classList.remove('hidden')
}

// ============================================
// MODAL
// ============================================

function showModal({ icon, title, message, buttons }) {
  const overlay = document.getElementById('modal-overlay')
  const modalIcon = document.getElementById('modal-icon')
  const modalTitle = document.getElementById('modal-title')
  const modalMessage = document.getElementById('modal-message')
  const modalButtons = document.getElementById('modal-buttons')

  modalIcon.textContent = icon
  modalTitle.textContent = title
  modalMessage.textContent = message

  modalButtons.innerHTML = ''
  buttons.forEach((btn) => {
    const button = document.createElement('button')
    button.textContent = btn.text
    button.className = `modal-btn ${btn.className || ''}`
    button.onclick = btn.onClick
    modalButtons.appendChild(button)
  })

  overlay.classList.remove('hidden')
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay')
  overlay.classList.add('hidden')
}

// ============================================
// NOTIFICATIONS
// ============================================

function setupVoteNotifications() {
  if (!currentUser) return

  // Unsubscribe from previous subscription if exists
  if (votesSubscription) {
    supabase.removeChannel(votesSubscription)
  }

  // Subscribe to new votes in the votes table
  votesSubscription = supabase
    .channel('votes-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'votes',
        filter: `voted_for_id=eq.${currentUser.id}`,
      },
      async (payload) => {
        // Get voter information
        const { data: voterProfile } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('id', payload.new.voter_id)
          .single()

        if (voterProfile) {
          const stars = '⭐'.repeat(payload.new.rating)
          const voterName = voterProfile.display_name || voterProfile.email.split('@')[0]

          showNotification({
            icon: payload.new.rating === 1 ? '💩' : payload.new.rating === 5 ? '🎉' : '⭐',
            title: '¡NUEVO VOTO!',
            message: `${voterName} te votó con ${stars}`,
          })

          // Play sound
          if (audioInitialized) {
            playSound(payload.new.rating)
          }

          // Vibrate
          if (navigator.vibrate) {
            if (payload.new.rating === 1) {
              navigator.vibrate([100, 50, 100, 50, 150])
            } else if (payload.new.rating === 5) {
              navigator.vibrate([50, 30, 50, 30, 100])
            } else {
              navigator.vibrate(30)
            }
          }
        }
      }
    )
    .subscribe()
}

async function requestNotificationPermission() {
  // Check if browser supports notifications
  if (!('Notification' in window)) {
    console.log('Este navegador no soporta notificaciones')
    return false
  }

  // If already granted, no need to ask again
  if (Notification.permission === 'granted') {
    return true
  }

  // If not denied, ask for permission
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

function showNotification({ icon, title, message }) {
  // Show in-app toast notification
  const toast = document.getElementById('notification-toast')
  const iconEl = document.getElementById('notification-icon')
  const titleEl = document.getElementById('notification-title')
  const messageEl = document.getElementById('notification-message')

  iconEl.textContent = icon
  titleEl.textContent = title
  messageEl.textContent = message

  toast.classList.remove('hidden')

  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show')
  }, 10)

  // Hide after 4 seconds
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => {
      toast.classList.add('hidden')
    }, 300)
  }, 4000)

  // Also show browser/system notification if permission granted
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: '/assets/icons/default.png', // You can customize this
      badge: '/assets/icons/default.png',
      tag: 'vote-notification',
      requireInteraction: false,
      vibrate: [200, 100, 200],
    })
  }
}

// Start app
init()
