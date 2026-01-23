# Data API Implementation

## Overview

This document describes the implementation of the Data API endpoints for the Eswatini Facts Platform. The API provides programmatic access to statistical data across multiple categories (economy, health, education, politics, culture) with filtering capabilities and API key authentication.

## Implementation Summary

### Components Created

1. **Data Controller** (`src/controllers/dataController.js`)
   - API key generation and management
   - Data retrieval endpoints for all categories
   - Query parameter validation
   - Response formatting with metadata

2. **API Key Authentication Middleware** (`src/middleware/apiKeyAuth.js`)
   - API key validation and authentication
   - Rate limiting per API key
   - Redis caching for performance
   - Optional authentication support

3. **Data Routes** (`src/routes/data.js`)
   - API key management routes (JWT-protected)
   - Data access routes (API key-protected)
   - Query validation middleware

4. **Property-Based Tests**
   - API response format validation
   - Error handling verification
   - Filter correctness testing

## API Endpoints

### API Key Management (JWT Authentication Required)

#### Generate API Key
```
POST /api/v1/data/keys
Authorization: Bearer <jwt_token>

Body:
{
  "name": "My API Key",
  "rateLimit": 1000,
  "expiresInDays": 365
}

Response:
{
  "success": true,
  "data": {
    "apiKey": "efp_...",
    "keyInfo": {
      "id": "uuid",
      "name": "My API Key",
      "rateLimit": 1000,
      "createdAt": "2024-01-01T00:00:00Z",
      "expiresAt": "2025-01-01T00:00:00Z"
    },
    "warning": "Store this API key securely. It will not be shown again."
  }
}
```

#### List API Keys
```
GET /api/v1/data/keys
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "data": {
    "keys": [
      {
        "id": "uuid",
        "name": "My API Key",
        "rateLimit": 1000,
        "createdAt": "2024-01-01T00:00:00Z",
        "lastUsedAt": "2024-01-15T10:30:00Z",
        "expiresAt": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### Revoke API Key
```
DELETE /api/v1/data/keys/:id
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "data": {
    "message": "API key revoked successfully"
  }
}
```

### Data Access (API Key Authentication Required)

All data endpoints follow the same pattern with different categories:

- `GET /api/v1/data/economy`
- `GET /api/v1/data/health`
- `GET /api/v1/data/education`
- `GET /api/v1/data/politics`
- `GET /api/v1/data/culture`

#### Query Parameters

- `startDate` (optional): ISO 8601 date (YYYY-MM-DD) - Filter data from this date
- `endDate` (optional): ISO 8601 date (YYYY-MM-DD) - Filter data until this date
- `metric` (optional): String - Filter by specific metric name
- `subcategory` (optional): String - Filter by subcategory
- `limit` (optional): Integer (1-1000, default 100) - Number of results to return
- `offset` (optional): Integer (min 0, default 0) - Number of results to skip

#### Example Request

```
GET /api/v1/data/economy?startDate=2020-01-01&endDate=2023-12-31&metric=GDP&limit=50
X-API-Key: efp_your_api_key_here

Response:
{
  "success": true,
  "data": {
    "category": "economy",
    "dataPoints": [
      {
        "id": "uuid",
        "metricName": "GDP",
        "metricValue": 4500000000,
        "metricUnit": "currency",
        "dateRecorded": "2023-12-31",
        "subcategory": "National Accounts",
        "metadata": {},
        "source": {
          "name": "Central Bank of Eswatini",
          "url": "https://example.com/data"
        }
      }
    ],
    "count": 1
  },
  "metadata": {
    "version": "1.0.0",
    "timestamp": "2024-01-15T10:30:00Z",
    "rateLimit": {
      "limit": 1000,
      "remaining": 999
    }
  }
}
```

## API Key Authentication

### Key Format

API keys follow the format: `efp_<64_hex_characters>`

Example: `efp_a1b2c3d4e5f6...`

### Authentication Header

Include the API key in the `X-API-Key` header:

```
X-API-Key: efp_your_api_key_here
```

### Rate Limiting

- Each API key has a configurable rate limit (default: 1000 requests/hour)
- Rate limit information is included in response metadata
- Exceeded limits return 429 status with retry-after information

### Security Features

1. **Key Hashing**: API keys are hashed (SHA-256) before storage
2. **Redis Caching**: Key validation results cached for 5 minutes
3. **Expiration**: Keys can have optional expiration dates
4. **Last Used Tracking**: Tracks when each key was last used
5. **User Association**: Keys are tied to user accounts

## Error Handling

### Error Response Format

All errors follow a consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes

- `API_KEY_REQUIRED` (401): No API key provided
- `INVALID_API_KEY` (401): API key is invalid or not found
- `API_KEY_EXPIRED` (401): API key has expired
- `RATE_LIMIT_EXCEEDED` (429): Rate limit exceeded
- `VALIDATION_ERROR` (422): Invalid query parameters
- `NOT_FOUND` (404): Endpoint not found
- `INTERNAL_ERROR` (500): Server error

## Property-Based Tests

### Test Coverage

1. **API Response Format** (`tests/api-response-format.pbt.test.js`)
   - Validates JSON response structure
   - Verifies schema consistency across endpoints
   - Checks metadata completeness

2. **API Error Handling** (`tests/api-error-handling.pbt.test.js`)
   - Tests 404 responses for invalid endpoints
   - Validates 401 responses for missing/invalid keys
   - Checks 422 responses for validation errors
   - Verifies consistent error structure

3. **API Filtering** (`tests/api-filtering.pbt.test.js`)
   - Tests date range filtering
   - Validates metric name filtering
   - Checks subcategory filtering
   - Tests multiple filter combinations
   - Verifies limit and offset parameters

### Running Tests

The tests require both the database and server to be running:

```bash
# Start the server in one terminal
npm start

# Run tests in another terminal
npm test -- tests/api-response-format.pbt.test.js
npm test -- tests/api-error-handling.pbt.test.js
npm test -- tests/api-filtering.pbt.test.js
```

If the server is not running, tests will skip gracefully with informative messages.

## Database Schema

The API uses the following tables:

### api_keys
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  rate_limit INTEGER DEFAULT 1000,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

### data_sources
```sql
CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  url VARCHAR(500),
  category VARCHAR(100),
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### data_points
```sql
CREATE TABLE data_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  metric_name VARCHAR(255) NOT NULL,
  metric_value NUMERIC,
  metric_unit VARCHAR(50),
  date_recorded DATE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Usage Examples

### JavaScript/Node.js

```javascript
const API_KEY = 'efp_your_api_key_here';
const BASE_URL = 'http://localhost:3000/api/v1/data';

async function getEconomyData() {
  const response = await fetch(`${BASE_URL}/economy?startDate=2020-01-01&limit=10`, {
    headers: {
      'X-API-Key': API_KEY
    }
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log(`Found ${data.data.count} data points`);
    data.data.dataPoints.forEach(point => {
      console.log(`${point.metricName}: ${point.metricValue} ${point.metricUnit}`);
    });
  } else {
    console.error('Error:', data.error.message);
  }
}
```

### Python

```python
import requests

API_KEY = 'efp_your_api_key_here'
BASE_URL = 'http://localhost:3000/api/v1/data'

def get_health_data():
    headers = {'X-API-Key': API_KEY}
    params = {
        'startDate': '2020-01-01',
        'endDate': '2023-12-31',
        'limit': 50
    }
    
    response = requests.get(f'{BASE_URL}/health', headers=headers, params=params)
    data = response.json()
    
    if data['success']:
        print(f"Found {data['data']['count']} data points")
        for point in data['data']['dataPoints']:
            print(f"{point['metricName']}: {point['metricValue']} {point['metricUnit']}")
    else:
        print(f"Error: {data['error']['message']}")
```

### cURL

```bash
# Get economy data
curl -H "X-API-Key: efp_your_api_key_here" \
  "http://localhost:3000/api/v1/data/economy?startDate=2020-01-01&limit=10"

# Generate new API key (requires JWT token)
curl -X POST \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"name":"My API Key","rateLimit":1000}' \
  http://localhost:3000/api/v1/data/keys
```

## Future Enhancements

1. **API Versioning**: Support for multiple API versions (v1, v2, etc.)
2. **Webhooks**: Notify clients when new data is available
3. **Batch Requests**: Support for requesting multiple categories in one call
4. **GraphQL**: Alternative query interface for more flexible data retrieval
5. **Data Aggregation**: Built-in aggregation functions (sum, average, etc.)
6. **Export Formats**: Support for CSV, Excel, and other formats
7. **API Documentation**: Interactive API documentation (Swagger/OpenAPI)
8. **SDK Libraries**: Official client libraries for popular languages

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 5.1**: API returns data in JSON format with expected schema
- **Requirement 5.2**: Rate limiting implemented per API key
- **Requirement 5.3**: 404 errors returned for invalid endpoints with error details
- **Requirement 5.4**: Filtering works correctly for all specified criteria
- **Requirement 5.5**: API versioning implemented in routes (/api/v1/...)

## Correctness Properties

The implementation validates the following properties:

- **Property 14**: API response format - All responses follow consistent JSON schema
- **Property 15**: API error handling - Errors include proper status codes and details
- **Property 16**: API filter correctness - Filters return only matching data
