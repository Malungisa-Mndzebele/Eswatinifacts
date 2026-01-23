# Time Filter Propagation Property Test

## Overview

This document describes the property-based test implementation for **Property 27: Time filter propagation**, which validates **Requirement 8.2**.

## Property Definition

**Property 27: Time filter propagation**
*For any* time period filter applied, all visualizations on the page should update to show only data within that time period

**Validates: Requirements 8.2**
> WHEN a user applies time period filters THEN the Platform SHALL update all visualizations to reflect the selected time range

## Test Implementation

### File Location
`backend/tests/time-filter-propagation.pbt.test.js`

### Test Strategy

The property test validates that time filtering works consistently across all data category endpoints (economy, health, education, politics, culture). The test uses property-based testing with fast-check to generate random:
- Category selections (2-5 categories)
- Time ranges (start and end dates)
- Data points with various dates (some within range, some outside)

### Test Cases

#### 1. Time filter propagates to all category endpoints
- **Property**: When a time filter (startDate and endDate) is applied, ALL category endpoints return only data within that range
- **Approach**: 
  - Generate 2-5 random categories
  - Generate a random time filter range
  - Create test data spanning before, during, and after the filter range
  - Fetch data from each category endpoint with the time filter
  - Verify all returned data points are within the filter range
- **Runs**: 50 iterations

#### 2. Time filter with only startDate filters correctly
- **Property**: When only startDate is provided, all endpoints return data >= startDate
- **Approach**:
  - Generate 2-3 categories
  - Generate a random start date
  - Create test data before and after the start date
  - Verify all returned data is >= startDate
- **Runs**: 50 iterations

#### 3. Time filter with only endDate filters correctly
- **Property**: When only endDate is provided, all endpoints return data <= endDate
- **Approach**:
  - Generate 2-3 categories
  - Generate a random end date
  - Create test data before and after the end date
  - Verify all returned data is <= endDate
- **Runs**: 50 iterations

#### 4. Time filter excludes data outside the range
- **Property**: When data exists only outside the filter range, no data is returned
- **Approach**:
  - Generate a narrow time range
  - Create test data ONLY before and after the range (none within)
  - Verify empty results from all category endpoints
- **Runs**: 50 iterations

#### 5. Time filter handles boundary dates correctly
- **Property**: Data points with dates exactly matching startDate or endDate are included
- **Approach**:
  - Create data points with exact boundary dates
  - Test with boundary as startDate (should include)
  - Test with boundary as endDate (should include)
- **Runs**: 50 iterations

## API Endpoints Tested

The test validates time filtering across all data category endpoints:
- `/api/data/economy?startDate=...&endDate=...`
- `/api/data/health?startDate=...&endDate=...`
- `/api/data/education?startDate=...&endDate=...`
- `/api/data/politics?startDate=...&endDate=...`
- `/api/data/culture?startDate=...&endDate=...`

## Test Data Management

- **Setup**: Creates a test data source before tests run
- **Per Test**: 
  - Inserts test data points with controlled dates
  - Fetches filtered data from endpoints
  - Validates the property
  - Cleans up test data
- **Teardown**: Removes test data source

## Running the Tests

### Prerequisites
1. PostgreSQL database running with schema initialized
2. Backend server running on port 3000
3. Environment variables configured in `.env`

### Commands

```bash
# Start the server
npm start

# Run the property test (in another terminal)
npm test -- tests/time-filter-propagation.pbt.test.js --run

# Run all tests
npm test
```

### Test Behavior

- If the server is not running, tests are automatically skipped with a helpful message
- Tests use the database configured in `.env` (default: `eswatini_facts_test`)
- Each test run performs 50 iterations with random data
- Total timeout per test: 30 seconds

## Property-Based Testing Benefits

This property-based approach provides several advantages over example-based tests:

1. **Comprehensive Coverage**: Tests 50 random scenarios per test case, covering edge cases that might be missed in manual test writing
2. **Date Range Variety**: Automatically tests various date ranges, durations, and boundary conditions
3. **Category Combinations**: Tests different combinations of categories to ensure consistency
4. **Data Distribution**: Tests with data before, within, and after filter ranges
5. **Boundary Testing**: Automatically includes edge cases like exact boundary dates

## Expected Results

When the database and server are properly configured:
- All 5 test cases should pass
- Each test runs 50 iterations
- Total test suite execution time: ~10-20 seconds
- No data points outside the filter range should be returned
- Boundary dates should be included (inclusive filtering)

## Troubleshooting

### Tests are skipped
- **Cause**: Server is not running or not accessible at `http://localhost:3000`
- **Solution**: Start the server with `npm start` before running tests

### Database connection errors
- **Cause**: PostgreSQL is not running or credentials are incorrect
- **Solution**: 
  - Ensure PostgreSQL is running
  - Verify credentials in `.env` file
  - Run `npm run test:connections` to verify database connectivity

### Test failures
- **Cause**: Time filtering logic in data controllers may have bugs
- **Solution**: 
  - Review the failing test output for specific assertions
  - Check the data controller implementations in `src/controllers/dataController.js`
  - Verify SQL queries use correct date comparison operators (`>=` and `<=`)

## Implementation Notes

The test validates the existing time filtering implementation in the data controllers. Each category endpoint (economy, health, education, politics, culture) already implements date filtering via `startDate` and `endDate` query parameters.

The property test ensures this filtering is:
1. **Consistent**: Works the same way across all category endpoints
2. **Correct**: Only returns data within the specified range
3. **Complete**: Handles all combinations of startDate/endDate
4. **Inclusive**: Includes boundary dates in results

## Related Files

- Test: `backend/tests/time-filter-propagation.pbt.test.js`
- Controllers: `backend/src/controllers/dataController.js`
- Routes: `backend/src/routes/data.js`
- Design: `.kiro/specs/eswatini-facts-platform/design.md` (Property 27)
- Requirements: `.kiro/specs/eswatini-facts-platform/requirements.md` (Requirement 8.2)
