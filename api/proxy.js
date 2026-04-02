export default async function handler(req, res) {
  const { path, ...query } = req.query
  const pathStr = Array.isArray(path) ? path.join('/') : (path || '')
  const queryStr = new URLSearchParams(query).toString()
  const qs = queryStr ? '?' + queryStr : ''

  let target
  if (pathStr.startsWith('jolpica/')) {
    target = 'https://api.jolpi.ca/ergast/f1/' + pathStr.slice(8) + qs
  } else if (pathStr.startsWith('openf1/')) {
    target = 'https://api.openf1.org/v1/' + pathStr.slice(7) + qs
  } else {
    return res.status(404).json({ error: 'not found' })
  }

  try {
    const resp = await fetch(target, { headers: { 'User-Agent': 'F1Tracker/1.0' } })
    const data = await resp.json()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: 'proxy error' })
  }
}
