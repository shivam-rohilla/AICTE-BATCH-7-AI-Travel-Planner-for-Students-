import { initShared, showToast } from '../shared.js'
import L from 'leaflet'

initShared()

const TRIP_KEY = 'atp_current_trip'
const ACTIVITY_ICONS = ['🌅', '🎯', '🍽️', '🎨', '🌃', '✨', '🏛️', '🧗', '🌳', '🛍️', '📸', '🎵']
const BUDGET_CATS = [
  { key: 'accommodation', label: 'Accommodation', color: '#d4af37' },
  { key: 'food',          label: 'Food & Dining',  color: '#f2d06b' },
  { key: 'transport',     label: 'Transport',       color: '#cd7f32' },
  { key: 'activities',    label: 'Activities',      color: '#e6be8a' },
  { key: 'miscellaneous', label: 'Misc / Shopping', color: '#8b7355' },
]
const WEATHER_ICONS = {
  0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️', 45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌦️', 55:'🌧️', 61:'🌧️', 63:'🌧️', 65:'⛈️',
  71:'🌨️', 73:'❄️', 75:'❄️', 80:'🌦️', 81:'🌧️', 82:'⛈️',
  95:'⛈️', 96:'⛈️', 99:'⛈️',
}

// ── Load Trip ──────────────────────────────────────────────────────────────────

let trip = null
try {
  const raw = localStorage.getItem(TRIP_KEY)
  if (raw) trip = JSON.parse(raw)
} catch { trip = null }

if (!trip) {
  document.getElementById('itin-header').style.display = 'none'
  document.getElementById('empty-state').style.display = 'block'
} else {
  renderPage(trip)
}

// ── Render ─────────────────────────────────────────────────────────────────────

function renderPage(it) {
  document.title = `${it.destination} Itinerary — StudentTravelAI`
  document.getElementById('itin-content').style.display = 'block'

  document.getElementById('itin-title').textContent = `${it.destination} — ${it.duration}-Day Itinerary`
  document.getElementById('itin-meta').innerHTML = [
    `<span class="itinerary-meta-pill">💰 ₹${(it.budget || it.totalBudget || 0).toLocaleString()}</span>`,
    `<span class="itinerary-meta-pill">📅 ${it.duration} days</span>`,
    it.accommodation ? `<span class="itinerary-meta-pill">🏨 ${it.accommodation}</span>` : '',
    it.isDemo ? `<span class="itinerary-meta-pill" style="border-color:rgba(251,191,36,0.4);color:#fbbf24">⚡ Demo Mode</span>` : '<span class="itinerary-meta-pill" style="border-color:rgba(34,197,94,0.4);color:#22c55e">✓ AI Generated</span>',
  ].filter(Boolean).join('')

  // Budget summary
  const spent = it.days?.reduce((s, d) => s + (d.activities?.reduce((a, act) => a + (act.estimatedCost || 0), 0) || 0), 0) || 0
  const budget = it.budget || it.totalBudget || 0
  const remaining = budget - spent
  const isOver = remaining < 0
  document.getElementById('budget-summary').innerHTML = `
    <div style="font-size:0.8rem;display:flex;flex-wrap:wrap;gap:0.5rem">
      <span>Budget: <strong>₹${budget.toLocaleString()}</strong></span>
      <span style="color:var(--text-muted)">·</span>
      <span>Planned: <strong>₹${spent.toLocaleString()}</strong></span>
      <span style="color:var(--text-muted)">·</span>
      <span style="color:${isOver ? '#f5576c' : '#4ade80'}">${isOver ? '⚠️ Over by' : '✓ Saves'}: <strong>₹${Math.abs(remaining).toLocaleString()}</strong></span>
    </div>
  `

  // Itinerary timeline
  document.getElementById('itinerary-content').innerHTML = it.days?.map(buildDayCard).join('') || '<p>No itinerary data.</p>'

  // Budget chart
  document.getElementById('budget-chart-container').innerHTML = buildBudgetChart(it.budgetBreakdown)

  // Packing list
  document.getElementById('packing-content').innerHTML = buildPackingList(it.packingList)

  // Tips
  document.getElementById('tips-content').innerHTML = buildTipsPanel(it)

  // Map — defer so browser paints display:block before Leaflet measures the container
  setTimeout(() => initMap(it.days), 80)

  // Weather (non-blocking)
  fetchWeather(it.destination, it.duration).then(w => renderWeather(w, it.duration))

  // Demo banner
  if (it.isDemo) showDemoBanner()

  // Tabs — wire up AFTER content is rendered so panels are populated
  initTabs()
}

// ── Tabs ───────────────────────────────────────────────────────────────────────

const TAB_IDS = ['itinerary', 'budget', 'weather', 'packing', 'tips']

function switchTab(name) {
  TAB_IDS.forEach(id => {
    const panel = document.getElementById(`tab-${id}`)
    if (panel) panel.style.display = id === name ? 'block' : 'none'
  })
  // itinerary panel uses flex layout
  if (name === 'itinerary') {
    document.getElementById('tab-itinerary').style.display = 'flex'
  }
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name)
  })
}

function initTabs() {
  // Ensure only itinerary panel visible on load
  switchTab('itinerary')

  document.getElementById('result-tabs')?.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn')
    if (btn) switchTab(btn.dataset.tab)
  })
}

// ── Map ────────────────────────────────────────────────────────────────────────

let map = null
const geocache = new Map()

function initMap(days) {
  map = L.map('map', { zoomControl: true, attributionControl: true }).setView([20, 0], 2)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://carto.com/">CARTO</a> · © <a href="https://openstreetmap.org">OSM</a>',
  }).addTo(map)
  // Force Leaflet to recalculate container size after paint
  setTimeout(() => map.invalidateSize(), 200)

  const markers = L.layerGroup().addTo(map)
  const bounds = []

  const plotAll = async () => {
    for (const day of (days || [])) {
      for (let i = 0; i < (day.activities?.length || 0); i++) {
        const act = day.activities[i]
        if (!act.location) continue
        try {
          const coords = await geocode(act.location)
          if (!coords) continue
          bounds.push([coords.lat, coords.lon])
          const pin = L.divIcon({
            className: '',
            html: `<div class="map-pin">${ACTIVITY_ICONS[i % ACTIVITY_ICONS.length]}</div>`,
            iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -44],
          })
          L.marker([coords.lat, coords.lon], { icon: pin })
            .addTo(markers)
            .bindPopup(`<div class="map-popup"><strong>${act.name}</strong><br><small>${act.description?.slice(0, 80)}…</small></div>`)
        } catch { /* skip */ }
      }
    }
    if (bounds.length) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 })
  }

  plotAll()
}

async function geocode(name) {
  if (geocache.has(name)) return geocache.get(name)
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`,
    { headers: { 'User-Agent': 'AI-Travel-Planner/2.0' } }
  )
  const data = await res.json()
  if (!data.length) return null
  const r = { lat: +data[0].lat, lon: +data[0].lon }
  geocache.set(name, r)
  return r
}

// ── Day cards ──────────────────────────────────────────────────────────────────

function buildDayCard(day) {
  const dayTotal = day.activities?.reduce((s, a) => s + (a.estimatedCost || 0), 0) || 0
  const acts = day.activities?.map((act, i) => `
    <li class="activity-item">
      <div class="activity-icon">${ACTIVITY_ICONS[i % ACTIVITY_ICONS.length]}</div>
      <div class="activity-details">
        <div class="activity-name">${act.name}</div>
        <div class="activity-time-row">
          ${act.time     ? `<span class="act-time">🕐 ${act.time}</span>` : ''}
          ${act.duration ? `<span class="act-dur">⏱ ${act.duration}</span>` : ''}
          ${act.category ? `<span class="act-cat">${act.category}</span>` : ''}
        </div>
        <div class="activity-description">${act.description}</div>
        ${act.tips     ? `<div class="activity-tip">💡 ${act.tips}</div>` : ''}
        ${act.location ? `<div class="activity-location">📍 ${act.location}</div>` : ''}
      </div>
      <div class="activity-cost${act.estimatedCost === 0 ? ' is-free' : ''}">
        ${act.estimatedCost === 0 ? 'FREE' : '₹' + (act.estimatedCost || 0).toLocaleString()}
      </div>
    </li>
  `).join('') || ''

  return `
    <div class="day-card">
      <h3 class="day-title">Day ${day.day}</h3>
      <p class="day-theme">${day.title || day.theme || ''}</p>
      <ul class="activity-list">${acts}</ul>
      <div class="day-total">Day total: ₹${dayTotal.toLocaleString()}</div>
    </div>
  `
}

// ── Budget chart ───────────────────────────────────────────────────────────────

function buildBudgetChart(breakdown) {
  if (!breakdown) return '<p class="no-data">Budget breakdown not available.</p>'
  const total = Object.values(breakdown).reduce((a, b) => a + (b || 0), 0)
  if (!total) return '<p class="no-data">No budget data to display.</p>'

  const S = 220, CX = S / 2, CY = S / 2, OR = 85, IR = 52
  const pt = (a, r) => {
    const rad = ((a - 90) * Math.PI) / 180
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
  }
  const arc = (a1, a2) => {
    const s = pt(a1, OR), e = pt(a2, OR), si = pt(a2, IR), ei = pt(a1, IR)
    const big = a2 - a1 > 180 ? 1 : 0
    return `M${s.x},${s.y} A${OR},${OR} 0 ${big} 1 ${e.x},${e.y} L${si.x},${si.y} A${IR},${IR} 0 ${big} 0 ${ei.x},${ei.y}Z`
  }

  let angle = 0
  const segs = BUDGET_CATS.map(cat => {
    const val = breakdown[cat.key] || 0
    const sw = (val / total) * 360
    const d = sw > 0.5 ? arc(angle, angle + sw) : ''
    angle += sw
    return { ...cat, val, pct: Math.round((val / total) * 100), d }
  }).filter(s => s.val > 0)

  const paths = segs.map(s => `<path d="${s.d}" fill="${s.color}" class="donut-slice"><title>${s.label}: ₹${s.val.toLocaleString()} (${s.pct}%)</title></path>`).join('')
  const legend = segs.map(s => `
    <div class="leg-row">
      <span class="leg-dot" style="background:${s.color}"></span>
      <span class="leg-name">${s.label}</span>
      <span class="leg-amt">₹${s.val.toLocaleString()}</span>
      <span class="leg-pct">${s.pct}%</span>
    </div>`).join('')

  return `
    <h3 class="tab-heading">Budget Breakdown</h3>
    <div class="chart-layout">
      <div class="svg-wrap">
        <svg viewBox="0 0 ${S} ${S}" class="donut-chart">
          ${paths}
          <text x="${CX}" y="${CY - 10}" class="donut-label-sm" text-anchor="middle">Total</text>
          <text x="${CX}" y="${CY + 14}" class="donut-label-lg" text-anchor="middle">₹${total.toLocaleString()}</text>
        </svg>
      </div>
      <div class="chart-legend">${legend}</div>
    </div>
  `
}

// ── Weather ────────────────────────────────────────────────────────────────────

async function fetchWeather(destination, days) {
  try {
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`)
    const gd = await geo.json()
    if (!gd.results?.length) return null
    const { latitude: lat, longitude: lon, name, country } = gd.results[0]
    const nd = Math.min(Math.max(days, 3), 16)
    const wres = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&forecast_days=${nd}&timezone=auto`)
    const wd = await wres.json()
    return { ...wd, cityName: name, country }
  } catch { return null }
}

function renderWeather(data, tripDays) {
  const panel = document.getElementById('weather-panel')
  if (!panel) return
  if (!data) {
    panel.innerHTML = '<p class="no-data">Weather forecast unavailable for this destination.</p>'
    return
  }
  const { daily, cityName, country } = data
  const count = Math.min(tripDays, daily.time.length)
  const cards = Array.from({ length: count }, (_, i) => {
    const code = daily.weathercode[i]
    const icon = WEATHER_ICONS[code] ?? '🌡️'
    const date = new Date(daily.time[i]).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
    const hi = Math.round(daily.temperature_2m_max[i])
    const lo = Math.round(daily.temperature_2m_min[i])
    const rain = (daily.precipitation_sum[i] ?? 0).toFixed(1)
    return `
      <div class="wx-card">
        <div class="wx-day">Day ${i + 1}</div>
        <div class="wx-date">${date}</div>
        <div class="wx-icon">${icon}</div>
        <div class="wx-temps"><span class="wx-hi">${hi}°C</span><span class="wx-lo">${lo}°C</span></div>
        <div class="wx-rain">💧 ${rain}mm</div>
      </div>
    `
  }).join('')

  panel.innerHTML = `
    <h3 class="tab-heading">Weather — ${cityName}, ${country}</h3>
    <p class="wx-note">Live ${count}-day forecast · <a href="https://open-meteo.com" target="_blank">Open-Meteo</a> · No API key</p>
    <div class="wx-cards">${cards}</div>
  `
}

// ── Packing list ───────────────────────────────────────────────────────────────

function buildPackingList(items) {
  if (!items?.length) return '<p class="no-data">No packing list generated.</p>'
  return `
    <h3 class="tab-heading">AI-Generated Packing List</h3>
    <p class="pack-note">Check items off as you pack.</p>
    <div class="pack-grid">
      ${items.map((item, i) => `
        <label class="pack-item" id="pi-${i}">
          <input type="checkbox" onchange="this.closest('.pack-item').classList.toggle('checked')">
          <span>${item}</span>
        </label>
      `).join('')}
    </div>
  `
}

// ── Tips ───────────────────────────────────────────────────────────────────────

function buildTipsPanel(it) {
  const tips = it.localTips || []
  const emrg = it.emergencyInfo || {}
  const meta = [
    it.bestTimeToVisit && `<strong>Best time to visit:</strong> ${it.bestTimeToVisit}`,
    it.localCurrency   && `<strong>Currency:</strong> ${it.localCurrency}`,
    it.languages?.length && `<strong>Languages:</strong> ${it.languages.join(', ')}`,
  ].filter(Boolean)

  return `
    <h3 class="tab-heading">Local Tips & Essential Info</h3>
    ${meta.length ? `<div class="meta-grid">${meta.map(m => `<p class="meta-item">${m}</p>`).join('')}</div>` : ''}
    ${tips.length ? `<ul class="tips-list">${tips.map(t => `<li>💡 ${t}</li>`).join('')}</ul>` : ''}
    ${Object.keys(emrg).length ? `
      <div class="emrg-block">
        <h4 class="emrg-title">🆘 Emergency Contacts</h4>
        <div class="emrg-grid">
          ${Object.entries(emrg).map(([k, v]) => `
            <div class="emrg-item">
              <span class="emrg-label">${k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
              <span class="emrg-num">${v}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `
}

// ── Demo banner ────────────────────────────────────────────────────────────────

function showDemoBanner() {
  const el = document.createElement('div')
  el.className = 'demo-banner'
  el.innerHTML = `
    <span>⚡</span>
    <span><strong>Demo Mode:</strong> This is sample data — add a valid Groq API key to your .env file to generate real AI itineraries.</span>
    <button onclick="this.closest('.demo-banner').remove()" class="demo-close">×</button>
  `
  document.querySelector('.itinerary-page')?.prepend(el)
}

// ── Actions ────────────────────────────────────────────────────────────────────

document.getElementById('share-btn')?.addEventListener('click', () => {
  if (!trip) return
  const enc = btoa(JSON.stringify({ d: trip.destination, n: trip.duration, b: trip.budget }))
  const url = `${location.origin}/planner.html?trip=${enc}`
  navigator.clipboard.writeText(url)
    .then(() => showToast('Shareable link copied!'))
    .catch(() => prompt('Copy this link:', url))
})

document.getElementById('export-btn')?.addEventListener('click', () => {
  if (!trip) return
  const blob = new Blob([JSON.stringify(trip, null, 2)], { type: 'application/json' })
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `trip-${trip.destination?.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`,
  })
  a.click()
  URL.revokeObjectURL(a.href)
  showToast('Trip exported as JSON!')
})
