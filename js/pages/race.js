import { openF1 } from '../api/openf1.js'
import { jolpica } from '../api/jolpica.js'
import { raceResultTable, qualifyingResultTable, pitStopTable, breadcrumb, skeletonRows } from '../components.js'
import { getParam, venueFlag, formatLapTime, jolpikaRaceToMeeting, initNav, sessionLabel } from '../utils.js'
import { getCircuitInfo, formatInTz } from '../config/circuitInfo.js'
import { YEAR, startPolling, stopPolling } from '../state.js'

initNav('schedule')

const app = document.getElementById('app')
const meetingKey = getParam('meeting_key')

if (!meetingKey) {
  app.innerHTML = `<div style="padding:24px"><p class="text-2">缺少 meeting_key 参数。请从<a href="schedule.html" style="color:var(--color-accent)">赛程页</a>进入。</p></div>`
} else {
  app.innerHTML = `<div style="padding:8px">${skeletonRows(12)}</div>`
  init()
}

// Module-level state
let currentMeeting = null
let jolpikaRound    = null
let matchRace       = null   // raw Jolpica race object
let activeTabs      = []
let activeTabKey    = 'race'

async function init() {
  // Load Jolpica schedule (always works) + OpenF1 sessions in parallel
  // OpenF1 sessions will only return data if meetingKey is a real OpenF1 meeting_key
  const [raceSchedule, sessions] = await Promise.all([
    jolpica.getRaceSchedule(YEAR).catch(() => null),
    openF1.getSessions({ meeting_key: meetingKey }).catch(() => []),
  ])

  const jolpikaRaces = raceSchedule?.RaceTable?.Races || []

  // Match by round number (links from schedule page use round as meeting_key)
  matchRace = jolpikaRaces.find(r => parseInt(r.round) === parseInt(meetingKey))

  // If no match by round, try matching by OpenF1 meeting name
  if (!matchRace && sessions.length) {
    const mName = sessions[0]?.meeting_name || ''
    matchRace = jolpikaRaces.find(r =>
      r.raceName === mName ||
      mName.includes(r.raceName.replace(' Grand Prix', ''))
    )
  }

  jolpikaRound  = matchRace ? parseInt(matchRace.round) : null
  currentMeeting = matchRace ? jolpikaRaceToMeeting(matchRace) : null
  if (currentMeeting) currentMeeting.meeting_key = parseInt(meetingKey)

  if (!currentMeeting && !sessions.length) {
    app.innerHTML = `<div style="padding:24px"><p class="text-2">找不到赛事数据</p></div>`
    return
  }

  const flag = venueFlag(currentMeeting?.country_code || '')
  const now  = Date.now()

  // ── Build tabs ─────────────────────────────────────────────────────────────
  // Priority 1: OpenF1 sessions (real-time, works only with true OpenF1 meeting_key)
  const raceSession  = sessions.find(s => s.session_name === 'Race')
  const qualiSession = sessions.find(s => s.session_name === 'Qualifying')
  const sprintSession = sessions.find(s => s.session_name === 'Sprint')
  const practiceSessions = sessions
    .filter(s => s.session_type === 'Practice')
    .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))

  const openF1Tabs = [
    qualiSession && { key: 'qualifying', label: '排位赛', session: qualiSession },
    raceSession   && { key: 'race',      label: '正赛',   session: raceSession },
    sprintSession && { key: 'sprint',    label: 'Sprint', session: sprintSession },
    ...practiceSessions.map((s, i) => ({ key: `fp${i+1}`, label: `FP${i+1}`, session: s })),
  ].filter(Boolean)

  // Priority 2: Jolpica-based tabs (always available, no OpenF1 needed)
  function jolpikaDateIso(dateStr, timeStr) {
    if (!dateStr) return null
    return `${dateStr}T${timeStr || '00:00:00Z'}`
  }

  let jolpikaTabs = []
  if (matchRace) {
    const raceIso   = jolpikaDateIso(matchRace.date, matchRace.time)
    const qualiIso  = jolpikaDateIso(matchRace.Qualifying?.date, matchRace.Qualifying?.time)
    const sprintIso = jolpikaDateIso(matchRace.Sprint?.date, matchRace.Sprint?.time)
    const racePast  = raceIso && new Date(raceIso).getTime() < now
    const qualiPast = qualiIso && new Date(qualiIso).getTime() < now
    const sprintPast = sprintIso && new Date(sprintIso).getTime() < now

    if (racePast) {
      // Completed race — show results tabs + schedule/circuit tab
      if (qualiPast) jolpikaTabs.push({ key: 'qualifying', label: '排位赛', startIso: qualiIso })
      if (sprintPast) jolpikaTabs.push({ key: 'sprint', label: 'Sprint', startIso: sprintIso })
      jolpikaTabs.push({ key: 'race', label: '正赛', startIso: raceIso })
      jolpikaTabs.push({ key: 'schedule', label: '赛道信息', startIso: raceIso })
    } else {
      // Future/upcoming — show schedule tab
      jolpikaTabs.push({ key: 'schedule', label: '赛程安排', startIso: raceIso })
    }
  }

  activeTabs  = openF1Tabs.length ? openF1Tabs : jolpikaTabs
  activeTabKey = activeTabs.find(t => t.key === 'race')?.key || activeTabs[0]?.key || 'race'

  // ── Render page shell ──────────────────────────────────────────────────────
  app.innerHTML = `
    ${breadcrumb([{ label: '赛程', href: 'schedule.html' }, { label: currentMeeting?.meeting_name || 'Grand Prix' }])}
    <div class="hero-strip fade-up" style="margin-bottom:24px">
      <div class="hero-strip-main">
        <div class="label" style="margin-bottom:6px">
          Round ${currentMeeting?.round_number || ''} · ${currentMeeting?.year || YEAR}
        </div>
        <div class="page-title">${flag} ${currentMeeting?.meeting_name || 'Grand Prix'}</div>
        <div class="card-sub" style="margin-top:4px">${matchRace?.Circuit?.circuitName || currentMeeting?.circuit_short_name || ''}</div>
      </div>
    </div>

    ${activeTabs.length ? `
      <div class="tabs" id="session-tabs">
        ${activeTabs.map(t => `
          <button class="tab-btn${t.key === activeTabKey ? ' active' : ''}" data-tab="${t.key}">
            ${t.label}
          </button>
        `).join('')}
      </div>
    ` : ''}
    <div id="tab-content">${skeletonRows(10)}</div>
  `

  document.getElementById('session-tabs')?.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn')
    if (!btn) return
    stopPolling()
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    activeTabKey = btn.dataset.tab
    loadTab(activeTabs.find(t => t.key === activeTabKey))
  })

  loadTab(activeTabs.find(t => t.key === activeTabKey))
}

// ── Tab content loader ─────────────────────────────────────────────────────
async function loadTab(tabObj) {
  const content = document.getElementById('tab-content')
  if (!content || !tabObj) return
  content.innerHTML = skeletonRows(10)
  stopPolling()

  const tab     = tabObj.key
  const session = tabObj.session   // OpenF1 session (may be null for Jolpica-only tabs)
  const round   = jolpikaRound
  const year    = currentMeeting?.year || YEAR
  const now     = Date.now()

  // Determine timing: prefer OpenF1 session times, fall back to Jolpica ISO string
  const startIso = session?.date_start || tabObj.startIso
  const endIso   = session?.date_end   || (startIso ? addHours(startIso, tab === 'race' ? 2 : tab === 'sprint' ? 0.75 : 1) : null)
  const startMs  = startIso ? new Date(startIso).getTime() : null
  const endMs    = endIso   ? new Date(endIso).getTime()   : null
  const isFuture = startMs && startMs > now
  const isPast   = endMs   && endMs   < now
  const isLive   = startMs && endMs   && now >= startMs && now <= endMs

  // ── Schedule tab (upcoming race) ──────────────────────────────────────────
  if (tab === 'schedule') {
    renderScheduleTab(content)
    return
  }

  // ── Future session → countdown ────────────────────────────────────────────
  if (isFuture && !isPast) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const localStr = new Date(startIso).toLocaleString('default', {
      timeZone: tz, month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
    content.innerHTML = `
      <div style="text-align:center;padding:48px 24px">
        <div class="label" style="margin-bottom:12px">${sessionLabel(tab)} 尚未开始</div>
        <div class="countdown" id="session-countdown" style="font-size:48px"></div>
        <div class="countdown-label" style="margin-top:8px">距离开始</div>
        <div class="card-sub" style="margin-top:12px">${localStr}</div>
      </div>
    `
    function tick() {
      const el = document.getElementById('session-countdown')
      if (!el) return
      const diff = startMs - Date.now()
      if (diff <= 0) { el.textContent = '已开始'; return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      el.textContent = d > 0 ? `${d}d ${h}h ${m}m` : `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    }
    tick()
    startPolling(tick, 1000)
    return
  }

  try {
    // ── Race / Sprint results ─────────────────────────────────────────────
    if (tab === 'race' || tab === 'sprint') {
      if (!round) { content.innerHTML = `<p class="text-2" style="padding:16px 0">暂无数据</p>`; return }
      const endpoint = tab === 'sprint' ? 'sprint' : 'results'
      const [res, pitRes] = await Promise.all([
        fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/${endpoint}.json`)
          .then(r => r.json()).catch(() => null),
        tab === 'race'
          ? fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/pitstops.json?limit=100`)
              .then(r => r.json()).catch(() => null)
          : Promise.resolve(null),
      ])
      const results  = res?.MRData?.RaceTable?.Races?.[0]?.Results ||
                       res?.MRData?.RaceTable?.Races?.[0]?.SprintResults || []
      const pitList  = pitRes?.MRData?.RaceTable?.Races?.[0]?.PitStops || []

      content.innerHTML = `
        <div class="table-scroll" style="margin-bottom:28px">${raceResultTable(results)}</div>
        ${pitList.length ? `<div class="section-title" style="margin-bottom:12px;font-size:16px">进站记录</div><div class="table-scroll">${pitStopTable(pitList)}</div>` : ''}
      `
      if (isLive) startPolling(async () => {
        const fresh = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/${endpoint}.json`)
          .then(r => r.json()).catch(() => null)
        const freshResults = fresh?.MRData?.RaceTable?.Races?.[0]?.Results || []
        const tbody = content.querySelector('tbody')
        if (tbody && freshResults.length) {
          tbody.innerHTML = freshResults.map(r => {
            const status  = r.status === 'Finished' ? (r.Time?.time || '—') : r.status
            const fastest = r.FastestLap?.rank === '1' ? `<span style="color:var(--color-accent)">⚡</span>` : ''
            return `<tr class="flash">
              <td class="mono-cell">${r.position}</td>
              <td>${r.Driver?.code || ''} ${fastest}</td>
              <td class="text-2">${r.Constructor?.name || ''}</td>
              <td class="mono-cell">${r.laps || '—'}</td>
              <td class="mono-cell">${status}</td>
              <td class="mono-cell" style="text-align:right">${r.points || 0}</td>
            </tr>`
          }).join('')
        }
      })

    // ── Qualifying results ──────────────────────────────────────────────────
    } else if (tab === 'qualifying') {
      if (!round) { content.innerHTML = `<p class="text-2" style="padding:16px 0">暂无数据</p>`; return }
      const data    = await jolpica.getQualifyingResults(year, round).catch(() => null)
      const results = data?.RaceTable?.Races?.[0]?.QualifyingResults || []
      content.innerHTML = `<div class="table-scroll">${qualifyingResultTable(results)}</div>`
      if (isLive) startPolling(async () => {
        const fresh = await jolpica.getQualifyingResults(year, round).catch(() => null)
        if (fresh) content.innerHTML = `<div class="table-scroll">${qualifyingResultTable(fresh?.RaceTable?.Races?.[0]?.QualifyingResults || [])}</div>`
      })

    // ── Practice (OpenF1 only) ──────────────────────────────────────────────
    } else if (tab.startsWith('fp') || tab === 'sprint_qualifying') {
      if (!session) { content.innerHTML = `<p class="text-2" style="padding:16px 0">练习赛暂无数据</p>`; return }

      const [positions, drivers, laps] = await Promise.all([
        openF1.getPosition(session.session_key),
        openF1.getDrivers(session.session_key),
        openF1.getLaps(session.session_key).catch(() => []),
      ])
      const latest = {}
      positions.forEach(p => { latest[p.driver_number] = p })
      const sorted = Object.values(latest).sort((a, b) => a.position - b.position)
      const driverMap = {}
      drivers.forEach(d => { driverMap[d.driver_number] = d })
      const fastestLap = {}
      laps.forEach(lap => {
        if (lap.lap_duration > 0) {
          const n = lap.driver_number
          if (!fastestLap[n] || lap.lap_duration < fastestLap[n]) fastestLap[n] = lap.lap_duration
        }
      })
      function buildRows(list, flash = false) {
        return list.map(p => {
          const d = driverMap[p.driver_number] || {}
          return `<tr${flash ? ' class="flash"' : ''}>
            <td class="mono-cell">${p.position}</td>
            <td>${d.name_acronym || p.driver_number}</td>
            <td class="text-2" style="font-size:12px">${d.team_name || ''}</td>
            <td class="mono-cell">${fastestLap[p.driver_number] ? formatLapTime(fastestLap[p.driver_number]) : '—'}</td>
          </tr>`
        }).join('')
      }
      content.innerHTML = `
        <div class="table-scroll">
        <table class="result-table">
          <thead><tr><th>#</th><th>车手</th><th>车队</th><th>最快圈</th></tr></thead>
          <tbody>${buildRows(sorted)}</tbody>
        </table>
        </div>
        ${isLive ? '<div class="badge badge-live" style="margin-top:12px"><span class="pulse-dot"></span> 实时</div>' : ''}
      `
      if (isLive) startPolling(async () => {
        const [fp, fl] = await Promise.all([
          openF1.getPosition(session.session_key).catch(() => null),
          openF1.getLaps(session.session_key).catch(() => null),
        ])
        if (!fp) return
        if (fl) fl.forEach(lap => {
          if (lap.lap_duration > 0) {
            const n = lap.driver_number
            if (!fastestLap[n] || lap.lap_duration < fastestLap[n]) fastestLap[n] = lap.lap_duration
          }
        })
        const freshLatest = {}
        fp.forEach(p => { freshLatest[p.driver_number] = p })
        const tbody = content.querySelector('tbody')
        if (tbody) tbody.innerHTML = buildRows(Object.values(freshLatest).sort((a, b) => a.position - b.position), true)
      })

    } else {
      content.innerHTML = `<p class="text-2" style="padding:16px 0">暂无数据</p>`
    }
  } catch (err) {
    content.innerHTML = `<p class="text-2" style="padding:16px 0">加载失败：${err.message}</p>`
    stopPolling()
  }
}

// ── Schedule tab: session timetable + circuit info ─────────────────────────
function renderScheduleTab(content) {
  if (!matchRace) {
    content.innerHTML = `<p class="text-2" style="padding:16px 0">暂无赛程数据</p>`
    return
  }

  const circuitId   = matchRace.Circuit?.circuitId || ''
  const circuitInfo = getCircuitInfo(circuitId)
  const circuitTz   = circuitInfo?.timezone || null
  const userTz      = Intl.DateTimeFormat().resolvedOptions().timeZone
  const hasCircuitTz = circuitTz && circuitTz !== userTz
  const now         = Date.now()

  // Build session list from Jolpica race fields
  const sessionMap = [
    ['FirstPractice',    'Practice 1'],
    ['SecondPractice',   'Practice 2'],
    ['ThirdPractice',    'Practice 3'],
    ['SprintQualifying', 'Sprint Qualifying'],
    ['Sprint',           'Sprint'],
    ['Qualifying',       'Qualifying'],
  ]
  const sessions = []
  for (const [key, name] of sessionMap) {
    const s = matchRace[key]
    if (s?.date) sessions.push({ name, iso: `${s.date}T${s.time || '00:00:00Z'}` })
  }
  if (matchRace.date) sessions.push({ name: 'Race', iso: `${matchRace.date}T${matchRace.time || '00:00:00Z'}` })
  sessions.sort((a, b) => new Date(a.iso) - new Date(b.iso))

  // showCircuit is toggled by the button; default = local time
  let showCircuit = false

  function sessionRow(s) {
    const start = new Date(s.iso).getTime()
    const dur   = s.name === 'Race' ? 7200000 : s.name === 'Sprint' ? 2700000 : 3600000
    const end   = start + dur
    let badge = ''
    if (now >= start && now <= end)  badge = `<span class="badge badge-live"><span class="pulse-dot"></span> LIVE</span>`
    else if (now < start)            badge = `<span class="badge badge-next">即将开始</span>`
    else                             badge = `<span class="badge badge-done">已结束</span>`

    const localTime   = formatInTz(s.iso, userTz,      { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    const circuitTime = hasCircuitTz
      ? formatInTz(s.iso, circuitTz, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
      : null

    const timeStr = (showCircuit && circuitTime) ? `🏁 ${circuitTime}` : `🕐 ${localTime}`
    return `<div style="padding:10px 0;border-bottom:1px solid var(--color-border)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <div style="font-weight:600;font-size:13px">${sessionLabel(s.name)}</div>
        ${badge}
      </div>
      <div style="font-size:11px;color:var(--color-text-2);margin-top:4px">${timeStr}</div>
    </div>`
  }

  function renderSessions() {
    const list = content.querySelector('#session-list')
    if (list) list.innerHTML = sessions.map(sessionRow).join('')
    const btn = content.querySelector('#tz-switch-btn')
    if (btn && hasCircuitTz) {
      btn.textContent = showCircuit ? '本地时间' : '赛道时间'
    }
  }

  const circuitSection = circuitInfo ? `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--color-border)">
      <div class="section-title" style="font-size:16px;margin-bottom:12px">赛道信息</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div style="background:var(--color-surface-2);border-radius:6px;padding:10px 12px">
          <div style="font-size:20px;font-weight:700;font-family:var(--font-mono)">${circuitInfo.length} <span style="font-size:11px;font-weight:400">km</span></div>
          <div style="font-size:10px;color:var(--color-text-2);margin-top:2px;text-transform:uppercase;letter-spacing:.04em">全长</div>
        </div>
        <div style="background:var(--color-surface-2);border-radius:6px;padding:10px 12px">
          <div style="font-size:20px;font-weight:700;font-family:var(--font-mono)">${circuitInfo.laps}</div>
          <div style="font-size:10px;color:var(--color-text-2);margin-top:2px;text-transform:uppercase;letter-spacing:.04em">正赛圈数</div>
        </div>
        <div style="background:var(--color-surface-2);border-radius:6px;padding:10px 12px">
          <div style="font-size:20px;font-weight:700;font-family:var(--font-mono)">${circuitInfo.corners}</div>
          <div style="font-size:10px;color:var(--color-text-2);margin-top:2px;text-transform:uppercase;letter-spacing:.04em">弯道数</div>
        </div>
        <div style="background:var(--color-surface-2);border-radius:6px;padding:10px 12px">
          <div style="font-size:15px;font-weight:700;font-family:var(--font-mono)">${circuitInfo.lapRecord.time}</div>
          <div style="font-size:10px;color:var(--color-text-2);margin-top:2px;text-transform:uppercase;letter-spacing:.04em">圈速记录</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--color-text-2)">⚡ ${circuitInfo.lapRecord.time} — ${circuitInfo.lapRecord.driver} (${circuitInfo.lapRecord.year})</div>
      ${matchRace.Circuit?.Location ? `<div style="font-size:11px;color:var(--color-text-3);margin-top:4px">📍 ${matchRace.Circuit.Location.locality}, ${matchRace.Circuit.Location.country}</div>` : ''}
    </div>` : ''

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div class="label">赛程安排</div>
      ${hasCircuitTz ? `
        <button id="tz-switch-btn" style="font-size:11px;color:var(--color-accent);background:transparent;
          border:1px solid var(--color-accent);border-radius:4px;padding:3px 8px;cursor:pointer">
          赛道时间
        </button>` : ''}
    </div>
    <div id="session-list">${sessions.map(sessionRow).join('')}</div>
    ${circuitSection}
  `

  if (hasCircuitTz) {
    content.querySelector('#tz-switch-btn')?.addEventListener('click', () => {
      showCircuit = !showCircuit
      renderSessions()
    })
  }
}

function addHours(isoStr, hours) {
  return new Date(new Date(isoStr).getTime() + hours * 3600000).toISOString()
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPolling()
})
