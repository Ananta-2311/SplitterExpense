import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Clear http-only cookie
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = [
    'refreshToken=',
    'HttpOnly',
    isProduction ? 'Secure' : '',
    'SameSite=Strict',
    'Path=/',
    'Max-Age=0',
  ]
    .filter(Boolean)
    .join('; ');

  res.setHeader('Set-Cookie', cookieOptions);

  res.status(200).json({ success: true });
}

