const BASE = 'https://api.openf1.org/v1'

async function get(path, params = {}) {
  const url = new URL(BASE + path)
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, v)
  })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OpenF1 ${res.status} ${path}`)
  return res.json()
}

export const openF1 = {
  getMeetings:  (year)        => get('/meetings',  { year }),
  getSessions:  (params)      => get('/sessions',  params),
  getDrivers:   (sessionKey)  => get('/drivers',   { session_key: sessionKey }),
  getPosition:  (sessionKey)  => get('/position',  { session_key: sessionKey }),
  getPit:       (sessionKey)  => get('/pit',        { session_key: sessionKey }),
  getStints:    (sessionKey)  => get('/stints',     { session_key: sessionKey }),
  getIntervals: (sessionKey)  => get('/intervals',  { session_key: sessionKey }),
  getLaps:      (sessionKey, driverNumber) =>
    get('/laps', { session_key: sessionKey, driver_number: driverNumber }),

  /**
   * Get drivers from the most recently completed Race session (has headshot_url).
   * Avoids year-level queries (ERR_FAILED).
   *
   * Steps:
   *  1. getDrivers('latest') — driver objects include meeting_key, no extra call needed
   *  2. If headshots already present (latest IS a Race session), return immediately
   *  3. Otherwise query current meeting + previous meeting (meeting_key-1) in PARALLEL
   *     to find the most recent completed Race session, then fetch its drivers
   */
  getRaceDrivers: async () => {
    const latestDrivers = await get('/drivers', { session_key: 'latest' }).catch(() => [])

    // Fast path: latest session already has headshots
    if (latestDrivers.some(d => d.headshot_url)) return latestDrivers

    // meeting_key is in driver objects — no extra getSessions call needed
    const meetingKey = latestDrivers[0]?.meeting_key
    if (!meetingKey) return latestDrivers

    // Query current meeting AND previous meeting in parallel
    const [curSessions, prevSessions] = await Promise.all([
      get('/sessions', { meeting_key: meetingKey }).catch(() => []),
      get('/sessions', { meeting_key: meetingKey - 1 }).catch(() => []),
    ])

    const now = Date.now()
    const raceSession = [...curSessions, ...prevSessions]
      .filter(s => s.session_name === 'Race' && new Date(s.date_start).getTime() < now)
      .sort((a, b) => new Date(b.date_start) - new Date(a.date_start))[0]

    if (raceSession) {
      return get('/drivers', { session_key: raceSession.session_key }).catch(() => latestDrivers)
    }
    return latestDrivers
  },
}
