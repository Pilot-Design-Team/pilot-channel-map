export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password } = req.body

  // Allow configuring password through environment variable, with a fallback
  const correctPassword = process.env.PILOT_PASSWORD || 'Pilot'

  if (password === correctPassword) {
    // Generate a simple token (in production we could use JWT, but this is a Vercel page protection)
    return res.status(200).json({ success: true, token: 'pilot_t100_auth_success_2026' })
  } else {
    return res.status(401).json({ success: false, error: 'Incorrect password. Access denied.' })
  }
}
