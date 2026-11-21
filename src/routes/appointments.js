import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { verifyAdmin, verifyCustomer } from '../middleware/verifyRole.js';

const router = Router();

export const TIME_SLOTS = [
  '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM',
];

const col = () => getDB().collection('appointments');

// GET /api/appointments/slots?serviceId=&date=  (বুক করা slot জানায়)
router.get('/slots', verifyJWT, async (req, res) => {
  try {
    const { serviceId, date } = req.query;
    if (!ObjectId.isValid(String(serviceId)) || !date) {
      return res.status(400).json({ message: 'serviceId and date are required' });
    }
    const booked = await col()
      .find({
        serviceId: new ObjectId(String(serviceId)),
        appointmentDate: String(date),
        status: { $in: ['pending', 'confirmed'] },
      })
      .project({ timeSlot: 1 })
      .toArray();
    res.json({ allSlots: TIME_SLOTS, booked: booked.map((b) => b.timeSlot) });
  } catch {
    res.status(500).json({ message: 'Failed to load slots' });
  }
});

// POST /api/appointments  (customer)
router.post('/', verifyJWT, verifyCustomer, async (req, res) => {
  try {
    const { serviceId, appointmentDate, timeSlot, message } = req.body;

    if (!ObjectId.isValid(String(serviceId))) {
      return res.status(400).json({ message: 'Invalid service ID' });
    }
    if (!appointmentDate || !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
      return res.status(400).json({ message: 'A valid appointment date is required' });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (appointmentDate < today) {
      return res.status(400).json({ message: 'Appointment date cannot be in the past' });
    }
    if (!TIME_SLOTS.includes(timeSlot)) {
      return res.status(400).json({ message: 'Please select a valid time slot' });
    }

    const service = await getDB()
      .collection('services')
      .findOne({ _id: new ObjectId(serviceId) });
    if (!service) return res.status(404).json({ message: 'Service not found' });
    if (service.status !== 'active') {
      return res.status(400).json({ message: 'This service is not available for booking' });
    }

    const conflict = await col().findOne({
      serviceId: service._id,
      appointmentDate,
      timeSlot,
      status: { $in: ['pending', 'confirmed'] },
    });
    if (conflict) {
      return res.status(409).json({ message: 'This time slot is already booked. Please choose another.' });
    }

    const doc = {
      serviceId: service._id,
      customerId: new ObjectId(req.user.id),
      appointmentDate,
      timeSlot,
      message: String(message || '').trim().slice(0, 500),
      servicePrice: service.price,
      paymentStatus: 'unpaid',
      status: 'pending',
      createdAt: new Date(),
    };
    const result = await col().insertOne(doc);
    res.status(201).json({ ...doc, _id: result.insertedId });
  } catch {
    res.status(500).json({ message: 'Failed to create appointment' });
  }
});

// GET /api/appointments/my  (customer: শুধু নিজেরগুলো)
router.get('/my', verifyJWT, verifyCustomer, async (req, res) => {
  try {
    const list = await col()
      .aggregate([
        { $match: { customerId: new ObjectId(req.user.id) } },
        { $sort: { createdAt: -1 } },
        { $lookup: { from: 'services', localField: 'serviceId', foreignField: '_id', as: 'service' } },
        { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
      ])
      .toArray();
    res.json(list);
  } catch {
    res.status(500).json({ message: 'Failed to load appointments' });
  }
});

// PATCH /api/appointments/:id/cancel  (customer: নিজের pending)
router.patch('/:id/cancel', verifyJWT, verifyCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid appointment ID' });

    const appt = await col().findOne({ _id: new ObjectId(id), customerId: new ObjectId(req.user.id) });
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    if (appt.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending appointments can be cancelled' });
    }
    await col().updateOne({ _id: appt._id }, { $set: { status: 'cancelled' } });
    res.json({ message: 'Appointment cancelled' });
  } catch {
    res.status(500).json({ message: 'Failed to cancel appointment' });
  }
});

// GET /api/appointments/admin/all  (admin)
router.get('/admin/all', verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const list = await col()
      .aggregate([
        { $sort: { createdAt: -1 } },
        { $lookup: { from: 'services', localField: 'serviceId', foreignField: '_id', as: 'service' } },
        { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'user', localField: 'customerId', foreignField: '_id', as: 'customer' } },
        { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
        { $project: { 'customer.password': 0 } },
      ])
      .toArray();
    res.json(list);
  } catch {
    res.status(500).json({ message: 'Failed to load appointments' });
  }
});

// PATCH /api/appointments/:id/confirm  (admin: শুধু pending)
router.patch('/:id/confirm', verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid appointment ID' });
    const result = await col().updateOne(
      { _id: new ObjectId(id), status: 'pending' },
      { $set: { status: 'confirmed' } }
    );
    if (!result.matchedCount) {
      return res.status(400).json({ message: 'Only pending appointments can be confirmed' });
    }
    res.json({ message: 'Appointment confirmed' });
  } catch {
    res.status(500).json({ message: 'Failed to confirm appointment' });
  }
});

// PATCH /api/appointments/:id/admin-cancel  (admin: pending বা confirmed)
router.patch('/:id/admin-cancel', verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid appointment ID' });
    const result = await col().updateOne(
      { _id: new ObjectId(id), status: { $in: ['pending', 'confirmed'] } },
      { $set: { status: 'cancelled' } }
    );
    if (!result.matchedCount) {
      return res.status(400).json({ message: 'Only pending or confirmed appointments can be cancelled' });
    }
    res.json({ message: 'Appointment cancelled' });
  } catch {
    res.status(500).json({ message: 'Failed to cancel appointment' });
  }
});

export default router;