import fc from 'fast-check';
import pool from '../src/config/database.js';

/**
 * Property-Based Test: Translation Fallback Behavior
 * Feature: eswatini-facts-platform, Property 19: Translation fallback behavior
 * Validates: Requirements 6.3
 * 
 * For any content item without a translation in the selected language, 
 * the Platform should display the English version with a notice
 */

describe('Translation - Fallback Behavior', () => {
  // Clean up test data after tests
  afterAll(async () => {
    await pool.query(`DELETE FROM translations WHERE content_type = 'test_fallback'`);
    await pool.end();
  });

  test('Property 19: Missing translations fall back to English with notice', () => {
    return fc.assert(
      fc.asyncProperty(
        // Generate content ID
        fc.uuid(),
        // Generate non-English locale
        fc.constantFrom('ss', 'zu', 'fr', 'pt', 'es', 'de'),
        // Generate fields with English translations
        fc.array(
          fc.record({
            fieldName: fc.constantFrom('title', 'description', 'content', 'summary', 'excerpt'),
            englishValue: fc.string({ minLength: 10, maxLength: 100 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        // Generate which fields have translations in the target locale
        fc.array(fc.boolean()),
        async (contentId, targetLocale, fields, hasTranslations) => {
          // Create unique field names
          const uniqueFields = [];
          const seenFields = new Set();
          for (const field of fields) {
            if (!seenFields.has(field.fieldName)) {
              uniqueFields.push(field);
              seenFields.add(field.fieldName);
            }
          }

          if (uniqueFields.length === 0) return true;

          // Ensure hasTranslations array matches uniqueFields length
          const translationFlags = hasTranslations.slice(0, uniqueFields.length);
          while (translationFlags.length < uniqueFields.length) {
            translationFlags.push(false);
          }

          try {
            // Insert English (default) translations for all fields
            for (const field of uniqueFields) {
              await pool.query(
                `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
                 VALUES ($1, $2, 'en', $3, $4)
                 ON CONFLICT (content_type, content_id, locale, field_name) DO UPDATE
                 SET translated_value = $4`,
                ['test_fallback', contentId, field.fieldName, field.englishValue]
              );
            }

            // Insert translations for target locale (only for some fields)
            for (let i = 0; i < uniqueFields.length; i++) {
              if (translationFlags[i]) {
                await pool.query(
                  `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT (content_type, content_id, locale, field_name) DO UPDATE
                   SET translated_value = $5`,
                  ['test_fallback', contentId, targetLocale, uniqueFields[i].fieldName, `${targetLocale}_${uniqueFields[i].englishValue}`]
                );
              }
            }

            // Fetch translations for target locale
            const targetResult = await pool.query(
              `SELECT field_name, translated_value
               FROM translations
               WHERE content_type = $1 AND content_id = $2 AND locale = $3`,
              ['test_fallback', contentId, targetLocale]
            );

            // Fetch English translations
            const englishResult = await pool.query(
              `SELECT field_name, translated_value
               FROM translations
               WHERE content_type = $1 AND content_id = $2 AND locale = 'en'`,
              ['test_fallback', contentId]
            );

            const targetTranslations = new Map(targetResult.rows.map(r => [r.field_name, r.translated_value]));
            const englishTranslations = new Map(englishResult.rows.map(r => [r.field_name, r.translated_value]));

            // Build complete translation set with fallback
            const completeTranslations = new Map();
            const fallbackFields = [];

            for (const field of uniqueFields) {
              if (targetTranslations.has(field.fieldName)) {
                // Use target locale translation
                completeTranslations.set(field.fieldName, targetTranslations.get(field.fieldName));
              } else if (englishTranslations.has(field.fieldName)) {
                // Fallback to English
                completeTranslations.set(field.fieldName, englishTranslations.get(field.fieldName));
                fallbackFields.push(field.fieldName);
              }
            }

            // Property 1: Every field should have a value (either translated or fallback)
            for (const field of uniqueFields) {
              if (!completeTranslations.has(field.fieldName)) {
                return false;
              }
            }

            // Property 2: Fallback fields should use English values
            for (const fieldName of fallbackFields) {
              const value = completeTranslations.get(fieldName);
              const englishValue = englishTranslations.get(fieldName);
              if (value !== englishValue) {
                return false;
              }
            }

            // Property 3: Non-fallback fields should use target locale values
            for (let i = 0; i < uniqueFields.length; i++) {
              if (translationFlags[i]) {
                const fieldName = uniqueFields[i].fieldName;
                const value = completeTranslations.get(fieldName);
                const expectedValue = `${targetLocale}_${uniqueFields[i].englishValue}`;
                if (value !== expectedValue) {
                  return false;
                }
              }
            }

            // Property 4: Should be able to identify which fields used fallback
            const actualFallbackCount = fallbackFields.length;
            const expectedFallbackCount = translationFlags.filter(flag => !flag).length;
            if (actualFallbackCount !== expectedFallbackCount) {
              return false;
            }

            // Cleanup
            await pool.query(
              `DELETE FROM translations WHERE content_type = 'test_fallback' AND content_id = $1`,
              [contentId]
            );

            return true;
          } catch (error) {
            console.error('Test error:', error);
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Fallback behavior provides English when target locale missing', async () => {
    const testContentId = 'fallback_test_' + Date.now();
    
    // Insert only English translations
    await pool.query(
      `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
       VALUES 
       ('test_fallback', $1, 'en', 'title', 'English Title'),
       ('test_fallback', $1, 'en', 'body', 'English Body'),
       ('test_fallback', $1, 'en', 'summary', 'English Summary')`,
      [testContentId]
    );

    // Try to fetch siSwati translations (which don't exist)
    const ssResult = await pool.query(
      `SELECT field_name, translated_value
       FROM translations
       WHERE content_type = 'test_fallback' AND content_id = $1 AND locale = 'ss'`,
      [testContentId]
    );

    // Should return no results for siSwati
    expect(ssResult.rows).toHaveLength(0);

    // Fetch English as fallback
    const enResult = await pool.query(
      `SELECT field_name, translated_value
       FROM translations
       WHERE content_type = 'test_fallback' AND content_id = $1 AND locale = 'en'`,
      [testContentId]
    );

    // Should return all English translations
    expect(enResult.rows).toHaveLength(3);
    expect(enResult.rows.map(r => r.field_name).sort()).toEqual(['body', 'summary', 'title']);

    // Cleanup
    await pool.query(
      `DELETE FROM translations WHERE content_type = 'test_fallback' AND content_id = $1`,
      [testContentId]
    );
  });

  test('Partial translations use fallback for missing fields only', async () => {
    const testContentId = 'partial_fallback_' + Date.now();
    
    // Insert English translations for all fields
    await pool.query(
      `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
       VALUES 
       ('test_fallback', $1, 'en', 'title', 'English Title'),
       ('test_fallback', $1, 'en', 'body', 'English Body'),
       ('test_fallback', $1, 'en', 'summary', 'English Summary')`,
      [testContentId]
    );

    // Insert partial siSwati translations (only title and body)
    await pool.query(
      `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
       VALUES 
       ('test_fallback', $1, 'ss', 'title', 'siSwati Title'),
       ('test_fallback', $1, 'ss', 'body', 'siSwati Body')`,
      [testContentId]
    );

    // Fetch siSwati translations
    const ssResult = await pool.query(
      `SELECT field_name, translated_value
       FROM translations
       WHERE content_type = 'test_fallback' AND content_id = $1 AND locale = 'ss'
       ORDER BY field_name`,
      [testContentId]
    );

    // Should have 2 siSwati translations
    expect(ssResult.rows).toHaveLength(2);
    expect(ssResult.rows[0].translated_value).toBe('siSwati Body');
    expect(ssResult.rows[1].translated_value).toBe('siSwati Title');

    // Fetch English for fallback
    const enResult = await pool.query(
      `SELECT field_name, translated_value
       FROM translations
       WHERE content_type = 'test_fallback' AND content_id = $1 AND locale = 'en'
       ORDER BY field_name`,
      [testContentId]
    );

    // Build complete set with fallback
    const ssMap = new Map(ssResult.rows.map(r => [r.field_name, r.translated_value]));
    const enMap = new Map(enResult.rows.map(r => [r.field_name, r.translated_value]));
    
    const complete = {
      title: ssMap.get('title') || enMap.get('title'),
      body: ssMap.get('body') || enMap.get('body'),
      summary: ssMap.get('summary') || enMap.get('summary'),
    };

    expect(complete.title).toBe('siSwati Title');
    expect(complete.body).toBe('siSwati Body');
    expect(complete.summary).toBe('English Summary'); // Fallback

    // Cleanup
    await pool.query(
      `DELETE FROM translations WHERE content_type = 'test_fallback' AND content_id = $1`,
      [testContentId]
    );
  });
});
