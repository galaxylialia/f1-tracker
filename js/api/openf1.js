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
}
