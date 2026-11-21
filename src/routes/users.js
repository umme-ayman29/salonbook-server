import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { verifyAdmin } from '../middleware/verifyRole.js';

const router = Router();
const col = () => getDB().collection('user');

// GET /api/users  (admin: সব customer)
router.get('/', verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const users = await col()
      .find({ role: { $ne: 'admin' } })
      .project({ name: 1, email: 1, image: 1, role: 1, isBlocked: 1, phone: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(users);
  } catch {
    res.status(500).json({ message: 'Failed to load users' });
  }
});

// PATCH /api/users/:id/block  (admin)  body: { isBlocked: true|false }
router.patch('/:id/block', verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user ID' });
    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({ message: 'isBlocked must be true or false' });
    }
    const target = await col().findOne({ _id: new ObjectId(id) });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.role === 'admin') {
      return res.status(400).json({ message: 'Admin accounts cannot be blocked' });
    }
    await col().updateOne({ _id: target._id }, { $set: { isBlocked } });
    res.json({ message: isBlocked ? 'User blocked' : 'User unblocked' });
  } catch {
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// PATCH /api/users/me  (নিজের profile: name, image, phone শুধু)
router.patch('/me', verifyJWT, async (req, res) => {
  try {
    const { name, image, phone } = req.body;
    const update = { updatedAt: new Date() };
    if (typeof name === 'string' && name.trim()) update.name = name.trim();
    if (typeof image === 'string') update.image = image.trim();
    if (typeof phone === 'string') update.phone = phone.trim().slice(0, 20);
    await col().updateOne({ _id: new ObjectId(req.user.id) }, { $set: update });
    res.json({ message: 'Profile updated' });
  } catch {
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

export default router;