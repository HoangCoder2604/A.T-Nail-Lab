import crypto from 'node:crypto';
import { requireAdminFromBearer, getServerFirebase } from './_helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const admin = await requireAdminFromBearer(req);
    const token = String(req.body?.token || '').trim();
    const userAgent = String(req.body?.userAgent || '').slice(0, 500);

    if (!token || token.length < 20 || token.length > 4096) {
      return res.status(400).json({ error: 'FCM_TOKEN_INVALID' });
    }

    const { db } = getServerFirebase();
    const tokenId = crypto.createHash('sha256').update(token).digest('hex');

    await db.collection('adminPushTokens').doc(tokenId).set({
      token,
      uid: admin.uid,
      user_agent: userAgent,
      enabled: true,
      updated_at: new Date(),
    }, { merge: true });

    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error?.message || 'PUSH_REGISTER_FAILED';
    const authError = ['MISSING_ADMIN_TOKEN', 'ADMIN_REQUIRED'].includes(message);
    return res.status(authError ? 401 : 500).json({ error: message });
  }
}
