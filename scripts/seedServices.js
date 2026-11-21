import 'dotenv/config';
import { MongoClient } from 'mongodb';

const img = (text, color) =>
  `https://placehold.co/800x600/${color}/ffffff?text=${encodeURIComponent(text)}`;

const services = [
  {
    serviceName: 'Classic Haircut',
    category: 'Haircut & Styling',
    description: 'Professional haircut and styling tailored to your face shape and personal style.',
    price: 500,
    duration: 45,
    image: img('Classic Haircut', 'e11d48'),
  },
  {
    serviceName: 'Premium Hair Coloring',
    category: 'Hair Coloring',
    description: 'Full hair coloring with high-quality, ammonia-free products for a vibrant, lasting shade.',
    price: 2500,
    duration: 120,
    image: img('Hair Coloring', 'be123c'),
  },
  {
    serviceName: 'Keratin Treatment',
    category: 'Hair Treatment',
    description: 'Smoothing keratin treatment that reduces frizz and leaves hair soft and shiny.',
    price: 3500,
    duration: 150,
    image: img('Keratin Treatment', 'db2777'),
  },
  {
    serviceName: 'Deep Cleansing Facial',
    category: 'Facial & Skincare',
    description: 'Deep cleansing facial with exfoliation and massage to refresh and brighten your skin.',
    price: 1500,
    duration: 60,
    image: img('Deep Cleansing Facial', 'f43f5e'),
  },
  {
    serviceName: 'Bridal Makeup',
    category: 'Makeup',
    description: 'Complete bridal makeup package with long-lasting, photo-ready finish.',
    price: 6000,
    duration: 120,
    image: img('Bridal Makeup', '9f1239'),
  },
  {
    serviceName: 'Party Makeup',
    category: 'Makeup',
    description: 'Glamorous party makeup to make you stand out at any special occasion.',
    price: 2500,
    duration: 60,
    image: img('Party Makeup', 'e11d48'),
  },
  {
    serviceName: 'Manicure & Pedicure',
    category: 'Manicure & Pedicure',
    description: 'Relaxing manicure and pedicure with nail shaping, cuticle care and polish.',
    price: 1200,
    duration: 75,
    image: img('Manicure & Pedicure', 'be185d'),
  },
  {
    serviceName: 'Relaxing Body Massage',
    category: 'Spa & Massage',
    description: 'Full body relaxation massage with aromatic oils to relieve stress and tension.',
    price: 2000,
    duration: 90,
    image: img('Body Massage', 'a21caf'),
  },
];

const client = new MongoClient(process.env.MONGODB_URI);

try {
  await client.connect();
  const col = client.db().collection('services');

  for (const s of services) {
    const result = await col.updateOne(
      { serviceName: s.serviceName },
      { $setOnInsert: { ...s, status: 'active', createdAt: new Date() } },
      { upsert: true }
    );
    console.log(result.upsertedCount ? `Added: ${s.serviceName}` : `Skipped (exists): ${s.serviceName}`);
  }
  console.log('Seeding complete');
} catch (err) {
  console.error('Seeding failed:', err.message);
} finally {
  await client.close();
}