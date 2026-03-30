import { jolpica } from '../api/jolpica.js'
import { openF1 } from '../api/openf1.js'
import { breadcrumb, statGrid, triggerStatAnimations, skeletonRows } from '../components.js'
import { getParam, nationalityFlag, initNav } from '../utils.js'
import { YEAR } from '../state.js'
import { getTeamInfo } from '../config/teamInfo.js'

initNav('drivers')

const app = document.getElementById('app')
const driverCode = getParam('code')

if (!driverCode) {
  app.innerHTML = `<div style="padding:24px"><p class="text-2">缺少 code 参数。请从<a href="drivers.html" style="color:var(--color-accent)">车手列表</a>进入。</p></div>`
} else {
  app.innerHTML = `<div style="padding:8px">${skeletonRows(8)}</div>`
  init()
}

async function init() {
  // Stage 1: standings + latest drivers in parallel
  // Use getDrivers('latest') to avoid year-level session query (ERR_FAILED)
  const [standingsData, latestDrivers] = await Promise.all([
    jolpica.getDriverStandings(YEAR),
    openF1.getRaceDrivers(),
  ])

  const standings = standingsData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || []
  const standing = standings.find(s =>
    s.Driver?.code === driverCode.toUpperCase() ||
    s.Driver?.driverId === driverCode.toLowerCase()
  )

  if (!standing) {
    app.innerHTML = `<div style="padding:24px"><p class="text-2">找不到车手：${driverCode}</p></div>`
    return
  }

  const driver = standing.Driver
  const constructor = standing.Constructors?.[0]
  const teamInfo = getTeamInfo(constructor?.name)
  const color = teamInfo?.color || '#555555'
  const flag = nationalityFlag(driver.nationality)

  // Stage 2: season results + career stats in parallel (headshot already fetched)
  const [resultsData, historicStats] = await Promise.all([
    fetch(`https://api.jolpi.ca/ergast/f1/${YEAR}/drivers/${driver.driverId}/results.json?limit=30`)
      .then(r => r.json()).catch(() => null),
    jolpica.getDriverStats(driver.driverId).catch(() => null),
  ])

  const headshotUrl = latestDrivers.find(d => d.name_acronym === driverCode.toUpperCase())?.headshot_url || ''
  const races = resultsData?.MRData?.RaceTable?.Races || []
  const wins = races.filter(r => r.Results?.[0]?.position === '1').length
  const podiums = races.filter(r => parseInt(r.Results?.[0]?.position) <= 3).length
  const poles = races.filter(r => r.Results?.[0]?.grid === '1').length
  const fastestLaps = races.filter(r => r.Results?.[0]?.FastestLap?.rank === '1').length

  app.innerHTML = `
    ${breadcrumb([{ label: '车手', href: 'drivers.html' }, { label: `${driver.givenName} ${driver.familyName}` }])}

    <div class="hero-strip fade-up" style="border-left:4px solid ${color};margin-bottom:28px">
      <div style="display:flex;align-items:center;gap:16px;flex:1;min-width:0">
        ${headshotUrl
          ? `<img src="${headshotUrl}" alt="${driver.givenName}"
                 style="height:80px;width:auto;border-radius:8px;object-fit:cover;flex-shrink:0">`
          : `<div style="width:60px;height:80px;background:var(--color-surface-2);
                         border-radius:8px;border:1px solid var(--color-border);flex-shrink:0"></div>`
        }
        <div style="min-width:0">
          <div class="label" style="color:${color};margin-bottom:4px">${constructor?.name || ''}</div>
          <div class="page-title">${driver.givenName} ${driver.familyName.toUpperCase()}</div>
          <div class="card-sub" style="margin-top:4px">
            #${driver.permanentNumber} · ${flag} ${driver.nationality}
          </div>
        </div>
      </div>
      <div class="hero-strip-side">
        <div style="font-size:52px;font-weight:900;color:${color};
                    font-family:var(--font-mono);line-height:1">#${driver.permanentNumber}</div>
      </div>
    </div>

    ${statGrid([
      { value: standing.points, label: '积分', animate: true },
      { value: standing.position, label: '排名', animate: true },
      { value: wins, label: '胜场', animate: true },
      { value: podiums, label: '上台次数', animate: true },
      { value: poles, label: '杆位', animate: true },
      { value: fastestLaps, label: '最快圈', animate: true },
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

    <div class="section-title" style="margin-bottom:16px">本赛季各站成绩</div>
    <div class="table-scroll">
    <table class="result-table">
      <thead><tr>
        <th>站次</th><th>比赛</th><th>排位</th><th>正赛</th><th class="mono-cell">积分</th>
      </tr></thead>
      <tbody>
        ${races.map(r => {
          const res = r.Results?.[0]
          const pos = res?.position || res?.status || '—'
          const posColor = pos === '1' ? 'color:var(--color-gold)' :
                           parseInt(pos) <= 3 ? 'color:var(--color-accent)' : ''
          return `<tr>
            <td class="mono-cell text-2">R${r.round}</td>
            <td>
              <a href="race.html?meeting_key=${r.round}"
                 style="color:inherit;text-decoration:none">
                ${r.raceName.replace(' Grand Prix', '')}
              </a>
            </td>
            <td class="mono-cell">${res?.grid || '—'}</td>
            <td class="mono-cell" style="${posColor}">${pos}</td>
            <td class="mono-cell">${res?.points || '0'}</td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
    </div>
  `

  triggerStatAnimations(app)
}
