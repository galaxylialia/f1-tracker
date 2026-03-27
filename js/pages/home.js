import { detectRaceState, YEAR } from '../state.js'
import { jolpica } from '../api/jolpica.js'
import { openF1 } from '../api/openf1.js'
import { driverStandingRow, constructorStandingRow, skeletonRows, meetingCard } from '../components.js'
import { formatCountdown, formatDate, formatTime, countryFlag, initNav } from '../utils.js'

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
  const [raceState, driverData, constructorData, meetings] = await Promise.all([
    detectRaceState(),
    jolpica.getDriverStandings(YEAR),
    jolpica.getConstructorStandings(YEAR),
    openF1.getMeetings(YEAR),
  ])

  const driverStandings = driverData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || []
  const constructorStandings = constructorData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || []

  if (raceState.state === 'RACE_WEEKEND') {
    renderRaceWeekend(raceState, driverStandings, constructorStandings)
  } else {
    renderNoRace(meetings, driverStandings, constructorStandings)
  }
}

function renderNoRace(meetings, driverStandings, constructorStandings) {
  const now = Date.now()
  const sorted = [...meetings].sort((a, b) => new Date(a.date_start) - new Date(b.date_start))
  const nextMeeting = sorted.find(m => new Date(m.date_start) > now)
  const lastMeeting = [...sorted].reverse().find(m => new Date(m.date_start) < now)

  const flag = nextMeeting ? countryFlag(nextMeeting.country_code || '') : ''
  const countdown = nextMeeting ? formatCountdown(nextMeeting.date_start) : '—'

  app.innerHTML = `
    <div class="hero-strip fade-up" style="margin-bottom:32px">
      <div class="hero-strip-main">
        <div class="label" style="margin-bottom:8px">Formula 1 · ${YEAR}</div>
        <div class="page-title">${flag} 下一站</div>
        <div style="margin-top:8px;font-size:18px;font-weight:700;color:var(--color-text-2)">
          ${nextMeeting?.meeting_name || '赛季结束'}
        </div>
        <div style="font-size:13px;color:var(--color-text-2);margin-top:4px">
          ${nextMeeting ? formatDate(nextMeeting.date_start) : ''}
        </div>
      </div>
      <div class="hero-strip-side">
        <div class="countdown">${countdown}</div>
        <div class="countdown-label">距离比赛周</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:40px">
      <div>
        <div class="section-title">车手积分榜</div>
        ${driverStandings.slice(0, 10).map(s => driverStandingRow(s)).join('')}
        <a href="drivers.html" style="display:block;margin-top:12px;font-size:13px;color:var(--color-text-2)">查看全部 →</a>
      </div>
      <div>
        <div class="section-title">车队积分榜</div>
        ${constructorStandings.map(s => constructorStandingRow(s)).join('')}
        <a href="teams.html" style="display:block;margin-top:12px;font-size:13px;color:var(--color-text-2)">查看全部 →</a>
      </div>
    </div>

    ${lastMeeting ? `
      <div class="section-title">最近一站</div>
      ${meetingCard(lastMeeting)}
    ` : ''}
  `
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

  const flag = countryFlag(meeting?.country_code || '')

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

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px">
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
  app.innerHTML = `<p class="text-2" style="padding:24px">数据加载失败：${err.message}</p>`
})
