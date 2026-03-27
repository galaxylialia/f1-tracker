import { openF1 } from './api/openf1.js'

export const YEAR = new Date().getFullYear()

let pollingTimer = null

export async function detectRaceState() {
  const sessions = await openF1.getSessions({ year: YEAR })
  const now = Date.now()
  const window_ms = 3 * 24 * 60 * 60 * 1000

  const nearby = sessions.filter(s => {
    const start = new Date(s.date_start).getTime()
    return Math.abs(start - now) < window_ms
  })

  if (nearby.length === 0) {
    return { state: 'NO_RACE', year: YEAR, sessions }
  }

  const meetingKey = nearby[0].meeting_key
  const meetingSessions = sessions.filter(s => s.meeting_key === meetingKey)

  const currentSession = meetingSessions.find(s => {
    const start = new Date(s.date_start).getTime()
    const end = s.date_end
      ? new Date(s.date_end).getTime()
      : start + 3 * 60 * 60 * 1000
    return now >= start && now <= end + 30 * 60 * 1000
  }) || null

  const nextSession = meetingSessions
    .filter(s => new Date(s.date_start).getTime() > now)
    .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))[0] || null

  const lastSession = meetingSessions
    .filter(s => new Date(s.date_start).getTime() < now)
    .sort((a, b) => new Date(b.date_start) - new Date(a.date_start))[0] || null

  return {
    state: 'RACE_WEEKEND',
    year: YEAR,
    meetingKey,
    sessions: meetingSessions,
    currentSession,
    nextSession,
    lastSession,
    allSessions: sessions,
  }
}

export function startPolling(callback, intervalMs = 30_000) {
  stopPolling()
  callback()
  pollingTimer = setInterval(callback, intervalMs)
}

export function stopPolling() {
  if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null }
}
