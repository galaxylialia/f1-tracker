import { jolpica } from '../api/jolpica.js'
import { openF1 } from '../api/openf1.js'
import { constructorStandingRow, skeletonRows, statGrid, triggerStatAnimations } from '../components.js'
import { initPanel, registerPanelRenderer } from '../panel.js'
import { YEAR } from '../state.js'
import { initNav, countryFlag } from '../utils.js'
import { getTeamInfo } from '../config/teamInfo.js'

initNav('teams')

const app = document.getElementById('app')
const panel = document.getElementById('split-panel')

app.innerHTML = `
  <div class="section-title" style="margin-bottom:20px">车队积分榜 · ${YEAR}</div>
  ${skeletonRows(10)}
`

async function init() {
  const data = await jolpica.getConstructorStandings(YEAR)
  const standings = data?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || []

  app.innerHTML = `
    <div class="section-title" style="margin-bottom:20px">车队积分榜 · ${YEAR}</div>
    <div id="standings-list">
      ${standings.map(s => constructorStandingRow(s)).join('')}
    </div>
  `

  if (panel) {
    registerPanelRenderer('team.html', async (params, el) => {
      const id = params.get('id')
      if (!id) { el.innerHTML = '<p class="text-2">无车队 ID</p>'; return }
      await renderTeamPanel(id, standings, el)
    })
    initPanel(document.getElementById('standings-list'), panel)
  }
}

async function renderTeamPanel(constructorId, standings, el) {
  el.innerHTML = skeletonRows(5)

  const standing = standings.find(s => s.Constructor?.constructorId === constructorId)
  const teamInfo = getTeamInfo(standing?.Constructor?.name) || Object.values(
    await import('../config/teamInfo.js').then(m => m.TEAM_INFO)
  ).find(t => t.id === constructorId)

  const color = teamInfo?.color || '#555555'
  const flag = countryFlag((teamInfo?.nationality || '').slice(0, 2))

  // Get current drivers from OpenF1
  let currentDrivers = []
  try {
    const allSessions = await openF1.getSessions({ year: YEAR })
    const latestRace = allSessions
      .filter(s => s.session_name === 'Race')
      .sort((a, b) => new Date(b.date_start) - new Date(a.date_start))[0]
    if (latestRace) {
      const drivers = await openF1.getDrivers(latestRace.session_key)
      currentDrivers = drivers.filter(d =>
        getTeamInfo(d.team_name)?.id === constructorId ||
        d.team_name === standing?.Constructor?.name
      )
    }
  } catch (_) {}

  el.innerHTML = `
    <div style="border-left:3px solid ${color};padding-left:12px;margin-bottom:16px">
      <div class="label" style="color:${color};margin-bottom:2px">
        ${flag} ${teamInfo?.nationality || ''}
      </div>
      <div style="font-size:20px;font-weight:800;margin-bottom:2px">
        ${teamInfo?.shortName || standing?.Constructor?.name || constructorId}
      </div>
      <div class="card-sub">${teamInfo?.base || ''} · 成立 ${teamInfo?.foundedYear || '—'}</div>
    </div>

    ${statGrid([
      { value: standing?.position || '—', label: YEAR + ' 排名' },
      { value: standing?.points || 0, label: '积分', animate: true },
      { value: teamInfo?.championshipYears?.length || 0, label: '冠军次数', animate: true },
    ])}

    ${currentDrivers.length ? `
      <div class="label" style="margin-bottom:8px">本赛季车手</div>
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        ${currentDrivers.map(d => `
          <a href="driver.html?code=${d.name_acronym}"
             style="display:flex;align-items:center;gap:8px;padding:8px 12px;
                    background:var(--color-surface-2);border-radius:8px;
                    text-decoration:none;color:inherit;flex:1;min-width:120px">
            ${d.headshot_url
              ? `<img src="${d.headshot_url}" style="height:36px;width:auto;border-radius:4px">`
              : `<div style="width:28px;height:36px;background:var(--color-surface);border-radius:4px"></div>`
            }
            <div>
              <div style="font-weight:700;font-size:13px">${d.broadcast_name || d.full_name}</div>
              <div class="card-sub" style="font-size:11px">#${d.driver_number}</div>
            </div>
          </a>
        `).join('')}
      </div>
    ` : ''}

    ${teamInfo?.description ? `
      <div class="card-sub" style="font-size:12px;line-height:1.6;margin-bottom:16px">
        ${teamInfo.description}
      </div>
    ` : ''}

    <a href="team.html?id=${constructorId}" style="font-size:13px;color:var(--color-accent)">
      查看完整详情 →
    </a>
  `

  const container = el.closest('.split-panel') || el
  triggerStatAnimations(container)
}

init().catch(err => {
  app.innerHTML = `<p class="text-2" style="padding:24px">车队数据加载失败：${err.message}</p>`
})
