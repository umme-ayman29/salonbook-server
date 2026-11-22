import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { getStripe } from '../config/stripe.js';

const router = Router();

router.post('/', async (req, res) => {
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = getStripe().webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send('Webhook signature verification failed');
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.payment_status === 'paid') {
        const db = getDB();
        const appointmentId = new ObjectId(session.metadata.appointmentId);
        const customerId = new ObjectId(session.metadata.customerId);

        const exists = await db.collection('transactions').findOne({ stripeSessionId: session.id });
        if (!exists) {
          await db.collection('transactions').insertOne({
            appointmentId,
            customerId,
            amount: session.amount_total / 100,
            currency: session.currency,
            stripeSessionId: session.id,
            status: 'paid',
            createdAt: new Date(),
          });
        }
        await db.collection('appointments').updateOne(
          { _id: appointmentId },
          { $set: { paymentStatus: 'paid' } }
        );
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handling error:', err.message);
    res.status(500).send('Webhook handler failed');
  }
});

export default router;