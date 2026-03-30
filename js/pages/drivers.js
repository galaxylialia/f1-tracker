import { jolpica } from '../api/jolpica.js'
import { openF1 } from '../api/openf1.js'
import { driverStandingRow, skeletonRows, statGrid, triggerStatAnimations, breadcrumb } from '../components.js'
import { initPanel, registerPanelRenderer } from '../panel.js'
import { YEAR } from '../state.js'
import { initNav, countryFlag, nationalityFlag, getParam } from '../utils.js'
import { getTeamInfo } from '../config/teamInfo.js'

initNav('drivers')

const app = document.getElementById('app')
const panel = document.getElementById('split-panel')

app.innerHTML = `
  <div class="section-title" style="margin-bottom:20px">车手积分榜 · ${YEAR}</div>
  ${skeletonRows(20)}
`

async function init() {
  const data = await jolpica.getDriverStandings(YEAR)
  const standings = data?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || []

  app.innerHTML = `
    <div class="section-title" style="margin-bottom:20px">车手积分榜 · ${YEAR}</div>
    <div id="standings-list">
      ${standings.map(s => driverStandingRow(s)).join('')}
    </div>
  `

  if (panel) {
    registerPanelRenderer('driver.html', async (params, el) => {
      const code = params.get('code')
      if (!code) { el.innerHTML = '<p class="text-2">无车手代码</p>'; return }
      await renderDriverPanel(code, el)
    })
    initPanel(document.getElementById('standings-list'), panel)
  }
}

async function renderDriverPanel(code, el) {
  el.innerHTML = skeletonRows(6)

  const standingsData = await jolpica.getDriverStandings(YEAR)
  const standings = standingsData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || []
  const standing = standings.find(s =>
    s.Driver?.code === code.toUpperCase() ||
    s.Driver?.driverId === code.toLowerCase()
  )

  if (!standing) { el.innerHTML = `<p class="text-2">找不到车手 ${code}</p>`; return }

  const driver = standing.Driver
  const constructor = standing.Constructors?.[0]
  const teamInfo = getTeamInfo(constructor?.name)
  const color = teamInfo?.color || '#555555'
  const flag = nationalityFlag(driver.nationality)

  // Get headshot from OpenF1 latest session (avoids year-level query)
  let headshotUrl = ''
  try {
    const drivers = await openF1.getRaceDrivers()
    const d = drivers.find(d => d.name_acronym === code.toUpperCase())
    headshotUrl = d?.headshot_url || ''
  } catch (_) {}

  // Season results
  const resultsData = await fetch(
    `https://api.jolpi.ca/ergast/f1/${YEAR}/drivers/${driver.driverId}/results.json?limit=30`
  ).then(r => r.json()).catch(() => null)
  const races = resultsData?.MRData?.RaceTable?.Races || []
  const wins = races.filter(r => r.Results?.[0]?.position === '1').length
  const podiums = races.filter(r => parseInt(r.Results?.[0]?.position) <= 3).length
  const poles = races.filter(r => r.Results?.[0]?.grid === '1').length

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;
                border-left:3px solid ${color};padding-left:12px">
      ${headshotUrl
        ? `<img src="${headshotUrl}" alt="${driver.givenName}"
               style="height:60px;width:auto;border-radius:6px;object-fit:cover">`
        : `<div style="width:44px;height:60px;background:var(--color-surface-2);border-radius:6px"></div>`
      }
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;
                    text-transform:uppercase;color:${color};margin-bottom:2px">
          ${constructor?.name || ''}
        </div>
        <div style="font-size:18px;font-weight:800">
          ${driver.givenName} ${driver.familyName.toUpperCase()}
        </div>
        <div class="card-sub">#${driver.permanentNumber} · ${flag} ${driver.nationality}</div>
      </div>
    </div>

    ${statGrid([
      { value: standing.position, label: '排名', animate: true },
      { value: standing.points, label: '积分', animate: true },
      { value: wins, label: '胜场', animate: true },
      { value: podiums, label: '上台', animate: true },
    ])}

    <div style="margin-bottom:10px">
      <div class="label" style="margin-bottom:8px">本赛季成绩</div>
      <table class="result-table" style="font-size:12px">
        <thead><tr>
          <th>站次</th><th>比赛</th><th>排位</th><th>正赛</th>
        </tr></thead>
        <tbody>
          ${races.slice(0, 8).map(r => {
            const res = r.Results?.[0]
            return `<tr>
              <td class="mono-cell text-2">R${r.round}</td>
              <td style="max-width:100px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${r.raceName.replace(' Grand Prix','')}
              </td>
              <td class="mono-cell">${res?.grid || '—'}</td>
              <td class="mono-cell">${res?.position || res?.status || '—'}</td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>

    <a href="driver.html?code=${code}"
       style="font-size:13px;color:var(--color-accent)">查看完整详情 →</a>
  `

  // Fetch wrapper to get the actual container
  const container = el.closest('.split-panel') || el
  triggerStatAnimations(container)
}

init().catch(err => {
  app.innerHTML = `<p class="text-2" style="padding:24px">车手数据加载失败：${err.message}</p>`
})
