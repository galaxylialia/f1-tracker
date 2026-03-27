import { jolpica } from '../api/jolpica.js'
import { openF1 } from '../api/openf1.js'
import { breadcrumb, statGrid, triggerStatAnimations, skeletonRows } from '../components.js'
import { getParam, countryFlag, initNav } from '../utils.js'
import { YEAR } from '../state.js'
import { getTeamInfo, TEAM_INFO } from '../config/teamInfo.js'

initNav('teams')

const app = document.getElementById('app')
const constructorId = getParam('id')

if (!constructorId) {
  app.innerHTML = `<div style="padding:24px"><p class="text-2">缺少 id 参数。请从<a href="teams.html" style="color:var(--color-accent)">车队列表</a>进入。</p></div>`
} else {
  app.innerHTML = `<div style="padding:8px">${skeletonRows(10)}</div>`
  init()
}

async function init() {
  const [standingsData, historyData] = await Promise.all([
    jolpica.getConstructorStandings(YEAR),
    jolpica.getConstructorHistory(constructorId),
  ])

  const standings = standingsData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || []
  const standing = standings.find(s => s.Constructor?.constructorId === constructorId)
  const historyList = historyData?.StandingsTable?.StandingsLists || []

  const teamInfo = getTeamInfo(standing?.Constructor?.name) || TEAM_INFO[constructorId] || null
  const color = teamInfo?.color || '#555555'

  const champYearsFromHistory = historyList
    .filter(s => s.ConstructorStandings?.[0]?.position === '1')
    .map(s => s.season)

  const totalWins = historyList.reduce((sum, s) =>
    sum + parseInt(s.ConstructorStandings?.[0]?.wins || 0), 0
  )

  // Current season drivers from OpenF1
  let currentDrivers = []
  let driverStandings = []
  try {
    const [allSessions, dsData] = await Promise.all([
      openF1.getSessions({ year: YEAR }),
      jolpica.getConstructorStandings(YEAR), // reuse already loaded
    ])
    driverStandings = dsData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || []
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

  const champCount = teamInfo?.championshipYears?.length || champYearsFromHistory.length

  app.innerHTML = `
    ${breadcrumb([
      { label: '车队', href: 'teams.html' },
      { label: teamInfo?.shortName || standing?.Constructor?.name || constructorId }
    ])}

    <!-- Hero -->
    <div class="hero-strip fade-up" style="border-left:4px solid ${color};margin-bottom:28px">
      <div class="hero-strip-main">
        <div class="label" style="margin-bottom:6px;color:${color}">
          ${teamInfo?.nationality || ''} · ${teamInfo?.engineSupplier || ''}
        </div>
        <div class="page-title">${teamInfo?.fullName || standing?.Constructor?.name || constructorId}</div>
        <div class="card-sub" style="margin-top:6px">
          ${teamInfo?.base || ''} · 成立 ${teamInfo?.foundedYear || '—'}
        </div>
      </div>
      <div class="hero-strip-side">
        <div style="font-size:48px;font-weight:900;color:${color};
                    font-family:var(--font-mono);line-height:1">P${standing?.position || '—'}</div>
        <div class="countdown-label">${YEAR} 排名</div>
      </div>
    </div>

    <!-- Season stats -->
    ${statGrid([
      { value: standing?.points || 0, label: '本赛季积分', animate: true },
      { value: standing?.wins || 0, label: '本赛季胜场', animate: true },
      { value: champCount, label: '车队冠军', animate: true },
      { value: totalWins, label: '历史总胜场', animate: true },
    ])}

    <!-- Current drivers -->
    ${currentDrivers.length ? `
    <div class="section-title" style="margin-bottom:16px">本赛季车手</div>
    <div class="card-grid" style="margin-bottom:32px">
      ${currentDrivers.map(d => {
        const ds = driverStandings.find(s => s.Driver?.code === d.name_acronym)
        return `<a class="card fade-up" href="driver.html?code=${d.name_acronym}">
          <div style="height:4px;background:${color}"></div>
          <div class="card-body" style="display:flex;align-items:center;gap:12px">
            ${d.headshot_url
              ? `<img src="${d.headshot_url}" alt="${d.full_name}"
                     style="height:56px;width:auto;border-radius:6px;object-fit:cover">`
              : `<div style="width:44px;height:56px;background:var(--color-surface-2);
                             border-radius:6px;border:1px solid var(--color-border)"></div>`
            }
            <div style="flex:1">
              <div class="card-title" style="font-size:14px">
                ${d.full_name || d.broadcast_name}
              </div>
              <div class="card-sub">#${d.driver_number}</div>
            </div>
            ${ds ? `<div style="text-align:right">
              <div class="mono" style="font-weight:700">${ds.points}</div>
              <div class="card-sub">P${ds.position}</div>
            </div>` : ''}
          </div>
        </a>`
      }).join('')}
    </div>
    ` : ''}

    <!-- Historical honours -->
    <div class="section-title" style="margin-bottom:16px">历史荣誉</div>
    <div style="background:var(--color-surface);border:1px solid var(--color-border);
                border-radius:var(--radius-lg);padding:24px;margin-bottom:32px">
      ${statGrid([
        { value: champCount, label: '车队冠军次数', animate: true },
        { value: totalWins, label: '历史总胜场', animate: true },
        { value: teamInfo?.foundedYear || '—', label: '成立年份' },
        { value: historyList.length, label: '参赛赛季', animate: true },
      ])}
      ${teamInfo?.driverChampions?.length ? `
        <div style="margin-top:16px">
          <div class="label" style="margin-bottom:8px">历届冠军车手</div>
          <div style="font-size:13px;color:var(--color-text-2);line-height:2">
            ${teamInfo.driverChampions.join(' · ')}
          </div>
        </div>
      ` : ''}
      ${teamInfo?.notableCars?.length ? `
        <div style="margin-top:16px">
          <div class="label" style="margin-bottom:8px">代表性赛车</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${teamInfo.notableCars.map(c => `<span class="badge badge-done">${c}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      ${teamInfo?.description ? `
        <div style="margin-top:16px;font-size:13px;color:var(--color-text-2);line-height:1.7;
                    border-top:1px solid var(--color-border);padding-top:16px">
          ${teamInfo.description}
        </div>
      ` : ''}
    </div>

    <!-- Season history table -->
    <div class="section-title" style="margin-bottom:16px">历史赛季排名</div>
    <table class="result-table">
      <thead><tr>
        <th>赛季</th><th>排名</th><th class="mono-cell">积分</th><th class="mono-cell">胜场</th>
      </tr></thead>
      <tbody>
        ${[...historyList].reverse().map(s => {
          const cs = s.ConstructorStandings?.[0]
          const isChamp = cs?.position === '1'
          return `<tr${isChamp ? ' style="color:var(--color-gold)"' : ''}>
            <td class="mono-cell">${s.season}</td>
            <td class="mono-cell">${cs?.position || '—'}${isChamp ? ' 🏆' : ''}</td>
            <td class="mono-cell">${cs?.points || '—'}</td>
            <td class="mono-cell">${cs?.wins || '—'}</td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
  `

  triggerStatAnimations(app)
}
