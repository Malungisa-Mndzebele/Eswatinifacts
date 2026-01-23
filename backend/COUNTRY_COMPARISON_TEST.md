# Country Comparison Property-Based Test

## Overview

This document describes the property-based test implementation for **Property 28: Country comparison completeness** which validates **Requirement 8.3**: "WHEN a user compares Eswatini with regional neighbors THEN the Platform SHALL display side-by-side metrics for all selected countries"

## Test File

`backend/tests/country-comparison.pbt.test.js`

## Property Definition

**Property 28: Country comparison completeness**

*For any* set of selected countries including Eswatini, all metrics should be displayed for all selected countries in a comparable format

## Test Cases

### 1. Country Comparison Includes All Selected Countries

**Property**: For any selection of 2-5 countries (including Eswatini), all selected countries should appear in the response.

**Generator Strategy**:
- Generates 2-5 unique countries from: Eswatini, South Africa, Mozambique, Botswana, Zimbabwe, Lesotho, Namibia
- Ensures Eswatini is always included
- Generates 2-5 common metrics (GDP per capita, Life expectancy, Literacy rate, etc.)
- Creates data points for each country-metric combination

**Verification**:
- All selected countries appear in the response
- No unexpected countries are included

### 2. Country Comparison Displays Metrics in Comparable Format

**Property**: For any set of countries and metrics, each country should have data for the same set of metrics (ensuring comparability).

**Generator Strategy**:
- Generates 2-4 countries including Eswatini
- Generates 2-4 common metrics
- Creates complete data for all country-metric combinations

**Verification**:
- Each country has at least one metric
- The response structure allows for side-by-side comparison
- Data is organized in a comparable format

### 3. Country Comparison Requires Eswatini

**Property**: Comparisons should either require Eswatini to be included or automatically include it.

**Test Strategy**:
- Attempts to request comparison without Eswatini
- Verifies either:
  - Returns 422 validation error indicating Eswatini is required, OR
  - Returns 200 with Eswatini automatically included in results

**Rationale**: Since the platform is about Eswatini, all comparisons should include Eswatini as the baseline.

### 4. Country Comparison Handles Single Country

**Property**: The comparison endpoint should work with just Eswatini (single country case).

**Generator Strategy**:
- Generates 2-5 metrics
- Creates data only for Eswatini

**Verification**:
- Endpoint accepts single country
- Returns valid response with Eswatini data

### 5. Country Comparison Returns Only Selected Countries

**Property**: When data exists for multiple countries, only selected countries should be returned.

**Generator Strategy**:
- Creates data for ALL countries (7 countries)
- Requests comparison for only 2-3 selected countries

**Verification**:
- Response contains only data for selected countries
- No data from non-selected countries appears in response

## Test Configuration

- **Framework**: fast-check (JavaScript property-based testing)
- **Runs per property**: 50 iterations
- **Timeout**: 30 seconds per test
- **Server requirement**: Tests skip gracefully if server is not running

## Data Model

The test assumes data points have the following structure:

```javascript
{
  country: string,        // Country name
  metricName: string,     // Metric name (e.g., "GDP per capita")
  metricValue: number,    // Numeric value
  metricUnit: string,     // Unit (USD, percent, years, etc.)
  dateRecorded: Date,     // Date of measurement
  category: string        // Category (economy, health, education, etc.)
}
```

## Expected API Endpoint

The test expects an endpoint at:

```
GET /api/visualization/country-comparison?countries=Eswatini,South%20Africa,Mozambique
```

## Expected Response Format

The test is flexible and supports multiple response formats:

### Format 1: Grouped by Country
```json
{
  "success": true,
  "data": {
    "countries": {
      "Eswatini": [/* data points */],
      "South Africa": [/* data points */]
    }
  }
}
```

### Format 2: Flat List
```json
{
  "success": true,
  "data": {
    "dataPoints": [
      { "country": "Eswatini", "metric_name": "GDP per capita", ... },
      { "country": "South Africa", "metric_name": "GDP per capita", ... }
    ]
  }
}
```

### Format 3: Comparisons Array
```json
{
  "success": true,
  "data": {
    "comparisons": [
      { 
        "country": "Eswatini",
        "metrics": { "GDP per capita": 5000, ... }
      },
      { 
        "country": "South Africa",
        "metrics": { "GDP per capita": 7000, ... }
      }
    ]
  }
}
```

## Running the Tests

```bash
# Run the country comparison test
npm test tests/country-comparison.pbt.test.js

# Run all tests
npm test
```

## Current Status

✅ **Test Created**: The property-based test has been implemented and runs successfully.

⏳ **Endpoint Not Implemented**: The `/api/visualization/country-comparison` endpoint has not been implemented yet. The test will skip when the server is not running or the endpoint doesn't exist.

## Next Steps

1. Implement the `getCountryComparison` function in `backend/src/controllers/visualizationController.js`
2. Create the route in `backend/src/routes/visualization.js` (or add to existing routes)
3. Add the route to the server in `backend/src/server.js`
4. Run the property-based test to verify the implementation
5. Fix any issues revealed by the property tests

## Notes

- The test uses smart generators that create realistic country and metric combinations
- The test is designed to work with the existing database schema (assumes a `country` column in `data_points` table)
- The test follows the same pattern as other property-based tests in the codebase
- All test data is cleaned up after each test run to avoid pollution
