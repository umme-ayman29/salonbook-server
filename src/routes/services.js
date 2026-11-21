import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

const router = Router();

// GET /api/services?search=&category=&sort=price_asc|price_desc&limit=
router.get('/', async (req, res) => {
  try {
    const { search, category, sort, limit } = req.query;
    const filter = { status: 'active' };

    if (search) {
      const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.serviceName = { $regex: safe, $options: 'i' };
    }
    if (category) filter.category = String(category);

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };

    let cursor = getDB().collection('services').find(filter).sort(sortOption);
    const n = parseInt(String(limit), 10);
    if (n > 0) cursor = cursor.limit(n);

    const services = await cursor.toArray();
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load services' });
  }
});

// GET /api/services/categories  (active সার্ভিসের ক্যাটাগরি ও সংখ্যা)
router.get('/categories', async (req, res) => {
  try {
    const result = await getDB()
      .collection('services')
      .aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray();
    res.json(result.map((r) => ({ category: r._id, count: r.count })));
  } catch (err) {
    res.status(500).json({ message: 'Failed to load categories' });
  }
});

// GET /api/services/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid service ID' });
    }
    const service = await getDB()
      .collection('services')
      .findOne({ _id: new ObjectId(id) });
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load service' });
  }
});

export default router;