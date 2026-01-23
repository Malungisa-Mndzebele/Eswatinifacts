# Backend Setup Guide

## Prerequisites Installation

### 1. PostgreSQL Installation

#### Windows:
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` user
4. Default port is 5432

#### macOS:
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Redis Installation

#### Windows:
1. Download Redis from https://github.com/microsoftarchive/redis/releases
2. Extract and run `redis-server.exe`
3. Or use WSL2 and install Redis in Linux

#### macOS:
```bash
brew install redis
brew services start redis
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

## Database Setup

### 1. Create Database

Connect to PostgreSQL:
```bash
psql -U postgres
```

Create the database:
```sql
CREATE DATABASE eswatini_facts;
CREATE DATABASE eswatini_facts_test;  -- For testing
```

Create a dedicated user (optional but recommended):
```sql
CREATE USER eswatini_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE eswatini_facts TO eswatini_user;
GRANT ALL PRIVILEGES ON DATABASE eswatini_facts_test TO eswatini_user;
```

Exit psql:
```sql
\q
```

### 2. Configure Environment

Update `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eswatini_facts
DB_USER=postgres  # or eswatini_user if you created one
DB_PASSWORD=your_password_here
DB_SSL=false
```

### 3. Initialize Schema

Run the initialization script:
```bash
node src/database/init.js
```

This will create all tables, indexes, and functions defined in `src/database/schema.sql`.

## Verification

### Test Connections

Run the connection test script:
```bash
node test-connections.js
```

You should see:
```
=== Connection Test Results ===
Database: ✓ Connected
Redis: ✓ Connected
```

### Run Property-Based Tests

```bash
npm run test:pbt
```

### Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Visit http://localhost:3000/health to verify the server is running.

## Troubleshooting

### PostgreSQL Connection Issues

**Error: "password authentication failed"**
- Verify your password in `.env` matches your PostgreSQL user password
- Check `pg_hba.conf` file for authentication method (should be `md5` or `scram-sha-256`)

**Error: "database does not exist"**
- Create the database using the SQL commands above
- Verify the database name in `.env` matches the created database

**Error: "connection refused"**
- Ensure PostgreSQL service is running
- Check if PostgreSQL is listening on the correct port (default 5432)

### Redis Connection Issues

**Error: "connection refused"**
- Ensure Redis service is running
- Check if Redis is listening on the correct port (default 6379)

**Error: "authentication failed"**
- If Redis has a password, add it to `.env` as `REDIS_PASSWORD`

## Security Notes

- Never commit `.env` file to version control
- Use strong passwords for production
- Generate secure random keys for JWT_SECRET and ENCRYPTION_KEY
- Enable SSL for database connections in production
- Use environment-specific configuration files

## Next Steps

After successful setup:
1. Review the API documentation
2. Explore the database schema in `src/database/schema.sql`
3. Run the test suite to verify everything works
4. Start implementing API endpoints
