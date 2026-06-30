import { applyCors } from '../_lib/http.js';

// JWT is stateless: logout is handled client-side by clearing the stored token.
// Endpoint exists for API completeness and future server-side session revocation.
export default function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(200).json({ success: true, message: 'Clear the stored token on the client.' });
}
