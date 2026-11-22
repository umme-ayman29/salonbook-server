# SalonBook Server

REST API for the SalonBook appointment booking platform.

## Important Features
- JWT verification (Better Auth JWKS) with role and blocked-user checks
- Services CRUD with search, category filter, price sorting and ImgBB image upload
- Appointments API with duplicate slot prevention, confirm and cancel
- Stripe Checkout and verified webhook that marks payments as paid
- Users and transactions APIs

## Technology Stack
Node.js, Express.js, MongoDB, JWT, Stripe, ImgBB

## Installation
```bash
git clone https://github.com/umme-ayman29/salonbook-server.git
cd salonbook-server
npm install
```

## Run Locally
```bash
cp .env.example .env   # then fill in the values
npm run dev
```
Server runs on http://localhost:5000

## Required Environment Variables
- PORT
- MONGODB_URI
- CLIENT_URL
- JWKS_URL
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- IMGBB_API_KEY

## Links
- Live Server: https://salonbook-server-rouge.vercel.app
- Live Website: https://salonbook-client-rust.vercel.app
- Client Repository: https://github.com/umme-ayman29/salonbook-client
- Server Repository: https://github.com/umme-ayman29/salonbook-server