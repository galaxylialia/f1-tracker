import { openF1 } from '../api/openf1.js'
import { meetingCard, skeletonCards, sessionBadge } from '../components.js'
import { initPanel, registerPanelRenderer } from '../panel.js'
import { YEAR } from '../state.js'
import { initNav, formatDate, formatTime, countryFlag } from '../utils.js'

initNav('schedule')

const app = document.getElementById('app')
const panel = document.getElementById('split-panel')

app.innerHTML = `
  <div class="section-title" style="margin-bottom:20px">${YEAR} 赛程</div>
  ${skeletonCards(6)}
`

async function init() {
  const meetings = await openF1.getMeetings(YEAR)
  const sorted = [...meetings].sort((a, b) =>
    new Date(a.date_start) - new Date(b.date_start)
  )
  const now = Date.now()

  const past = [], current = [], future = []
  sorted.forEach(m => {
    const start = new Date(m.date_start).getTime()
    const end = new Date(m.date_end || m.date_start).getTime() + 86400000
    if (now >= start && now <= end) current.push(m)
    else if (start < now) past.push(m)
    else future.push(m)
  })

  function section(title, list, isCurrent = false) {
    if (!list.length) return ''
    return `<div style="margin-bottom:36px">
      <div class="label" style="margin-bottom:12px">${title}</div>
      <div class="card-grid">${list.map(m => meetingCard(m, isCurrent)).join('')}</div>
    </div>`
  }

  app.innerHTML = `
    <div class="section-title" style="margin-bottom:24px">${YEAR} 赛程</div>
    ${section('比赛周进行中', current, true)}
    ${section('即将到来', future)}
    ${section('已完成', past)}
  `

  if (panel) {
    // Register panel renderer for race detail
    registerPanelRenderer('race.html', async (params, el) => {
      const meetingKey = params.get('meeting_key')
      if (!meetingKey) { el.innerHTML = '<p class="text-2">无 meeting_key</p>'; return }

      el.innerHTML = `<div style="padding:4px">
        <div class="skeleton skel-title" style="margin-bottom:12px"></div>
        <div class="skeleton skel-text" style="margin-bottom:8px"></div>
        <div class="skeleton skel-row" style="margin-bottom:6px"></div>
        <div class="skeleton skel-row" style="margin-bottom:6px"></div>
      </div>`

      const [sessions, allMeetings] = await Promise.all([
        openF1.getSessions({ meeting_key: meetingKey }),
        openF1.getMeetings(YEAR),
      ])
      const meeting = allMeetings.find(m => m.meeting_key === parseInt(meetingKey))
      const flag = countryFlag(meeting?.country_code || '')

      el.innerHTML = `
        <div style="border-bottom:1px solid var(--color-border);padding-bottom:16px;margin-bottom:16px">
          <div class="label" style="margin-bottom:4px;color:var(--color-accent)">
            Round ${meeting?.round_number || ''} · ${meeting?.year || YEAR}
          </div>
          <div style="font-size:20px;font-weight:800;margin-bottom:2px">
            ${flag} ${meeting?.meeting_name || 'Grand Prix'}
          </div>
          <div class="card-sub">${meeting?.circuit_short_name || ''}</div>
        </div>
        <div class="label" style="margin-bottom:10px">赛程安排</div>
        ${sessions
          .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))
          .map(s => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--color-border)">
              <div>
                <div style="font-weight:600;font-size:13px">${s.session_name}</div>
                <div class="card-sub" style="font-size:11px">${formatDate(s.date_start)} ${formatTime(s.date_start)}</div>
              </div>
              ${sessionBadge(s)}
            </div>
          `).join('')}
        <div style="margin-top:16px">
          <a href="race.html?meeting_key=${meetingKey}"
             style="font-size:13px;color:var(--color-accent)">查看完整结果 →</a>
        </div>
      `
    })

    initPanel(app, panel)
  }
}

init().catch(err => {
  app.innerHTML = `<p class="text-2" style="padding:24px">赛程加载失败：${err.message}</p>`
})
