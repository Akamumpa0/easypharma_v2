# EasyPharma

A web-based pharmacy management and point-of-sale (POS) system built with React, Node.js/Express, and Neon (PostgreSQL).

## Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React 18 + Vite + Tailwind CSS    |
| Backend  | Node.js + Express                 |
| Database | Neon (serverless PostgreSQL)      |
| ORM      | Drizzle ORM                       |
| Auth     | JWT                               |

## Project Structure

```
easypharma/
├── client/          # React frontend
└── server/          # Node.js/Express backend
```

## Getting Started

### 1. Set up Neon database

1. Create a free account at https://neon.tech
2. Create a new project called `easypharma`
3. Copy the connection string from the dashboard

### 2. Configure the backend

```bash
cd server
copy .env.example .env
```

Edit `server/.env`:
```
DATABASE_URL=postgresql://...your neon connection string...
JWT_SECRET=any_long_random_string
PORT=5000
CLIENT_URL=http://localhost:5173
```

### 3. Install dependencies & run migrations

```bash
cd server
npm install
npm run db:generate
npm run db:migrate
```

### 4. Configure the frontend

```bash
cd client
copy .env.example .env
```

### 5. Install frontend dependencies

```bash
cd client
npm install
```

### 6. Run both servers

**Backend** (in one terminal):
```bash
cd server
npm run dev
```

**Frontend** (in another terminal):
```bash
cd client
npm run dev
```

Open http://localhost:5173

### 7. Create the first admin

Hit this endpoint in your browser to create the first admin account:

```
POST http://localhost:5000/api/users
```

Or use the seed script (see below).

Since email is skipped, create the admin directly via the API. Use a REST client (like Postman or Insomnia):

```
POST http://localhost:5000/api/auth/login
```
won't work until there's an admin. To bootstrap, temporarily call:

```
POST http://localhost:5000/api/users
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "changeme123",
  "firstName": "System",
  "lastName": "Admin",
  "role": "admin"
}
```

Then immediately log in and activate/manage users from the Admin panel.

> **Note:** Remove or protect this open endpoint after first use by requiring auth (it already does in production — you'll need to bootstrap via a seed script or direct DB insert).

## External REST API

Third-party integrations use API keys managed in the Admin → API Management panel.

| Endpoint | Subscription |
|----------|-------------|
| `GET /api/v1/:key/medicines` | Free + Paid |
| `GET /api/v1/:key/search-medicine/:term` | Free + Paid |
| `GET /api/v1/:key/pharmacies` | Paid only |
| `GET /api/v1/:key/quantity/:medicineId/:userId` | Paid only |
| `GET /api/v1/:key/selling-price/:medicineId/:userId` | Paid only |

## License

Copyright © 2024 EasyPharma
