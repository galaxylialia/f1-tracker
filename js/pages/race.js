import { openF1 } from '../api/openf1.js'
import { jolpica } from '../api/jolpica.js'
import { raceResultTable, qualifyingResultTable, pitStopTable, breadcrumb, skeletonRows } from '../components.js'
import { getParam, formatDate, formatTime, countryFlag, sessionLabel, initNav } from '../utils.js'
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

let raceSession = null
let qualiSession = null
let currentMeeting = null
let activeTab = 'race'

async function init() {
  const [sessions, meetings] = await Promise.all([
    openF1.getSessions({ meeting_key: meetingKey }),
    openF1.getMeetings(YEAR),
  ])

  currentMeeting = meetings.find(m => m.meeting_key === parseInt(meetingKey))
  raceSession = sessions.find(s => s.session_name === 'Race')
  qualiSession = sessions.find(s => s.session_name === 'Qualifying')
  const sprintSession = sessions.find(s => s.session_name === 'Sprint')
  const practiceSessions = sessions
    .filter(s => s.session_type === 'Practice')
    .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))

  const flag = countryFlag(currentMeeting?.country_code || '')

  // Build tab list — only tabs where session exists
  const tabs = [
    qualiSession && { key: 'qualifying', label: '排位赛', session: qualiSession },
    raceSession   && { key: 'race',      label: '正赛',   session: raceSession },
    sprintSession && { key: 'sprint',    label: 'Sprint', session: sprintSession },
    ...practiceSessions.map((s, i) => ({ key: `fp${i+1}`, label: `FP${i+1}`, session: s })),
  ].filter(Boolean)

  // Default to race tab if it exists, else first available
  activeTab = raceSession ? 'race' : (tabs[0]?.key || 'race')

  app.innerHTML = `
    ${breadcrumb([{ label: '赛程', href: 'schedule.html' }, { label: currentMeeting?.meeting_name || 'Grand Prix' }])}
    <div class="hero-strip fade-up" style="margin-bottom:24px">
      <div class="hero-strip-main">
        <div class="label" style="margin-bottom:6px">
          Round ${currentMeeting?.round_number || ''} · ${currentMeeting?.year || YEAR}
        </div>
        <div class="page-title">${flag} ${currentMeeting?.meeting_name || 'Grand Prix'}</div>
        <div class="card-sub" style="margin-top:4px">${currentMeeting?.circuit_short_name || ''}</div>
      </div>
    </div>

    <div class="tabs" id="session-tabs">
      ${tabs.map(t => `
        <button class="tab-btn${t.key === activeTab ? ' active' : ''}" data-tab="${t.key}">
          ${t.label}
        </button>
      `).join('')}
    </div>
    <div id="tab-content">${skeletonRows(20)}</div>
  `

  document.getElementById('session-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn')
    if (!btn) return
    stopPolling()
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    activeTab = btn.dataset.tab
    const tabSession = tabs.find(t => t.key === activeTab)?.session
    loadTab(activeTab, tabSession)
  })

  loadTab(activeTab, tabs.find(t => t.key === activeTab)?.session)
}

async function loadTab(tab, session) {
  const content = document.getElementById('tab-content')
  if (!content) return
  content.innerHTML = skeletonRows(20)

  const round = currentMeeting?.round_number
  const year = currentMeeting?.year || YEAR

  try {
    if (tab === 'race' && raceSession) {
      const [raceData, pitRes] = await Promise.all([
        jolpica.getRaceResults(year, round),
        fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/pitstops.json?limit=100`)
          .then(r => r.json()).catch(() => null),
      ])
      const results = raceData?.RaceTable?.Races?.[0]?.Results || []
      const pitList = pitRes?.MRData?.RaceTable?.Races?.[0]?.PitStops || []

      content.innerHTML = `
        <div style="margin-bottom:28px">${raceResultTable(results)}</div>
        ${pitList.length ? `
          <div class="section-title" style="margin-bottom:12px">进站记录</div>
          ${pitStopTable(pitList)}
        ` : ''}
      `

      // Live polling if race session is currently active
      if (session) {
        const now = Date.now()
        const start = new Date(session.date_start).getTime()
        const end = session.date_end ? new Date(session.date_end).getTime() : start + 3 * 3600000
        if (now >= start && now <= end) {
          startPolling(async () => {
            const fresh = await jolpica.getRaceResults(year, round).catch(() => null)
            if (!fresh) return
            const freshResults = fresh?.RaceTable?.Races?.[0]?.Results || []
            const tbody = content.querySelector('tbody')
            if (tbody) {
              const newHtml = freshResults.map(r => {
                const status = r.status === 'Finished' ? (r.Time?.time || '—') : r.status
                const fastest = r.FastestLap?.rank === '1'
                  ? `<span style="color:var(--color-accent);margin-left:4px">⚡</span>` : ''
                return `<tr class="flash">
                  <td class="mono-cell">${r.position}</td>
                  <td>${r.Driver?.code || ''} ${fastest}</td>
                  <td class="text-2">${r.Constructor?.name || ''}</td>
                  <td class="mono-cell">${r.laps || '—'}</td>
                  <td class="mono-cell">${status}</td>
                  <td class="mono-cell" style="text-align:right">${r.points || 0}</td>
                </tr>`
              }).join('')
              tbody.innerHTML = newHtml
            }
          })
        }
      }

    } else if (tab === 'qualifying' && qualiSession) {
      const data = await jolpica.getQualifyingResults(year, round)
      const results = data?.RaceTable?.Races?.[0]?.QualifyingResults || []
      content.innerHTML = qualifyingResultTable(results)

      // Live polling for qualifying
      if (session) {
        const now = Date.now()
        const start = new Date(session.date_start).getTime()
        const end = session.date_end ? new Date(session.date_end).getTime() : start + 2 * 3600000
        if (now >= start && now <= end) {
          startPolling(async () => {
            const fresh = await jolpica.getQualifyingResults(year, round).catch(() => null)
            if (fresh) {
              const freshResults = fresh?.RaceTable?.Races?.[0]?.QualifyingResults || []
              content.innerHTML = qualifyingResultTable(freshResults)
            }
          })
        }
      }

    } else {
      content.innerHTML = `<p class="text-2" style="padding:16px 0">该 Session 数据暂未开放</p>`
    }
  } catch (err) {
    content.innerHTML = `<p class="text-2" style="padding:16px 0">加载失败：${err.message}</p>`
    stopPolling()
  }
}

// Stop polling when page is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPolling()
})
