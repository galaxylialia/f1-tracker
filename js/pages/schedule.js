import { jolpica } from '../api/jolpica.js'
import { meetingCard, skeletonCards } from '../components.js'
import { initPanel, registerPanelRenderer } from '../panel.js'
import { YEAR } from '../state.js'
import { initNav, venueFlag, jolpikaRaceToMeeting, sessionLabel } from '../utils.js'
import { getCircuitInfo, formatInTz } from '../config/circuitInfo.js'

initNav('schedule')

const app = document.getElementById('app')
const panel = document.getElementById('split-panel')

app.innerHTML = `
  <div class="section-title" style="margin-bottom:20px">${YEAR} 赛程</div>
  ${skeletonCards(6)}
`

// Build session list from Jolpica race object (has FP1/FP2/FP3/Quali/Sprint/Race times in UTC)
function buildSessions(race) {
  const map = [
    ['FirstPractice',    'Practice 1'],
    ['SecondPractice',   'Practice 2'],
    ['ThirdPractice',    'Practice 3'],
    ['SprintQualifying', 'Sprint Qualifying'],
    ['Sprint',           'Sprint'],
    ['Qualifying',       'Qualifying'],
  ]
  const sessions = []
  for (const [key, name] of map) {
    const s = race[key]
    if (s?.date) sessions.push({ name, iso: `${s.date}T${s.time || '00:00:00Z'}` })
  }
  // Race itself
  if (race.date) sessions.push({ name: 'Race', iso: `${race.date}T${race.time || '00:00:00Z'}` })
  return sessions.sort((a, b) => new Date(a.iso) - new Date(b.iso))
}

// Fetch Wikipedia thumbnail for a circuit (free, no API key needed)
async function fetchCircuitImage(wikiUrl) {
  if (!wikiUrl) return null
  try {
    const title = decodeURIComponent(wikiUrl.split('/wiki/')[1] || '')
    if (!title) return null
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.thumbnail?.source || data.originalimage?.source || null
  } catch (_) {
    return null
  }
}

async function init() {
  const scheduleData = await jolpica.getRaceSchedule(YEAR).catch(() => null)

  if (!scheduleData) {
    app.innerHTML = `<p class="text-2" style="padding:24px">赛程加载失败，请稍后重试</p>`
    return
  }

  const races = scheduleData.RaceTable?.Races || []
  const meetings = races.map(jolpikaRaceToMeeting)

  const sorted = [...meetings].sort((a, b) => new Date(a.date_start) - new Date(b.date_start))
  const now = Date.now()

  const past = [], current = [], future = []
  sorted.forEach(m => {
    const start = new Date(m.date_start).getTime()
    const end   = new Date(m.date_end || m.date_start).getTime() + 86400000
    if (now >= start && now <= end) current.push(m)
    else if (start < now)           past.push(m)
    else                            future.push(m)
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
    registerPanelRenderer('race.html', async (params, el) => {
      const roundParam = params.get('meeting_key')
      if (!roundParam) { el.innerHTML = '<p class="text-2">无 meeting_key</p>'; return }

      el.innerHTML = `<div style="padding:4px">
        <div class="skeleton skel-title" style="margin-bottom:12px"></div>
        <div class="skeleton skel-text" style="margin-bottom:8px"></div>
        <div class="skeleton skel-row" style="margin-bottom:6px"></div>
        <div class="skeleton skel-row" style="margin-bottom:6px"></div>
      </div>`

      // Find matching meeting + original Jolpica race
      const meeting = meetings.find(m => m.meeting_key === parseInt(roundParam))
      const race    = races.find(r => parseInt(r.round) === parseInt(roundParam))
      const flag    = venueFlag(meeting?.country_code || '')

      // Circuit info
      const circuitId   = race?.Circuit?.circuitId || ''
      const circuitInfo = getCircuitInfo(circuitId)
      const circuitTz   = circuitInfo?.timezone || null
      const userTz      = Intl.DateTimeFormat().resolvedOptions().timeZone
      const sameTz      = circuitTz === userTz

      // Session schedule from Jolpica race object
      const sessions = race ? buildSessions(race) : []

      // Wikipedia circuit image (async, injected after render)
      const wikiUrl    = race?.Circuit?.url || null

      function sessionRow(s) {
        const now2 = Date.now()
        const start = new Date(s.iso).getTime()
        // Estimate session end: Race ≈ 2h, Sprint ≈ 45m, others ≈ 1h
        const dur = s.name === 'Race' ? 7200000 : s.name === 'Sprint' ? 2700000 : 3600000
        const end = start + dur

        let badge = ''
        if (now2 >= start && now2 <= end) badge = `<span class="badge badge-live"><span class="pulse-dot"></span> LIVE</span>`
        else if (now2 < start)            badge = `<span class="badge badge-next">即将开始</span>`
        else                              badge = `<span class="badge badge-done">已结束</span>`

        const circuitTimeStr = circuitTz ? formatInTz(s.iso, circuitTz, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : null
        const localTimeStr   = formatInTz(s.iso, userTz, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })

        return `<div style="padding:10px 0;border-bottom:1px solid var(--color-border)">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div style="font-weight:600;font-size:13px">${sessionLabel(s.name)}</div>
            ${badge}
          </div>
          <div style="margin-top:4px">
            ${circuitTimeStr && !sameTz ? `
              <div style="font-size:11px;color:var(--color-text-2)">
                🏁 赛道 · ${circuitTimeStr}
              </div>` : ''}
            <div style="font-size:11px;color:var(--color-text-3)">
              🕐 本地 · ${localTimeStr}
            </div>
          </div>
        </div>`
      }

      // Circuit info section
      const circuitSection = circuitInfo ? `
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--color-border)">
          <div class="label" style="margin-bottom:10px">赛道信息</div>
          <div id="circuit-img-slot"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
            <div style="background:var(--color-surface-2);border-radius:6px;padding:8px 10px">
              <div style="font-size:18px;font-weight:700;font-family:var(--font-mono)">${circuitInfo.length} <span style="font-size:11px;font-weight:400">km</span></div>
              <div style="font-size:10px;color:var(--color-text-2);margin-top:2px;text-transform:uppercase;letter-spacing:.04em">全长</div>
            </div>
            <div style="background:var(--color-surface-2);border-radius:6px;padding:8px 10px">
              <div style="font-size:18px;font-weight:700;font-family:var(--font-mono)">${circuitInfo.laps}</div>
              <div style="font-size:10px;color:var(--color-text-2);margin-top:2px;text-transform:uppercase;letter-spacing:.04em">正赛圈数</div>
            </div>
            <div style="background:var(--color-surface-2);border-radius:6px;padding:8px 10px">
              <div style="font-size:18px;font-weight:700;font-family:var(--font-mono)">${circuitInfo.corners}</div>
              <div style="font-size:10px;color:var(--color-text-2);margin-top:2px;text-transform:uppercase;letter-spacing:.04em">弯道数</div>
            </div>
            <div style="background:var(--color-surface-2);border-radius:6px;padding:8px 10px">
              <div style="font-size:15px;font-weight:700;font-family:var(--font-mono)">${circuitInfo.lapRecord.time}</div>
              <div style="font-size:10px;color:var(--color-text-2);margin-top:2px;text-transform:uppercase;letter-spacing:.04em">圈速记录</div>
            </div>
          </div>
          ${circuitInfo.lapRecord ? `
            <div style="font-size:11px;color:var(--color-text-2)">
              ⚡ ${circuitInfo.lapRecord.time} — ${circuitInfo.lapRecord.driver} (${circuitInfo.lapRecord.year})
            </div>` : ''}
          ${race?.Circuit?.Location ? `
            <div style="font-size:11px;color:var(--color-text-3);margin-top:4px">
              📍 ${race.Circuit.Location.locality}, ${race.Circuit.Location.country}
            </div>` : ''}
        </div>` : ''

      el.innerHTML = `
        <div style="border-bottom:1px solid var(--color-border);padding-bottom:16px;margin-bottom:16px">
          <div class="label" style="margin-bottom:4px;color:var(--color-accent)">
            Round ${meeting?.round_number || roundParam} · ${meeting?.year || YEAR}
          </div>
          <div style="font-size:20px;font-weight:800;margin-bottom:2px">
            ${flag} ${meeting?.meeting_name || 'Grand Prix'}
          </div>
          <div class="card-sub">${race?.Circuit?.circuitName || meeting?.circuit_short_name || ''}</div>
        </div>

        <div class="label" style="margin-bottom:4px">赛程安排</div>
        <div style="font-size:10px;color:var(--color-text-3);margin-bottom:10px">
          ${circuitTz && !sameTz
            ? `赛道时区 <strong style="color:var(--color-text-2)">${circuitTz}</strong> · 本地时区 ${userTz}`
            : `时区 ${userTz}`}
        </div>
        ${sessions.length
          ? sessions.map(sessionRow).join('')
          : '<p class="text-2" style="font-size:12px;padding:8px 0">暂无赛程数据</p>'}

        ${circuitSection}

        <div style="margin-top:16px">
          <a href="race.html?meeting_key=${roundParam}"
             style="font-size:13px;color:var(--color-accent)">查看完整结果 →</a>
        </div>
      `

      // Async: try to load Wikipedia circuit image
      if (wikiUrl) {
        fetchCircuitImage(wikiUrl).then(imgUrl => {
          if (!imgUrl) return
          const slot = el.querySelector('#circuit-img-slot')
          if (slot) {
            slot.innerHTML = `<img src="${imgUrl}" alt="circuit"
              style="width:100%;border-radius:6px;margin-bottom:10px;object-fit:cover;max-height:120px"
              onerror="this.parentElement.remove()">`
          }
        })
      }
    })

    initPanel(app, panel)
  }
}

init().catch(err => {
  app.innerHTML = `<p class="text-2" style="padding:24px">赛程加载失败：${err.message}</p>`
})
