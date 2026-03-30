import { detectRaceState, YEAR } from '../state.js'
import { jolpica } from '../api/jolpica.js'
import { driverStandingRow, constructorStandingRow, skeletonRows, meetingCard } from '../components.js'
import { formatCountdown, formatDate, formatTime, venueFlag, jolpikaRaceToMeeting, initNav } from '../utils.js'
import { getCircuitInfo, formatInTz } from '../config/circuitInfo.js'

initNav('home')

const app = document.getElementById('app')

// Show skeleton while loading
app.innerHTML = `
  <div class="skeleton skel-title" style="margin-bottom:24px;max-width:320px"></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
    <div>${skeletonRows(8)}</div>
    <div>${skeletonRows(5)}</div>
  </div>
`

async function init() {
  const [raceState, driverData, constructorData, scheduleData] = await Promise.all([
    detectRaceState().catch(() => null),               // null = failed
    jolpica.getDriverStandings(YEAR).catch(() => null),
    jolpica.getConstructorStandings(YEAR).catch(() => null),
    jolpica.getRaceSchedule(YEAR).catch(() => null),   // null = failed
  ])

  // Convert Jolpica race schedule to meeting-like objects for display
  const meetings = scheduleData
    ? (scheduleData.RaceTable?.Races || []).map(jolpikaRaceToMeeting)
    : null   // null = API failed, [] = no races (season ended)

  const driverStandings = driverData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || []
  const constructorStandings = constructorData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || []

  const jolpikaRaces = scheduleData?.RaceTable?.Races || []

  if (raceState?.state === 'RACE_WEEKEND') {
    renderRaceWeekend(raceState, driverStandings, constructorStandings)
  } else {
    renderNoRace(meetings, driverStandings, constructorStandings, jolpikaRaces)
  }
}

function renderNoRace(meetings, driverStandings, constructorStandings, jolpikaRaces = []) {
  const now = Date.now()

  // meetings === null means API failed; meetings === [] means genuinely no races
  const hasMeetings = Array.isArray(meetings) && meetings.length > 0
  const meetingsFailed = meetings === null

  const sorted = hasMeetings
    ? [...meetings].sort((a, b) => new Date(a.date_start) - new Date(b.date_start))
    : []

  const nextMeeting = sorted.find(m => {
    const end = new Date(m.date_end || m.date_start).getTime() + 86400000
    return end > now
  })
  const lastMeeting = [...sorted].reverse().find(m => {
    const end = new Date(m.date_end || m.date_start).getTime() + 86400000
    return end <= now
  })

  const flag = nextMeeting ? venueFlag(nextMeeting.country_code || '') : ''

  // Find original Jolpica race for circuit info + accurate race time
  const nextRace = jolpikaRaces.find(r => parseInt(r.round) === nextMeeting?.round_number)
  const raceIso = nextRace ? `${nextRace.date}T${nextRace.time || '00:00:00Z'}` : nextMeeting?.date_start
  const circuitId = nextRace?.Circuit?.circuitId || ''
  const circuitInfo = getCircuitInfo(circuitId)
  const circuitTz = circuitInfo?.timezone || null
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const hasCircuitTz = circuitTz && circuitTz !== userTz

  // Hero: next race info — or a soft warning banner if meetings failed
  const heroHtml = meetingsFailed
    ? `<div class="hero-strip fade-up" style="margin-bottom:32px;border-color:var(--color-border)">
        <div class="hero-strip-main">
          <div class="label" style="margin-bottom:8px">Formula 1 · ${YEAR}</div>
          <div class="page-title" style="font-size:22px;color:var(--color-text-2)">赛程数据暂时不可用</div>
          <div style="font-size:13px;color:var(--color-text-3);margin-top:6px">
            赛程暂时不可用，积分榜数据仍可正常查看
            <button onclick="location.reload()" style="margin-left:12px;padding:4px 12px;
              background:transparent;color:var(--color-accent);border:1px solid var(--color-accent);
              border-radius:4px;font-size:12px;cursor:pointer">重试</button>
          </div>
        </div>
      </div>`
    : `<a class="hero-strip fade-up"
          href="${nextMeeting ? `race.html?meeting_key=${nextMeeting.meeting_key}` : 'schedule.html'}"
          style="margin-bottom:32px;cursor:pointer">
        <div class="hero-strip-main">
          <div class="label" style="margin-bottom:8px">Formula 1 · ${YEAR} · <span style="color:var(--color-accent)">查看详情 →</span></div>
          <div class="page-title">${flag} 下一站</div>
          <div style="margin-top:8px;font-size:18px;font-weight:700;color:var(--color-text-2)">
            ${nextMeeting?.meeting_name || '赛季结束'}
          </div>
          <div style="font-size:13px;color:var(--color-text-2);margin-top:4px">
            ${nextMeeting ? formatDate(nextMeeting.date_start) : ''}
          </div>
          ${nextMeeting ? `
          <div style="margin-top:14px;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap"
               onclick="event.preventDefault()">
            <div>
              <div class="countdown" id="home-countdown" style="font-size:28px"></div>
              <div class="countdown-label">距离正赛</div>
            </div>
            <div id="tz-toggle" style="font-size:11px;color:var(--color-text-2);cursor:pointer;
                 user-select:none;padding:3px 8px;border:1px solid var(--color-border);
                 border-radius:4px;display:inline-block;align-self:center">
              🕐 本地时间
            </div>
          </div>` : ''}
        </div>
      </a>`

  app.innerHTML = `
    ${heroHtml}

    <div class="home-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:40px">
      <div>
        <div class="section-title">车手积分榜</div>
        ${driverStandings.length
          ? driverStandings.slice(0, 10).map(s => driverStandingRow(s)).join('')
          : '<p class="text-2" style="padding:8px 0">暂无数据</p>'}
        <a href="drivers.html" style="display:block;margin-top:12px;font-size:13px;color:var(--color-text-2)">查看全部 →</a>
      </div>
      <div>
        <div class="section-title">车队积分榜</div>
        ${constructorStandings.length
          ? constructorStandings.map(s => constructorStandingRow(s)).join('')
          : '<p class="text-2" style="padding:8px 0">暂无数据</p>'}
        <a href="teams.html" style="display:block;margin-top:12px;font-size:13px;color:var(--color-text-2)">查看全部 →</a>
      </div>
    </div>

    ${lastMeeting ? `
      <div class="section-title">最近一站</div>
      ${meetingCard(lastMeeting)}
    ` : ''}
  `

  // Tick the countdown every second (counts to race start, not FP1)
  if (nextMeeting) {
    const countdownTarget = raceIso || nextMeeting.date_start
    function updateHomeCountdown() {
      const el = document.getElementById('home-countdown')
      if (!el) return
      const diff = new Date(countdownTarget) - Date.now()
      if (diff <= 0) { el.textContent = '即将开始'; return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      el.textContent = d > 0
        ? `${d}d ${h}h ${m}m ${String(s).padStart(2,'0')}s`
        : `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    }
    updateHomeCountdown()
    setInterval(updateHomeCountdown, 1000)
  }

  // Timezone toggle: local ↔ circuit time
  let showCircuit = false
  const tzEl = document.getElementById('tz-toggle')
  if (tzEl && raceIso && hasCircuitTz) {
    const fmt = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }
    function updateTzDisplay() {
      if (showCircuit) {
        const str = formatInTz(raceIso, circuitTz, fmt)
        tzEl.textContent = `🏁 赛道时间 · ${str}`
      } else {
        const str = formatInTz(raceIso, userTz, fmt)
        tzEl.textContent = `🕐 本地时间 · ${str}`
      }
    }
    updateTzDisplay()
    tzEl.addEventListener('click', () => { showCircuit = !showCircuit; updateTzDisplay() })
  } else if (tzEl && raceIso) {
    // Same timezone or unknown: just show local time, no toggle
    const str = formatInTz(raceIso, userTz, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    tzEl.textContent = `🕐 本地时间 · ${str}`
    tzEl.style.cursor = 'default'
  }
}

function renderRaceWeekend(raceState, driverStandings, constructorStandings) {
  const { sessions, currentSession, nextSession, meetingKey } = raceState
  const meeting = sessions[0]

  const liveBadge = currentSession
    ? `<span class="badge badge-live" style="margin-left:12px"><span class="pulse-dot"></span> LIVE · ${currentSession.session_name}</span>`
    : ''

  const nextHtml = nextSession
    ? `<div style="margin-top:8px;font-size:13px;color:var(--color-text-2)">
        下一场：${nextSession.session_name} · ${formatTime(nextSession.date_start)}
        <span style="margin-left:8px;color:var(--color-gold)">${formatCountdown(nextSession.date_start)}</span>
       </div>`
    : ''

  const flag = venueFlag(meeting?.country_code || '')

  app.innerHTML = `
    <div class="hero-strip fade-up" style="border-color:var(--color-accent);margin-bottom:32px">
      <div class="hero-strip-main">
        <div class="label" style="margin-bottom:8px;color:var(--color-accent)">比赛周进行中</div>
        <div class="page-title">${flag} ${meeting?.meeting_name || 'Grand Prix'} ${liveBadge}</div>
        ${nextHtml}
      </div>
      <div class="hero-strip-side">
        <a href="race.html?meeting_key=${meetingKey}"
           style="font-size:13px;color:var(--color-text-2)">详情 →</a>
      </div>
    </div>

    <div class="home-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:32px">
      <div>
        <div class="section-title">车手积分榜</div>
        ${driverStandings.slice(0, 5).map(s => driverStandingRow(s)).join('')}
        <a href="drivers.html" style="display:block;margin-top:12px;font-size:13px;color:var(--color-text-2)">查看全部 →</a>
      </div>
      <div>
        <div class="section-title">车队积分榜</div>
        ${constructorStandings.slice(0, 5).map(s => constructorStandingRow(s)).join('')}
        <a href="teams.html" style="display:block;margin-top:12px;font-size:13px;color:var(--color-text-2)">查看全部 →</a>
      </div>
    </div>
  `
}

init().catch(err => {
  app.innerHTML = `
    <div style="padding:24px;text-align:center">
      <p class="text-2" style="margin-bottom:12px">⚠️ 数据加载失败：${err.message}</p>
      <p style="font-size:12px;color:var(--color-text-3)">API 可能暂时不可用，请稍后刷新重试</p>
      <button onclick="location.reload()" style="margin-top:16px;padding:8px 20px;
        background:var(--color-accent);color:#fff;border:none;border-radius:6px;
        font-size:13px;cursor:pointer">重新加载</button>
    </div>
  `
})
