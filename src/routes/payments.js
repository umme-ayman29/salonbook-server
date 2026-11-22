import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { getStripe } from '../config/stripe.js';
import { verifyJWT } from '../middleware/verifyJWT.js';
import { verifyAdmin, verifyCustomer } from '../middleware/verifyRole.js';

const router = Router();

// POST /api/payments/create-checkout-session  (customer)
router.post('/create-checkout-session', verifyJWT, verifyCustomer, async (req, res) => {
  try {
    const { appointmentId } = req.body;
    if (!ObjectId.isValid(String(appointmentId))) {
      return res.status(400).json({ message: 'Invalid appointment ID' });
    }
    const db = getDB();
    const appt = await db.collection('appointments').findOne({
      _id: new ObjectId(appointmentId),
      customerId: new ObjectId(req.user.id),
    });
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    if (appt.status !== 'confirmed') {
      return res.status(400).json({ message: 'Only confirmed appointments can be paid' });
    }
    if (appt.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Appointment is already paid' });
    }

    const service = await db.collection('services').findOne({ _id: appt.serviceId });

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: service?.serviceName || 'Salon appointment' },
            unit_amount: Math.round(appt.servicePrice * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        appointmentId: String(appt._id),
        customerId: String(appt.customerId),
      },
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ message: 'Failed to start payment' });
  }
});

// GET /api/payments/transactions  (admin)
router.get('/transactions', verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const list = await getDB()
      .collection('transactions')
      .aggregate([
        { $sort: { createdAt: -1 } },
        { $lookup: { from: 'user', localField: 'customerId', foreignField: '_id', as: 'customer' } },
        { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'appointments', localField: 'appointmentId', foreignField: '_id', as: 'appointment' } },
        { $unwind: { path: '$appointment', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'services', localField: 'appointment.serviceId', foreignField: '_id', as: 'service' } },
        { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
      ])
      .toArray();
    res.json(list);
  } catch {
    res.status(500).json({ message: 'Failed to load transactions' });
  }
});

export default router;