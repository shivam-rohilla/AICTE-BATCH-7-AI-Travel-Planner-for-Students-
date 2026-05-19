import './style.css'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || ''
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

// ── Navigation ────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '/',                label: 'Home' },
  { href: '/planner.html',    label: 'Plan Trip' },
  { href: '/itinerary.html',  label: 'Itinerary' },
  { href: '/destinations.html', label: 'Destinations' },
  { href: '/budget.html',     label: 'Budget Tool' },
]

function buildNav() {
  const current = window.location.pathname
  const isActive = (href) => {
    if (href === '/') return current === '/' || current.endsWith('index.html')
    return current.includes(href.replace('/', ''))
  }

  return `
  <nav class="site-nav" role="navigation" aria-label="Main navigation">
    <div class="nav-inner">
      <a href="/" class="nav-logo">
        <span class="nav-logo-icon">✈️</span>
        <span class="nav-logo-text">StudentTravel<span class="nav-logo-ai">AI</span></span>
      </a>
      <button class="nav-hamburger" id="nav-hamburger" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-links" id="nav-links">
        ${NAV_LINKS.map(l => `
          <li><a href="${l.href}" class="nav-link${isActive(l.href) ? ' nav-link--active' : ''}">${l.label}</a></li>
        `).join('')}
      </ul>
      <button id="theme-toggle" class="theme-toggle" aria-label="Toggle dark mode">
        <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
    </div>
  </nav>`
}

function injectNav() {
  const nav = document.createElement('div')
  nav.innerHTML = buildNav()
  document.body.prepend(nav.firstElementChild)

  document.getElementById('nav-hamburger')?.addEventListener('click', () => {
    const links = document.getElementById('nav-links')
    const btn = document.getElementById('nav-hamburger')
    const open = links.classList.toggle('nav-links--open')
    btn.setAttribute('aria-expanded', open)
  })
}

// ── Theme ─────────────────────────────────────────────────────────────────────

export function initTheme() {
  const saved = localStorage.getItem('atp_v2_theme') || 'dark'
  document.documentElement.setAttribute('data-theme', saved)
  document.addEventListener('click', (e) => {
    if (e.target.closest('#theme-toggle')) {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      localStorage.setItem('atp_v2_theme', next)
    }
  })
}

// ── Chatbot ───────────────────────────────────────────────────────────────────

const QUICK_CHIPS = [
  { label: 'What to do first? 🚀', prompt: 'I just arrived. What should I do first as a student traveler?' },
  { label: 'Cheap food nearby 🍜', prompt: 'Where can I find the cheapest authentic food near me as a student?' },
  { label: 'Safe at night? 🌙', prompt: 'Is it safe to go out at night here? Any areas to avoid?' },
  { label: 'How to get around 🚌', prompt: 'What is the cheapest way to get around the city as a student?' },
  { label: 'Free things to do 🎉', prompt: 'What are some free or very cheap things to do here?' },
  { label: 'Local tips 💡', prompt: 'Give me insider local tips that most tourists miss.' },
]

function getTripContext() {
  try {
    const raw = localStorage.getItem('atp_current_trip')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function buildSystemPrompt(trip) {
  const base = `You are a friendly, knowledgeable AI travel assistant for students. You help with both trip planning AND real-time on-the-ground guidance once travelers arrive at a destination. You always consider student budgets (usually tight!), student-friendly hostels and guesthouses, local cheap eats, safety tips, and cultural etiquette. Keep responses concise, practical, and encouraging. Use bullet points for lists. Include rough cost estimates in INR when helpful.`

  if (!trip) return base

  return `${base}

The traveler currently has a trip planned:
- Destination: ${trip.destination}
- Duration: ${trip.duration} days
- Budget: ₹${trip.budget?.toLocaleString('en-IN') || 'unknown'}
- Accommodation: ${trip.accommodation || 'any'}
- Interests: ${(trip.interests || []).join(', ') || 'general'}

Use this context to give highly personalized advice. When they ask about food, suggest options that fit their budget. When they ask about activities, prioritize their stated interests.`
}

let chatHistory = []

async function callGroqChat(userMessage, trip) {
  if (!GROQ_KEY) {
    return "I need a Groq API key to work. Please add VITE_GROQ_API_KEY to your .env file."
  }

  chatHistory.push({ role: 'user', content: userMessage })

  const messages = [
    { role: 'system', content: buildSystemPrompt(trip) },
    ...chatHistory.slice(-12),
  ]

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `HTTP ${res.status}`)
  }

  const data = await res.json()
  const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not get a response.'
  chatHistory.push({ role: 'assistant', content: reply })
  return reply
}

function formatBotMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)/gm, '<li>$1</li>')
    .replace(/((?:<li>[^\n]*<\/li>\n?)+)/g, match => `<ul>${match}</ul>`)
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
}

function appendMessage(container, role, text) {
  const div = document.createElement('div')
  div.className = `chat-msg chat-msg--${role}`
  if (role === 'bot') {
    div.innerHTML = `<span class="chat-avatar">✈️</span><div class="chat-bubble">${formatBotMessage(text)}</div>`
  } else {
    div.innerHTML = `<div class="chat-bubble">${text}</div><span class="chat-avatar">👤</span>`
  }
  container.appendChild(div)
  container.scrollTop = container.scrollHeight
  return div
}

function appendTyping(container) {
  const div = document.createElement('div')
  div.className = 'chat-msg chat-msg--bot chat-typing'
  div.innerHTML = `<span class="chat-avatar">✈️</span><div class="chat-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`
  container.appendChild(div)
  container.scrollTop = container.scrollHeight
  return div
}

function buildChatbot() {
  return `
  <div id="chatbot-fab" class="chatbot-fab" aria-label="Open travel assistant">
    <span class="chatbot-fab-icon">💬</span>
    <span class="chatbot-fab-badge" id="chatbot-badge">AI</span>
  </div>

  <div id="chatbot-panel" class="chatbot-panel" aria-hidden="true" role="dialog" aria-label="Travel AI Assistant">
    <div class="chatbot-header">
      <div class="chatbot-header-info">
        <span class="chatbot-header-icon">✈️</span>
        <div>
          <div class="chatbot-title">Travel Assistant</div>
          <div class="chatbot-subtitle" id="chatbot-subtitle">Your AI travel guide</div>
        </div>
      </div>
      <button id="chatbot-close" class="chatbot-close" aria-label="Close chat">×</button>
    </div>

    <div class="chatbot-messages" id="chatbot-messages"></div>

    <div class="chatbot-chips" id="chatbot-chips">
      ${QUICK_CHIPS.map(c => `<button class="chat-chip" data-prompt="${c.prompt}">${c.label}</button>`).join('')}
    </div>

    <div class="chatbot-input-row">
      <input type="text" id="chatbot-input" class="chatbot-input" placeholder="Ask anything about your trip…" autocomplete="off" />
      <button id="chatbot-send" class="chatbot-send" aria-label="Send message">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
  </div>`
}

function injectChatbot() {
  const wrapper = document.createElement('div')
  wrapper.className = 'chatbot-wrapper'
  wrapper.innerHTML = buildChatbot()
  document.body.appendChild(wrapper)

  const fab = document.getElementById('chatbot-fab')
  const panel = document.getElementById('chatbot-panel')
  const closeBtn = document.getElementById('chatbot-close')
  const input = document.getElementById('chatbot-input')
  const sendBtn = document.getElementById('chatbot-send')
  const messages = document.getElementById('chatbot-messages')
  const chipsEl = document.getElementById('chatbot-chips')
  const subtitle = document.getElementById('chatbot-subtitle')

  const trip = getTripContext()
  if (trip?.destination) {
    subtitle.textContent = `Planning: ${trip.destination}`
  }

  let isOpen = false

  function openChat() {
    isOpen = true
    panel.classList.add('chatbot-panel--open')
    panel.setAttribute('aria-hidden', 'false')
    fab.classList.add('chatbot-fab--hidden')
    if (messages.children.length === 0) {
      const greeting = trip?.destination
        ? `Hi! I'm your travel assistant. I can see you're planning a trip to **${trip.destination}**! Ask me anything — from pre-trip planning to real-time local tips once you arrive. 🌍`
        : `Hi! I'm your AI travel assistant. Tell me where you're headed or ask me anything about student travel — budgets, packing, safety, local tips, and more! 🌍`
      appendMessage(messages, 'bot', greeting)
    }
    setTimeout(() => input.focus(), 100)
  }

  function closeChat() {
    isOpen = false
    panel.classList.remove('chatbot-panel--open')
    panel.setAttribute('aria-hidden', 'true')
    fab.classList.remove('chatbot-fab--hidden')
  }

  fab.addEventListener('click', openChat)
  closeBtn.addEventListener('click', closeChat)

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeChat()
  })

  async function sendMessage(text) {
    const msg = text.trim()
    if (!msg) return

    input.value = ''
    sendBtn.disabled = true
    chipsEl.style.display = 'none'
    appendMessage(messages, 'user', msg)
    const typing = appendTyping(messages)

    try {
      const currentTrip = getTripContext()
      const reply = await callGroqChat(msg, currentTrip)
      typing.remove()
      appendMessage(messages, 'bot', reply)
    } catch (err) {
      typing.remove()
      appendMessage(messages, 'bot', `Sorry, something went wrong: ${err.message}. Please try again.`)
    } finally {
      sendBtn.disabled = false
      input.focus()
    }
  }

  sendBtn.addEventListener('click', () => sendMessage(input.value))
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input.value)
    }
  })

  chipsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chat-chip')
    if (chip) sendMessage(chip.dataset.prompt)
  })
}

// ── Scroll reveal ─────────────────────────────────────────────────────────────

export function initScrollReveal() {
  const els = document.querySelectorAll('.reveal-on-scroll')
  if (!els.length) return
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target) } })
  }, { threshold: 0.1 })
  els.forEach(el => obs.observe(el))
}

// ── Toast ─────────────────────────────────────────────────────────────────────

export function showToast(message, type = 'success') {
  let toast = document.getElementById('shared-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'shared-toast'
    toast.className = 'toast'
    document.body.appendChild(toast)
  }
  toast.textContent = message
  toast.className = `toast toast--${type} toast--visible`
  clearTimeout(toast._timer)
  toast._timer = setTimeout(() => toast.classList.remove('toast--visible'), 3500)
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initShared() {
  injectNav()
  initTheme()
  injectChatbot()
  initScrollReveal()
}
