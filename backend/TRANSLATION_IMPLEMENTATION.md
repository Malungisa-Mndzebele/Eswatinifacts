# Multi-Language Support Implementation

## Overview

This document describes the implementation of the multi-language support system for the Eswatini Facts Platform, completed as part of Task 11.

## Implementation Details

### Components Created

1. **Translation Controller** (`src/controllers/translationController.js`)
   - Handles all translation-related operations
   - Implements CRUD operations for translations
   - Provides language detection and fallback logic
   - Supports bulk translation operations

2. **Translation Routes** (`src/routes/translation.js`)
   - Public routes for fetching translations and detecting language
   - Admin-only routes for creating, updating, and deleting translations
   - Integrated with authentication and authorization middleware

3. **Server Integration** (`src/server.js`)
   - Added translation routes to the Express application
   - Routes available at `/api/v1/translations`

### API Endpoints

#### Public Endpoints

- `GET /api/v1/translations/locales` - Get list of available locales
- `GET /api/v1/translations/detect-language` - Detect user's preferred language from browser headers
- `GET /api/v1/translations/content/:contentType/:contentId` - Get content with translations and fallback
- `GET /api/v1/translations/:contentType/:contentId` - Get all translations for specific content

#### Admin Endpoints (Require Authentication + Admin Role)

- `POST /api/v1/translations` - Create or update a single translation
- `POST /api/v1/translations/bulk` - Bulk create/update translations
- `DELETE /api/v1/translations/:id` - Delete a translation

### Key Features

#### 1. Language Detection
- Automatically detects user's preferred language from `Accept-Language` header
- Falls back to English if no matching locale is available
- Returns list of available locales and detected language

#### 2. Translation Fallback
- When content is not available in the requested language, falls back to English
- Clearly indicates which fields used fallback
- Maintains data integrity by ensuring all content has at least English translation

#### 3. Translation Association
- Translations are associated with content using:
  - `content_type`: Type of content (e.g., 'blog_post', 'ui_element')
  - `content_id`: Unique identifier for the content
  - `locale`: Language code (e.g., 'en', 'ss')
  - `field_name`: Name of the field being translated (e.g., 'title', 'body')
- Unique constraint ensures no duplicate translations

#### 4. Bulk Operations
- Supports bulk creation/update of translations
- Uses database transactions for atomicity
- Efficient for importing large translation sets

### Database Schema

The translations table (already existed in schema):

```sql
CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type VARCHAR(50) NOT NULL,
  content_id VARCHAR(255) NOT NULL,
  locale VARCHAR(10) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  translated_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(content_type, content_id, locale, field_name)
);
```

### Property-Based Tests

Four comprehensive property-based tests were created to validate the translation system:

1. **translation-language-switching.pbt.test.js**
   - Property 17: Language switching completeness
   - Validates: Requirements 6.1
   - Tests that all UI elements are displayed in selected language or marked as untranslated

2. **translation-display-logic.pbt.test.js**
   - Property 18: Translation display logic
   - Validates: Requirements 6.2
   - Tests that content with translations displays in the selected language when available

3. **translation-fallback.pbt.test.js**
   - Property 19: Translation fallback behavior
   - Validates: Requirements 6.3
   - Tests that missing translations fall back to English with notice

4. **translation-association.pbt.test.js**
   - Property 20: Translation association
   - Validates: Requirements 6.5
   - Tests that translations are correctly associated with content and retrievable

Each test runs 100 iterations with randomly generated data to ensure robustness.

## Usage Examples

### Creating a Translation (Admin)

```javascript
POST /api/v1/translations
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "contentType": "blog_post",
  "contentId": "123e4567-e89b-12d3-a456-426614174000",
  "locale": "ss",
  "fieldName": "title",
  "translatedValue": "Sihloko sesiSwati"
}
```

### Getting Content with Translations

```javascript
GET /api/v1/translations/content/blog_post/123e4567-e89b-12d3-a456-426614174000?locale=ss

Response:
{
  "success": true,
  "data": {
    "contentType": "blog_post",
    "contentId": "123e4567-e89b-12d3-a456-426614174000",
    "locale": "ss",
    "translations": {
      "title": "Sihloko sesiSwati",
      "body": "English Body"  // Fallback
    },
    "fallbackUsed": true,
    "fallbackFields": ["body"]
  }
}
```

### Detecting User Language

```javascript
GET /api/v1/translations/detect-language
Accept-Language: ss,en-US;q=0.9,en;q=0.8

Response:
{
  "success": true,
  "data": {
    "detectedLocale": "ss",
    "source": "browser",
    "availableLocales": ["en", "ss"],
    "browserLanguages": ["ss", "en"]
  }
}
```

### Bulk Creating Translations (Admin)

```javascript
POST /api/v1/translations/bulk
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "translations": [
    {
      "contentType": "ui_element",
      "contentId": "header",
      "locale": "ss",
      "fieldName": "home",
      "translatedValue": "Ekhaya"
    },
    {
      "contentType": "ui_element",
      "contentId": "header",
      "locale": "ss",
      "fieldName": "about",
      "translatedValue": "Mayelana"
    }
  ]
}
```

## Requirements Validation

### Requirement 6.1: Language Switching
✅ Implemented - Language switcher API endpoint returns all UI elements in selected language or with fallback indication

### Requirement 6.2: Translation Display
✅ Implemented - Content with available translations displays in the selected language

### Requirement 6.3: Translation Fallback
✅ Implemented - Content without translation in selected language displays English version with notice

### Requirement 6.4: Browser Language Detection
✅ Implemented - Platform detects browser language from Accept-Language header and defaults to siSwati if available

### Requirement 6.5: Translation Management
✅ Implemented - Administrators can add translations that are immediately associated with content and available

## Testing

### Running Translation Tests

```bash
# Run all translation property-based tests
cd backend
node --test tests/translation-language-switching.pbt.test.js
node --test tests/translation-display-logic.pbt.test.js
node --test tests/translation-fallback.pbt.test.js
node --test tests/translation-association.pbt.test.js
```

### Test Coverage

- Language switching completeness: 100 property test iterations
- Translation display logic: 100 property test iterations
- Translation fallback behavior: 100 property test iterations
- Translation association: 100 property test iterations
- Additional unit tests for edge cases

## Integration with Existing System

The translation system integrates seamlessly with:

1. **Authentication System** - Admin routes require authentication and admin role
2. **Database** - Uses existing translations table from schema
3. **API Structure** - Follows existing API patterns and error handling
4. **Security** - Protected by existing middleware (helmet, CORS, rate limiting)

## Future Enhancements

1. **Translation UI** - Admin interface for managing translations
2. **Translation Memory** - Suggest similar translations
3. **Machine Translation** - Integration with translation APIs for initial drafts
4. **Translation Workflow** - Review and approval process for translations
5. **Translation Analytics** - Track which languages are most used
6. **RTL Support** - Enhanced support for right-to-left languages

## Notes

- All translations are stored in the database for easy management
- The system supports any number of locales
- Locale codes follow ISO 639-1 standard (e.g., 'en', 'ss', 'fr')
- The unique constraint prevents duplicate translations
- Fallback to English ensures content is always available
- Browser language detection provides automatic localization

</content>
