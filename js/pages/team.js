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
  // Parallel: standings + latest drivers (avoids year-level session query which fails)
  const [standingsData, driverStandingsData, historicStats, latestDrivers] = await Promise.all([
    jolpica.getConstructorStandings(YEAR),
    jolpica.getDriverStandings(YEAR),
    jolpica.getConstructorStats(constructorId).catch(() => null),
    openF1.getRaceDrivers(),
  ])

  const standings = standingsData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || []
  const standing = standings.find(s => s.Constructor?.constructorId === constructorId)

  const teamInfo = getTeamInfo(standing?.Constructor?.name) || TEAM_INFO[constructorId] || null
  const color = teamInfo?.color || '#555555'
  const champCount = teamInfo?.championshipYears?.length || 0

  const driverStandings = driverStandingsData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || []

  // Filter latest drivers to this team (for headshots)
  const currentDrivers = latestDrivers.filter(d =>
    getTeamInfo(d.team_name)?.id === constructorId ||
    d.team_name === standing?.Constructor?.name
  )

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
      { value: teamInfo?.foundedYear || '—', label: '成立年份' },
    ])}

    ${historicStats ? `
    <div class="section-title" style="margin-bottom:12px;font-size:16px">生涯数据</div>
    ${statGrid([
      { value: historicStats.totalRaces, label: '参赛场次', animate: true },
      { value: historicStats.wins, label: '生涯胜场', animate: true },
      { value: historicStats.podiums, label: '生涯领奖台', animate: true },
      { value: historicStats.poles, label: '生涯杆位', animate: true },
    ])}
    ` : ''}

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
      ${teamInfo?.championshipYears?.length ? `
        <div style="margin-bottom:16px">
          <div class="label" style="margin-bottom:10px">车队冠军年份</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${teamInfo.championshipYears.map(y => `
              <span class="badge" style="background:rgba(212,175,55,0.15);color:var(--color-gold);font-size:13px;padding:4px 10px">
                🏆 ${y}
              </span>`).join('')}
          </div>
        </div>
      ` : ''}
      ${teamInfo?.driverChampions?.length ? `
        <div style="margin-bottom:16px">
          <div class="label" style="margin-bottom:8px">历届冠军车手</div>
          <div style="font-size:13px;color:var(--color-text-2);line-height:2">
            ${teamInfo.driverChampions.join(' · ')}
          </div>
        </div>
      ` : ''}
      ${teamInfo?.notableCars?.length ? `
        <div style="margin-bottom:16px">
          <div class="label" style="margin-bottom:8px">代表性赛车</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${teamInfo.notableCars.map(c => `<span class="badge badge-done">${c}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      ${teamInfo?.description ? `
        <div style="font-size:13px;color:var(--color-text-2);line-height:1.7;
                    border-top:1px solid var(--color-border);padding-top:16px">
          ${teamInfo.description}
        </div>
      ` : ''}
    </div>
  `

  triggerStatAnimations(app)
}
