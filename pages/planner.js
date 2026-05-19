import { initShared, showToast } from '../shared.js'
import AIService from '../ai-service.js'

initShared()

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || ''
const HISTORY_KEY = 'atp_v2_history'
const TRIP_KEY = 'atp_current_trip'

const ai = new AIService()
ai.setProvider('groq')
ai.setApiKey(GROQ_API_KEY)

const LUCKY_DESTINATIONS = [
  { dest: 'Goa', duration: 5, budget: 20000 },
  { dest: 'Manali', duration: 7, budget: 30000 },
  { dest: 'Bangkok', duration: 7, budget: 40000 },
  { dest: 'Prague', duration: 6, budget: 50000 },
  { dest: 'Bali', duration: 7, budget: 45000 },
  { dest: 'Kathmandu', duration: 5, budget: 20000 },
  { dest: 'Lisbon', duration: 7, budget: 60000 },
]

// ── URL pre-fill ───────────────────────────────────────────────────────────────

const params = new URLSearchParams(location.search)
if (params.get('dest')) {
  document.getElementById('destination').value = decodeURIComponent(params.get('dest'))
}
if (params.get('budget')) {
  document.getElementById('budget').value = params.get('budget')
}

// ── Budget presets ─────────────────────────────────────────────────────────────

document.querySelectorAll('.budget-preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('budget').value = btn.dataset.amount
    document.querySelectorAll('.budget-preset-btn').forEach(b => b.classList.remove('selected'))
    btn.classList.add('selected')
  })
})

// ── Feeling Lucky ──────────────────────────────────────────────────────────────

document.getElementById('feeling-lucky')?.addEventListener('click', () => {
  const pick = LUCKY_DESTINATIONS[Math.floor(Math.random() * LUCKY_DESTINATIONS.length)]
  document.getElementById('destination').value = pick.dest
  document.getElementById('duration').value = pick.duration
  document.getElementById('budget').value = pick.budget
  showToast(`Lucky pick: ${pick.dest} for ${pick.duration} days!`)
})

// ── History ────────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}

function renderHistoryInline() {
  const list = document.getElementById('history-list')
  if (!list) return
  const h = getHistory()
  if (!h.length) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem">No saved trips yet. Generate one to see it here!</p>'
    return
  }
  list.innerHTML = h.slice(0, 5).map(t => `
    <div class="hist-item" style="cursor:pointer" onclick="loadTrip(${t.id})">
      <div class="hist-dest">${escHtml(t.dest)}</div>
      <div class="hist-meta">${t.days} days · ₹${(t.budget || 0).toLocaleString()}</div>
      <div class="hist-date">${new Date(t.at).toLocaleDateString()}</div>
    </div>
  `).join('')
}

function renderHistoryPanel() {
  const list = document.getElementById('history-panel-list')
  if (!list) return
  const h = getHistory()
  if (!h.length) {
    list.innerHTML = '<p class="hist-empty">No saved trips yet.</p>'
    return
  }
  list.innerHTML = h.map(t => `
    <div class="hist-item" style="cursor:pointer" onclick="loadTrip(${t.id})">
      <div class="hist-dest">${escHtml(t.dest)}</div>
      <div class="hist-meta">${t.days} days · ₹${(t.budget || 0).toLocaleString()}</div>
      <div class="hist-date">${new Date(t.at).toLocaleDateString()}</div>
    </div>
  `).join('')
}

window.loadTrip = id => {
  const trip = getHistory().find(t => t.id === id)
  if (!trip?.data) return
  localStorage.setItem(TRIP_KEY, JSON.stringify(trip.data))
  window.location.href = '/itinerary.html'
}

document.getElementById('history-toggle')?.addEventListener('click', () =>
  document.getElementById('history-panel')?.classList.toggle('open')
)
document.getElementById('history-close')?.addEventListener('click', () =>
  document.getElementById('history-panel')?.classList.remove('open')
)

renderHistoryInline()
renderHistoryPanel()

// ── Form Submit ────────────────────────────────────────────────────────────────

document.getElementById('trip-form')?.addEventListener('submit', async e => {
  e.preventDefault()
  const form = e.target
  const tripParams = {
    destination:   form.destination.value.trim(),
    duration:      parseInt(form.duration.value),
    budget:        parseInt(form.budget.value),
    interests:     [...form.querySelectorAll('input[name="interests"]:checked')].map(i => i.value),
    accommodation: form.accommodation.value,
  }
  if (!tripParams.destination || !tripParams.duration || !tripParams.budget) return

  setLoading(true)

  try {
    let itinerary
    if (ai.isAvailable()) {
      try {
        itinerary = await ai.generateItinerary(tripParams)
      } catch (err) {
        console.warn('AI failed:', err.message)
        itinerary = null
      }
    }

    const isDemo = !itinerary
    if (isDemo) itinerary = ai.getDemoItinerary(tripParams)

    const tripData = {
      ...tripParams,
      ...itinerary,
      generatedAt: new Date().toISOString(),
      isDemo,
    }

    // Save for itinerary page
    localStorage.setItem(TRIP_KEY, JSON.stringify(tripData))

    // Save to history
    const history = getHistory()
    history.unshift({
      id: Date.now(),
      dest: tripParams.destination,
      days: tripParams.duration,
      budget: tripParams.budget,
      at: tripData.generatedAt,
      data: tripData,
    })
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)))

    // Navigate to itinerary page
    window.location.href = '/itinerary.html'

  } catch (err) {
    showToast(`Error: ${err.message}`, 'error')
    setLoading(false)
  }
})

function setLoading(on) {
  const btn = document.getElementById('generate-btn')
  if (!btn) return
  btn.disabled = on
  btn.querySelector('.button-text').style.display = on ? 'none' : 'inline'
  btn.querySelector('.button-loader').style.display = on ? 'flex' : 'none'
}
