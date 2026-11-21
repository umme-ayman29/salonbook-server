import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';import multer from 'multer';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { verifyAdmin } from '../middleware/verifyRole.js';
import { uploadToImgBB } from '../utils/uploadImage.js';


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

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

// GET /api/services/admin/all  (admin: active + inactive সব)
router.get('/admin/all', verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const services = await getDB()
      .collection('services')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
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

function validateService(body) {
  const { serviceName, category, description, price, duration } = body;
  if (!serviceName || !category || !description) {
    return 'Name, category and description are required';
  }
  if (!(Number(price) > 0)) return 'Price must be a positive number';
  if (!(Number(duration) > 0)) return 'Duration must be a positive number';
  return null;
}

// POST /api/services  (admin)
router.post('/', verifyJWT, verifyAdmin, upload.single('image'), async (req, res) => {
  try {
    const error = validateService(req.body);
    if (error) return res.status(400).json({ message: error });
    if (!req.file) return res.status(400).json({ message: 'Service image is required' });

    let image;
    try {
      image = await uploadToImgBB(req.file.buffer);
    } catch {
      return res.status(502).json({ message: 'Image upload failed' });
    }

    const doc = {
      serviceName: req.body.serviceName.trim(),
      category: req.body.category.trim(),
      description: req.body.description.trim(),
      price: Number(req.body.price),
      duration: Number(req.body.duration),
      image,
      status: req.body.status === 'inactive' ? 'inactive' : 'active',
      createdAt: new Date(),
    };
    const result = await getDB().collection('services').insertOne(doc);
    res.status(201).json({ ...doc, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create service' });
  }
});

// PUT /api/services/:id  (admin)
router.put('/:id', verifyJWT, verifyAdmin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid service ID' });

    const error = validateService(req.body);
    if (error) return res.status(400).json({ message: error });

    const update = {
      serviceName: req.body.serviceName.trim(),
      category: req.body.category.trim(),
      description: req.body.description.trim(),
      price: Number(req.body.price),
      duration: Number(req.body.duration),
      status: req.body.status === 'inactive' ? 'inactive' : 'active',
    };
    if (req.file) {
      try {
        update.image = await uploadToImgBB(req.file.buffer);
      } catch {
        return res.status(502).json({ message: 'Image upload failed' });
      }
    }

    const result = await getDB()
      .collection('services')
      .updateOne({ _id: new ObjectId(id) }, { $set: update });
    if (!result.matchedCount) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Service updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update service' });
  }
});

// PATCH /api/services/:id/status  (admin)
router.patch('/:id/status', verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid service ID' });
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Status must be active or inactive' });
    }
    const result = await getDB()
      .collection('services')
      .updateOne({ _id: new ObjectId(id) }, { $set: { status } });
    if (!result.matchedCount) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// DELETE /api/services/:id  (admin)
router.delete('/:id', verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid service ID' });
    const result = await getDB()
      .collection('services')
      .deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Service deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete service' });
  }
});

export default router;