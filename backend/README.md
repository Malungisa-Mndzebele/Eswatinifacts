# Eswatini Facts Platform - Backend

Backend API server for the Eswatini Facts data transparency platform.

## Prerequisites

- Node.js 18+ (with ES modules support)
- PostgreSQL 14+
- Redis 6+

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from example:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
   - Database credentials
   - Redis connection details
   - JWT secret
   - Encryption key (32 bytes)
   - Email service credentials

4. Initialize database:
```bash
node src/database/init.js
```

## Running the Server

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

## Testing

### Run all tests:
```bash
npm test
```

### Run property-based tests:
```bash
npm run test:pbt
```

## Database Management

### Initialize schema:
```bash
node src/database/init.js
```

### Reset database (WARNING: drops all data):
```bash
node -e "import('./src/database/init.js').then(m => m.resetDatabase())"
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### API Version
- `GET /api/v1` - API version information

## Architecture

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.js  # PostgreSQL connection
│   │   └── redis.js     # Redis connection
│   ├── database/        # Database management
│   │   ├── schema.sql   # Database schema
│   │   └── init.js      # Schema initialization
│   └── server.js        # Express server
├── tests/               # Test files
├── .env.example         # Environment variables template
├── .gitignore          # Git ignore rules
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

## Environment Variables

See `.env.example` for all available configuration options.

## Security

- All passwords hashed with bcrypt (work factor 10)
- JWT tokens for authentication
- PII encrypted at rest with AES-256
- Rate limiting on all endpoints
- CORS configured for allowed origins
- Helmet.js for security headers
- Input validation and sanitization

## Database Schema

The database includes the following tables:
- `users` - User accounts
- `blog_posts` - CMS content
- `saved_content` - User bookmarks
- `newsletter_subscriptions` - Email subscriptions
- `api_keys` - API authentication
- `translations` - Multi-language content
- `search_index` - Full-text search
- `audit_logs` - Administrative actions
- `data_sources` - Statistical data sources
- `data_points` - Statistical data
- `newsletters` - Newsletter campaigns

## License

Proprietary - Eswatini Facts Platform
