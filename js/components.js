import { formatDate, formatTime, formatCountdown, countryFlag, formatLapTime, sessionLabel } from './utils.js'
import { getTeamInfo } from './config/teamInfo.js'

// ── Skeleton screens ─────────────────────────────

export function skeletonRows(count = 10) {
  return Array.from({ length: count }, () =>
    `<div class="skeleton skel-row" style="margin-bottom:8px"></div>`
  ).join('')
}

export function skeletonCards(count = 4) {
  return `<div class="card-grid">${
    Array.from({ length: count }, () =>
      `<div class="card"><div class="skeleton skel-card"></div></div>`
    ).join('')
  }</div>`
}

// ── Breadcrumb ──────────────────────────────────

export function breadcrumb(items) {
  return `<nav class="breadcrumb">
    ${items.map((item, i) =>
      i < items.length - 1
        ? `<a href="${item.href}">${item.label}</a><span class="breadcrumb-sep">›</span>`
        : `<span>${item.label}</span>`
    ).join('')}
  </nav>`
}

// ── Stat grid ───────────────────────────────────

export function statGrid(stats) {
  return `<div class="stat-grid">
    ${stats.map(s => `
      <div class="stat-tile">
        <span class="stat-value mono${s.animate ? ' js-animate-num' : ''}"
              ${s.animate ? `data-target="${s.value}"` : ''}
        >${s.animate ? '0' : s.value}</span>
        <span class="stat-label">${s.label}</span>
      </div>
    `).join('')}
  </div>`
}

export function triggerStatAnimations(container) {
  // Dynamically import to avoid circular deps
  import('./utils.js').then(({ animateNumber }) => {
    container.querySelectorAll('.js-animate-num').forEach(el => {
      animateNumber(el, parseFloat(el.dataset.target))
    })
  })
}

// ── Driver standing row ─────────────────────────

export function driverStandingRow(standing, opts = {}) {
  const { active = false } = opts
  const constructorName = standing.Constructors?.[0]?.name || standing.constructorName || ''
  const teamInfo = getTeamInfo(constructorName)
  const color = teamInfo?.color || '#555555'
  const driverCode = standing.Driver?.code || standing.driverCode || ''
  const driverId = standing.Driver?.driverId || ''
  return `<a class="standing-row fade-up${active ? ' active' : ''}"
      href="driver.html?code=${driverCode}"
      data-driver-code="${driverCode}">
    <span class="standing-pos">${standing.position}</span>
    <span class="standing-color-bar" style="background:${color}"></span>
    <span class="standing-num">#${standing.Driver?.permanentNumber || ''}</span>
    <div>
      <div class="standing-name">${(standing.Driver?.familyName || '').toUpperCase()}</div>
      <div class="standing-sub">${constructorName}</div>
    </div>
    <span class="standing-pts">${standing.points} <span class="text-3" style="font-size:11px">pts</span></span>
  </a>`
}

// ── Constructor standing row ────────────────────

export function constructorStandingRow(standing, opts = {}) {
  const { active = false } = opts
  const constructorName = standing.Constructor?.name || ''
  const constructorId = standing.Constructor?.constructorId || ''
  const teamInfo = getTeamInfo(constructorName)
  const color = teamInfo?.color || '#555555'
  return `<a class="standing-row fade-up${active ? ' active' : ''}"
      href="team.html?id=${constructorId}">
    <span class="standing-pos">${standing.position}</span>
    <span class="standing-color-bar" style="background:${color}"></span>
    <span class="standing-num"></span>
    <div>
      <div class="standing-name">${constructorName}</div>
      <div class="standing-sub">${standing.Constructor?.nationality || ''}</div>
    </div>
    <span class="standing-pts">${standing.points} <span class="text-3" style="font-size:11px">pts</span></span>
  </a>`
}

// ── Race result table ───────────────────────────

export function raceResultTable(results) {
  if (!results.length) return `<p class="text-2">暂无数据</p>`
  const rows = results.map(r => {
    const status = r.status === 'Finished' ? (r.Time?.time || '—') : r.status
    const fastest = r.FastestLap?.rank === '1'
      ? `<span style="color:var(--color-accent);margin-left:4px">⚡</span>` : ''
    return `<tr>
      <td class="mono-cell">${r.position}</td>
      <td>${r.Driver?.code || ''} ${fastest}</td>
      <td class="text-2">${r.Constructor?.name || ''}</td>
      <td class="mono-cell">${r.laps || '—'}</td>
      <td class="mono-cell">${status}</td>
      <td class="mono-cell" style="text-align:right">${r.points || 0}</td>
    </tr>`
  }).join('')
  return `<table class="result-table">
    <thead><tr>
      <th>#</th><th>车手</th><th>车队</th><th>圈数</th><th>时间/状态</th>
      <th style="text-align:right">积分</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

// ── Qualifying result table ─────────────────────

export function qualifyingResultTable(results) {
  if (!results.length) return `<p class="text-2">暂无数据</p>`
  const rows = results.map(r => `<tr>
    <td class="mono-cell">${r.position}</td>
    <td>${r.Driver?.code || ''}</td>
    <td class="text-2">${r.Constructor?.name || ''}</td>
    <td class="mono-cell">${r.Q1 || '—'}</td>
    <td class="mono-cell">${r.Q2 || '—'}</td>
    <td class="mono-cell">${r.Q3 || '—'}</td>
  </tr>`).join('')
  return `<table class="result-table">
    <thead><tr>
      <th>#</th><th>车手</th><th>车队</th><th>Q1</th><th>Q2</th><th>Q3</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

// ── Pit stop table ──────────────────────────────

export function pitStopTable(pits) {
  if (!pits.length) return `<p class="text-2">暂无进站数据</p>`
  const rows = pits.map(p => `<tr>
    <td class="mono-cell">${p.lap}</td>
    <td>${(p.driverId || '').toUpperCase()}</td>
    <td class="mono-cell">${p.stop}</td>
    <td class="mono-cell">${p.duration}</td>
  </tr>`).join('')
  return `<table class="result-table">
    <thead><tr>
      <th>圈数</th><th>车手</th><th>第几次</th><th>用时(s)</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

// ── Session badge ───────────────────────────────

export function sessionBadge(session) {
  const now = Date.now()
  const start = new Date(session.date_start).getTime()
  const end = session.date_end
    ? new Date(session.date_end).getTime()
    : start + 3 * 3600000
  if (now >= start && now <= end)
    return `<span class="badge badge-live"><span class="pulse-dot"></span> LIVE</span>`
  if (now < start)
    return `<span class="badge badge-next">即将开始</span>`
  return `<span class="badge badge-done">已结束</span>`
}

// ── Meeting card ────────────────────────────────

export function meetingCard(meeting, isCurrent = false) {
  const flag = countryFlag(meeting.country_code || '')
  const date = formatDate(meeting.date_start)
  const borderStyle = isCurrent
    ? 'border-color:var(--color-accent);background:var(--color-accent-dim);' : ''
  return `<a class="card fade-up" href="race.html?meeting_key=${meeting.meeting_key}"
      style="${borderStyle}">
    <div class="card-body" style="display:grid;grid-template-columns:1fr auto;align-items:start;gap:8px">
      <div>
        <div class="label" style="margin-bottom:4px">Round ${meeting.round_number || ''}</div>
        <div class="card-title">${meeting.meeting_name || ''}</div>
        <div class="card-sub" style="margin-top:4px">
          ${meeting.circuit_short_name || ''} · ${date}
        </div>
      </div>
      <div style="font-size:28px;line-height:1">${flag}</div>
    </div>
  </a>`
}
