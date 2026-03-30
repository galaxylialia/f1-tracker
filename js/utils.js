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

// Maps OpenF1 venue/country codes → ISO 3166-1 alpha-2 codes for flag emoji
const VENUE_CODE = {
  // Where OpenF1's 3-letter code doesn't slice cleanly to correct ISO-2
  'CHN': 'CN', 'MON': 'MC', 'NED': 'NL', 'SPA': 'ES', 'MEX': 'MX',
  'ABU': 'AE', 'LAS': 'US', 'MIA': 'US', 'SIN': 'SG', 'POR': 'PT',
  'TUR': 'TR', 'RSA': 'ZA', 'ARG': 'AR', 'PAC': 'JP', 'SMR': 'IT',
  'EUR': 'AZ', 'MAL': 'MY', 'BAH': 'BH',
  // These already work but list for completeness
  'AUS': 'AU', 'JPN': 'JP', 'BHR': 'BH', 'SAU': 'SA', 'AZE': 'AZ',
  'CAN': 'CA', 'AUT': 'AT', 'GBR': 'GB', 'HUN': 'HU', 'BEL': 'BE',
  'ITA': 'IT', 'BRA': 'BR', 'USA': 'US',
}

/** Use this for OpenF1 meeting country_code values instead of countryFlag() */
export function venueFlag(code) {
  if (!code) return ''
  const iso2 = VENUE_CODE[code.toUpperCase()] || code.toUpperCase().slice(0, 2)
  return countryFlag(iso2)
}

// Maps Ergast/Jolpica nationality adjectives → ISO 3166-1 alpha-2 country codes
const NATIONALITY_CODE = {
  'American': 'US', 'Argentine': 'AR', 'Argentinian': 'AR', 'Australian': 'AU',
  'Austrian': 'AT', 'Belgian': 'BE', 'Brazilian': 'BR', 'British': 'GB',
  'Canadian': 'CA', 'Chinese': 'CN', 'Colombian': 'CO', 'Danish': 'DK',
  'Dutch': 'NL', 'Finnish': 'FI', 'French': 'FR', 'German': 'DE',
  'Hungarian': 'HU', 'Indian': 'IN', 'Indonesian': 'ID', 'Italian': 'IT',
  'Japanese': 'JP', 'Luxembourgish': 'LU', 'Malaysian': 'MY', 'Mexican': 'MX',
  'Monegasque': 'MC', 'New Zealander': 'NZ', 'Polish': 'PL', 'Portuguese': 'PT',
  'Russian': 'RU', 'South African': 'ZA', 'Spanish': 'ES', 'Swedish': 'SE',
  'Swiss': 'CH', 'Thai': 'TH', 'Venezuelan': 'VE',
}

export function nationalityFlag(nationality) {
  if (!nationality) return ''
  const code = NATIONALITY_CODE[nationality]
  return code ? countryFlag(code) : ''
}

// Maps Jolpica/Ergast Circuit.Location.country strings → ISO-2 codes
const COUNTRY_NAME_CODE = {
  'Australia': 'AU', 'China': 'CN', 'Japan': 'JP', 'Bahrain': 'BH',
  'Saudi Arabia': 'SA', 'United States': 'US', 'USA': 'US',
  'Italy': 'IT', 'Monaco': 'MC', 'Spain': 'ES', 'Canada': 'CA',
  'Austria': 'AT', 'United Kingdom': 'GB', 'UK': 'GB',
  'Hungary': 'HU', 'Belgium': 'BE', 'Netherlands': 'NL',
  'Singapore': 'SG', 'Azerbaijan': 'AZ', 'Mexico': 'MX',
  'Brazil': 'BR', 'Qatar': 'QA', 'United Arab Emirates': 'AE', 'UAE': 'AE',
}

/**
 * Convert a Jolpica/Ergast race object into an OpenF1-meeting-compatible object.
 * Uses round number as meeting_key so race.html can look up by round.
 */
export function jolpikaRaceToMeeting(race) {
  const country = race.Circuit?.Location?.country || ''
  const code = COUNTRY_NAME_CODE[country] || country.slice(0, 2).toUpperCase()
  const dateStart = race.FirstPractice?.date || race.date
  return {
    meeting_key: parseInt(race.round),
    meeting_name: race.raceName,
    date_start: dateStart,
    date_end: race.date,
    country_code: code,
    circuit_short_name: race.Circuit?.circuitName || race.Circuit?.Location?.locality || '',
    round_number: parseInt(race.round),
    year: parseInt(race.season) || new Date().getFullYear(),
  }
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
