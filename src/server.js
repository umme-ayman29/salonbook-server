import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { verifyJWT } from './middleware/verifyJWT.js';
import { verifyAdmin } from './middleware/verifyRole.js';
import servicesRouter from './routes/services.js';
import appointmentsRouter from './routes/appointments.js';
import usersRouter from './routes/users.js';
import paymentsRouter from './routes/payments.js';
import webhookRouter from './routes/webhook.js';

const app = express();
const port = process.env.PORT || 5000;

// 1) CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 2) প্রতি রিকোয়েস্টে DB সংযোগ নিশ্চিত করা (Vercel serverless-এর জন্য)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection error:', err.message);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// 3) Stripe webhook (raw body লাগে, তাই express.json()-এর আগে)
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRouter);

// 4) JSON parser
app.use(express.json());

// 5) Routes
app.get('/', (req, res) => {
  res.send('SalonBook server is running');
});

app.get('/api/me', verifyJWT, (req, res) => {
  res.json(req.user);
});

app.get('/api/admin-check', verifyJWT, verifyAdmin, (req, res) => {
  res.json({ message: 'Welcome admin' });
});

app.use('/api/services', servicesRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/payments', paymentsRouter);

// 6) লোকালে চালানোর জন্য (Vercel-এ listen লাগে না)
if (!process.env.VERCEL) {
  connectDB()
    .then(() => app.listen(port, () => console.log(`Server running on port ${port}`)))
    .catch((err) => {
      console.error('MongoDB connection failed:', err.message);
      process.exit(1);
    });
}

export default app;