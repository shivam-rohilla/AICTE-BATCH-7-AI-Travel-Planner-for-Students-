import { initShared } from '../shared.js'
import { DESTINATIONS } from '../data/destinations.js'

initShared()

const grid = document.getElementById('dest-grid')
const noResults = document.getElementById('dest-no-results')

let activeBudget = 'all'
let activeContinent = 'all'
let activeInterest = 'all'

function formatBudget(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`
  return `₹${n}`
}

function buildCard(d) {
  const el = document.createElement('div')
  el.className = 'dest-card reveal-on-scroll'
  el.innerHTML = `
    <img class="dest-card-img" src="${d.image}" alt="${d.name}" loading="lazy" />
    <div class="dest-card-body">
      <div class="dest-card-location">${d.country} · ${d.continent}</div>
      <div class="dest-card-name">${d.name}</div>
      <div class="dest-card-tagline">${d.tagline}</div>
      <div class="dest-card-meta">
        <div class="dest-card-budget">From <strong>${formatBudget(d.budgetTotal)}</strong> / week</div>
        <div class="dest-card-season">Best: ${d.bestSeason}</div>
      </div>
      <div class="dest-card-tags">
        ${d.tags.map(t => `<span class="dest-tag">${t}</span>`).join('')}
      </div>
      <button class="dest-card-cta" data-dest="${d.name}">Plan a Trip to ${d.name} →</button>
    </div>
  `
  el.querySelector('.dest-card-cta').addEventListener('click', () => {
    window.location.href = `/planner.html?dest=${encodeURIComponent(d.name)}&budget=${d.budgetTotal}`
  })
  return el
}

function filter() {
  const results = DESTINATIONS.filter(d => {
    if (activeBudget !== 'all' && d.budgetTotal > parseInt(activeBudget)) return false
    if (activeContinent !== 'all' && d.continent !== activeContinent) return false
    if (activeInterest !== 'all' && !d.interests.includes(activeInterest)) return false
    return true
  })

  grid.innerHTML = ''
  if (!results.length) {
    noResults.style.display = 'block'
    return
  }
  noResults.style.display = 'none'
  results.forEach(d => grid.appendChild(buildCard(d)))

  // Re-run reveal observer for new cards
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target) } })
  }, { threshold: 0.05 })
  grid.querySelectorAll('.reveal-on-scroll').forEach(el => obs.observe(el))
}

function wireFilters(containerId, key, setter) {
  document.getElementById(containerId)?.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn')
    if (!btn) return
    document.querySelectorAll(`#${containerId} .filter-btn`).forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    setter(btn.dataset[key])
    filter()
  })
}

wireFilters('budget-filters', 'budget', v => { activeBudget = v })
wireFilters('continent-filters', 'continent', v => { activeContinent = v })
wireFilters('interest-filters', 'interest', v => { activeInterest = v })

filter()
