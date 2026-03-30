import { openF1 } from './api/openf1.js'

export const YEAR = new Date().getFullYear()

let pollingTimer = null

export async function detectRaceState() {
  // Avoid year-level OpenF1 queries (?year=XXXX) — they fail with ERR_FAILED.
  // Strategy: session_key=latest → get meeting_key → query all sessions for that meeting.
  const latestArr = await openF1.getSessions({ session_key: 'latest' }).catch(() => [])
  const latest = latestArr?.[0]
  if (!latest) return { state: 'NO_RACE', year: YEAR, sessions: [] }

  const meetingKey = latest.meeting_key
  const sessions = await openF1.getSessions({ meeting_key: meetingKey })
  const now = Date.now()
  const window_ms = 5 * 24 * 60 * 60 * 1000  // 5 days covers full race weekend

  // A session is "nearby" if it's currently live/just finished OR starts within 5 days
  const nearby = sessions.filter(s => {
    const start = new Date(s.date_start).getTime()
    const end = s.date_end
      ? new Date(s.date_end).getTime()
      : start + 3 * 60 * 60 * 1000
    return (now >= start && now <= end + 60 * 60 * 1000) ||
           (start > now && start - now < window_ms)
  })

  if (nearby.length === 0) {
    return { state: 'NO_RACE', year: YEAR, sessions }
  }

  // Prefer a currently-live session's meeting, else the soonest upcoming
  const liveSession = nearby.find(s => {
    const start = new Date(s.date_start).getTime()
    const end = s.date_end ? new Date(s.date_end).getTime() : start + 3 * 60 * 60 * 1000
    return now >= start && now <= end + 60 * 60 * 1000
  })
  const targetKey = liveSession
    ? liveSession.meeting_key
    : nearby.sort((a, b) => new Date(a.date_start) - new Date(b.date_start))[0].meeting_key

  const meetingSessions = sessions.filter(s => s.meeting_key === targetKey)

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
    meetingKey: targetKey,
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
