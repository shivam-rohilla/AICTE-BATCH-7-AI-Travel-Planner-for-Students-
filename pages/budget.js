import { initShared } from '../shared.js'

initShared()

// ── Currency Converter ────────────────────────────────────────────────────────

const fromAmountEl = document.getElementById('from-amount')
const toAmountEl = document.getElementById('to-amount')
const fromCurrEl = document.getElementById('from-currency')
const toCurrEl = document.getElementById('to-currency')
const resultEl = document.getElementById('currency-result')
const rateNoteEl = document.getElementById('rate-note')
const swapBtn = document.getElementById('swap-currencies')

let rates = {}
let ratesLoaded = false

async function loadRates(base) {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`)
    const data = await res.json()
    if (data.result === 'success') {
      rates = data.rates
      ratesLoaded = true
      rateNoteEl.textContent = `Rates updated: ${new Date(data.time_last_update_utc).toLocaleDateString()} · Source: ExchangeRate-API`
      convert()
    }
  } catch {
    rateNoteEl.textContent = 'Could not load live rates — try refreshing the page.'
  }
}

function convert() {
  if (!ratesLoaded || !rates) return
  const amount = parseFloat(fromAmountEl.value) || 0
  const to = toCurrEl.value
  const rate = rates[to]
  if (!rate) return
  const result = amount * rate
  toAmountEl.value = result.toFixed(to === 'JPY' || to === 'IDR' || to === 'NPR' ? 0 : 2)
  resultEl.innerHTML = `<strong>${amount.toLocaleString()} ${fromCurrEl.value}</strong> = <strong>${result.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to}</strong>`
}

fromAmountEl.addEventListener('input', convert)
fromCurrEl.addEventListener('change', () => loadRates(fromCurrEl.value))
toCurrEl.addEventListener('change', convert)
swapBtn.addEventListener('click', () => {
  const tmp = fromCurrEl.value
  fromCurrEl.value = toCurrEl.value
  toCurrEl.value = tmp
  loadRates(fromCurrEl.value)
})

loadRates(fromCurrEl.value)

// ── Daily Budget Sliders ──────────────────────────────────────────────────────

const SLIDERS = [
  { id: 'sl-accommodation', valId: 'val-accommodation' },
  { id: 'sl-food',          valId: 'val-food' },
  { id: 'sl-transport',     valId: 'val-transport' },
  { id: 'sl-activities',    valId: 'val-activities' },
  { id: 'sl-misc',          valId: 'val-misc' },
]

function fmt(n) { return '₹' + n.toLocaleString('en-IN') }

function updateDailyBudget() {
  let total = 0
  SLIDERS.forEach(({ id, valId }) => {
    const v = parseInt(document.getElementById(id).value) || 0
    document.getElementById(valId).textContent = fmt(v)
    total += v
  })
  document.getElementById('budget-daily-total').textContent = fmt(total)

  const daysEl = document.getElementById('sl-trip-days')
  const days = parseInt(daysEl?.value) || 7
  const breakdown = document.getElementById('trip-budget-breakdown')
  if (breakdown) {
    breakdown.innerHTML = [
      `<div class="budget-breakdown-item">7-day trip: <span>${fmt(total * 7)}</span></div>`,
      `<div class="budget-breakdown-item">${days}-day trip: <span>${fmt(total * days)}</span></div>`,
      `<div class="budget-breakdown-item">Per person (2): <span>${fmt(Math.ceil(total / 2))}</span></div>`,
      `<div class="budget-breakdown-item">Monthly budget: <span>${fmt(total * 30)}</span></div>`,
    ].join('')
  }
}

SLIDERS.forEach(({ id }) => {
  document.getElementById(id)?.addEventListener('input', updateDailyBudget)
})
updateDailyBudget()

// ── Group Split ───────────────────────────────────────────────────────────────

const totalCostEl = document.getElementById('total-cost')
const groupSizeEl = document.getElementById('group-size')
const tripDaysEl = document.getElementById('sl-trip-days')
const tripDaysValEl = document.getElementById('val-trip-days')
const splitResultEl = document.getElementById('split-result')

function updateSplit() {
  const total = parseFloat(totalCostEl.value) || 0
  const people = parseInt(groupSizeEl.value) || 1
  const days = parseInt(tripDaysEl.value) || 7
  tripDaysValEl.textContent = `${days} day${days !== 1 ? 's' : ''}`

  const perPerson = total / people
  const perDay = total / days
  const perPersonPerDay = total / (people * days)

  splitResultEl.innerHTML = `
    <div class="split-result-row"><span>Total trip cost</span><span>${fmt(total)}</span></div>
    <div class="split-result-row"><span>Duration</span><span>${days} days</span></div>
    <div class="split-result-row"><span>Group size</span><span>${people} people</span></div>
    <div class="split-result-row"><span>Daily cost (group)</span><span>${fmt(Math.ceil(perDay))}</span></div>
    <div class="split-result-row"><span>Per person per day</span><span>${fmt(Math.ceil(perPersonPerDay))}</span></div>
    <div class="split-result-row"><span>Each person pays</span><span>${fmt(Math.ceil(perPerson))}</span></div>
  `

  updateDailyBudget()
}

totalCostEl.addEventListener('input', updateSplit)
groupSizeEl.addEventListener('input', updateSplit)
tripDaysEl.addEventListener('input', updateSplit)
updateSplit()
