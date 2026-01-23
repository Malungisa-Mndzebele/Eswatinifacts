# Filter Configuration Round-Trip Property Test

## Overview

Implemented property-based test for **Property 30: Filter configuration round-trip** which validates **Requirements 8.5**.

## Property Statement

**For any saved filter configuration, retrieving it via the shareable URL should restore the exact same filter settings**

## Test Implementation

### File Location
`backend/tests/filter-configuration.pbt.test.js`

### Test Coverage

The property test includes 8 comprehensive test cases:

1. **Main Round-Trip Test** (100 runs)
   - Generates random filter configurations with various combinations of:
     - Categories (economy, health, education, politics, culture)
     - Countries (Eswatini, South Africa, Mozambique, Botswana, Zimbabwe, etc.)
     - Date ranges (start and end dates)
     - Sort options (sortBy, sortOrder)
   - Saves configuration via POST `/api/visualization/filter-config`
   - Retrieves configuration via GET `/api/visualization/filter-config/:configId`
   - Verifies all filter fields match exactly after round-trip

2. **All Fields Populated Test** (50 runs)
   - Tests configurations with all possible fields populated
   - Ensures no data loss when maximum complexity is used

3. **Minimal Fields Test** (50 runs)
   - Tests configurations with only one field populated
   - Verifies sparse configurations work correctly

4. **Empty Filters Test**
   - Tests edge case of empty filter object
   - Ensures system handles minimal valid input

5. **Non-Existent Configuration Test** (20 runs)
   - Generates random configuration IDs
   - Verifies 404 response for non-existent configurations
   - Checks appropriate error messages

6. **Missing Filters Field Test**
   - Tests validation error handling
   - Verifies 422 response when required field is missing

7. **Multiple Configurations Test** (30 runs)
   - Saves 3-5 different configurations
   - Retrieves each independently
   - Verifies no cross-contamination between configurations

8. **Shareable URL Format Test** (50 runs)
   - Verifies URL format consistency
   - Checks that config ID is included in shareable URL
   - Validates URL structure

## Key Features

### Smart Generators
- **Category Generator**: Valid category names from the system
- **Country Generator**: Valid country names including regional neighbors
- **Date Generator**: Realistic date ranges (2020-2024)
- **Filter Config Generator**: Comprehensive filter combinations with optional fields

### Normalization Logic
- Converts dates to ISO strings for consistent comparison
- Handles null/undefined values correctly
- Sorts arrays before comparison to handle order differences

### Server Availability Handling
- Tests gracefully skip when server is not running
- Provides helpful message to start server
- Allows test suite to run without blocking

## API Endpoints Tested

### Save Configuration
```
POST /api/visualization/filter-config
Body: {
  name?: string,
  filters: {
    categories?: string[],
    countries?: string[],
    startDate?: Date,
    endDate?: Date,
    sortBy?: string,
    sortOrder?: string
  }
}
Response: {
  success: true,
  data: {
    configId: string,
    shareableUrl: string,
    expiresIn: string
  }
}
```

### Load Configuration
```
GET /api/visualization/filter-config/:configId
Response: {
  success: true,
  data: {
    id: string,
    name: string,
    filters: {...},
    createdAt: string
  }
}
```

## Test Results

✅ All 8 tests passing
- Total test runs: 100+ property test iterations
- Coverage: Round-trip correctness, edge cases, error handling
- Validation: Filter preservation, URL format, error responses

## Implementation Details

### Storage Mechanism
- Configurations stored in Redis with 30-day expiration
- Configuration IDs are 32-character hex strings (crypto.randomBytes)
- Key format: `filter:{configId}`

### Data Preservation
The test verifies that all filter fields are preserved exactly:
- Array fields (categories, countries) maintain all elements
- Date fields maintain exact timestamps (converted to ISO strings)
- String fields (sortBy, sortOrder) maintain exact values
- Null/undefined fields are handled correctly

### Error Handling
Tests verify proper error responses for:
- Missing required fields (422 Unprocessable Entity)
- Non-existent configurations (404 Not Found)
- Invalid requests (appropriate error messages)

## Running the Tests

```bash
# Start the server first
cd backend
npm start

# In another terminal, run the test
node tests/filter-configuration.pbt.test.js
```

## Dependencies

- `fast-check`: Property-based testing framework
- `node:test`: Node.js native test runner
- `node:assert`: Node.js native assertions

## Notes

- Tests use 100 iterations for main property test to ensure thorough coverage
- 30-second timeout per test to handle async operations
- Tests are designed to be deterministic despite using random generation
- All tests clean up after themselves (no persistent state)
