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

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRouter);
app.use(express.json());

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

const port = process.env.PORT || 5000;

// Vercel serverless-এর জন্য: প্রতি রিকোয়েস্টে DB সংযোগ নিশ্চিত করা
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ message: 'Database connection failed' });
  }
});

if (!process.env.VERCEL) {
  connectDB()
    .then(() => app.listen(port, () => console.log(`Server running on port ${port}`)))
    .catch((err) => {
      console.error('MongoDB connection failed:', err.message);
      process.exit(1);
    });
}

export default app;