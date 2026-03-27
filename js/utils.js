export function formatLocalTime(isoUtc, options = {}) {
  if (!isoUtc) return '—'
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return new Date(isoUtc).toLocaleString('default', { timeZone: tz, ...options })
}

export function formatDate(isoUtc) {
  if (!isoUtc) return '—'
  return formatLocalTime(isoUtc, { month: 'short', day: 'numeric' })
}

export function formatTime(isoUtc) {
  if (!isoUtc) return '—'
  return formatLocalTime(isoUtc, { hour: '2-digit', minute: '2-digit' })
}

export function formatCountdown(isoUtc) {
  if (!isoUtc) return '—'
  const diff = new Date(isoUtc) - Date.now()
  if (diff <= 0) return 'Started'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function countryFlag(code) {
  if (!code || code.length < 2) return ''
  const c = code.toUpperCase().slice(0, 2)
  return [...c].map(ch => String.fromCodePoint(0x1F1E6 + ch.charCodeAt(0) - 65)).join('')
}

export function formatLapTime(seconds) {
  if (seconds == null || isNaN(seconds)) return '—'
  const m = Math.floor(seconds / 60)
  const s = (seconds % 60).toFixed(3).padStart(6, '0')
  return `${m}:${s}`
}

export function animateNumber(el, target, duration = 500) {
  const start = performance.now()
  const n = parseFloat(target)
  if (isNaN(n)) { el.textContent = target; return }
  function step(now) {
    const t = Math.min((now - start) / duration, 1)
    const ease = 1 - Math.pow(1 - t, 3)
    el.textContent = Number.isInteger(n) ? Math.round(n * ease) : (n * ease).toFixed(1)
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

export function getParam(key) {
  return new URLSearchParams(location.search).get(key)
}

export function sessionLabel(name) {
  const map = {
    'Race': '正赛', 'Qualifying': '排位赛', 'Sprint': 'Sprint 正赛',
    'Sprint Qualifying': 'Sprint 排位赛', 'Sprint Shootout': 'Sprint 排位赛',
    'Practice 1': 'FP1', 'Practice 2': 'FP2', 'Practice 3': 'FP3',
  }
  return map[name] || name
}

export function initNav(pageName) {
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.dataset.page === pageName) a.classList.add('active')
  })
  const toggle = document.getElementById('nav-toggle')
  const links = document.getElementById('nav-links')
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'))
  }
}
