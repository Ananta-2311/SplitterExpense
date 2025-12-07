import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  // Set http-only cookie
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = [
    `refreshToken=${refreshToken}`,
    'HttpOnly',
    isProduction ? 'Secure' : '',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${7 * 24 * 60 * 60}`, // 7 days
  ]
    .filter(Boolean)
    .join('; ');

  res.setHeader('Set-Cookie', cookieOptions);

  res.status(200).json({ success: true });
}

