import { initShared } from './shared.js'
import { DESTINATIONS } from './data/destinations.js'

initShared()

// ── Parallax + scroll reveal ───────────────────────────────────────────────────

window.addEventListener('scroll', () => {
  const content = document.querySelector('.hero-content')
  const title   = document.querySelector('.hero-massive-title')
  const y = window.scrollY
  if (y < 800) {
    if (content) { content.style.transform = `translateY(${y * 0.4}px)`; content.style.opacity = 1 - y / 600 }
    if (title)     title.style.transform   = `translate(-50%, calc(-50% + ${y * 0.1}px))`
  }
}, { passive: true })

// ── Animated stat counters ────────────────────────────────────────────────────

function animateCounter(el, target, duration = 1800) {
  const start = performance.now()
  const isLarge = target >= 1000
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1)
    const ease = 1 - Math.pow(1 - progress, 3)
    const val = Math.round(ease * target)
    el.textContent = isLarge ? val.toLocaleString() : val
    if (progress < 1) requestAnimationFrame(update)
    else el.textContent = isLarge ? target.toLocaleString() : target
  }
  requestAnimationFrame(update)
}

const statsObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return
    statsObs.unobserve(e.target)
    document.querySelectorAll('[data-count]').forEach(el => {
      animateCounter(el, parseInt(el.dataset.count))
    })
  })
}, { threshold: 0.5 })

const statsGrid = document.querySelector('.stats-grid')
if (statsGrid) statsObs.observe(statsGrid)

// ── Destinations preview ───────────────────────────────────────────────────────

const preview = document.getElementById('dest-preview')
if (preview) {
  const FEATURED = ['goa', 'bangkok', 'prague', 'bali']
  FEATURED.forEach(id => {
    const d = DESTINATIONS.find(x => x.id === id)
    if (!d) return
    const card = document.createElement('div')
    card.className = 'dest-preview-card'
    card.innerHTML = `
      <img src="${d.image}" alt="${d.name}" loading="lazy" />
      <div class="dest-preview-overlay">
        <div class="dest-preview-name">${d.name}</div>
        <div class="dest-preview-budget">From ₹${(d.budgetTotal / 1000).toFixed(0)}k / week</div>
      </div>
    `
    card.addEventListener('click', () => {
      window.location.href = `/planner.html?dest=${encodeURIComponent(d.name)}&budget=${d.budgetTotal}`
    })
    preview.appendChild(card)
  })
}
