import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('SalonBook server is running');
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));