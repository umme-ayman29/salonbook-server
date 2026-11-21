import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { verifyJWT } from './middleware/verifyJWT.js';
import { verifyAdmin } from './middleware/verifyRole.js';
import servicesRouter from './routes/services.js';
import appointmentsRouter from './routes/appointments.js';
import usersRouter from './routes/users.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
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

const port = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });