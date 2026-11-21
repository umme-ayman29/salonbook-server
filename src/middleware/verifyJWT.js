import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

let jwks;
function getJWKS() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(process.env.JWKS_URL));
  return jwks;
}

export async function verifyJWT(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: token missing' });
    }
    const token = header.split(' ')[1];

    const { payload } = await jwtVerify(token, getJWKS());
    const userId = payload.id || payload.sub;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: invalid token' });
    }

    const db = getDB();
    let user = await db.collection('user').findOne({ id: userId });
    if (!user && ObjectId.isValid(userId)) {
      user = await db.collection('user').findOne({ _id: new ObjectId(userId) });
    }
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: user not found' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account is blocked' });
    }

    req.user = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role || 'customer',
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized: invalid or expired token' });
  }
}