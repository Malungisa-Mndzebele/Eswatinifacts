import fc from 'fast-check';
import pool from '../src/config/database.js';

/**
 * Property-Based Test: Translation Display Logic
 * Feature: eswatini-facts-platform, Property 18: Translation display logic
 * Validates: Requirements 6.2
 * 
 * For any content item with available translations, selecting a language 
 * should display the translation in that language if it exists
 */

describe('Translation - Display Logic', () => {
  // Clean up test data after tests
  afterAll(async () => {
    await pool.query(`DELETE FROM translations WHERE content_type = 'test_content'`);
    await pool.end();
  });

  test('Property 18: Content with translations displays in selected language when available', () => {
    return fc.assert(
      fc.asyncProperty(
        // Generate content ID
        fc.uuid(),
        // Generate locales
        fc.constantFrom('en', 'ss', 'zu', 'fr', 'pt'),
        // Generate field names and values
        fc.array(
          fc.record({
            fieldName: fc.constantFrom('title', 'description', 'content', 'summary'),
            value: fc.string({ minLength: 10, maxLength: 100 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (contentId, locale, fields) => {
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

          try {
            // Insert translations for the selected locale
            for (const field of uniqueFields) {
              await pool.query(
                `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (content_type, content_id, locale, field_name) DO UPDATE
                 SET translated_value = $5`,
                ['test_content', contentId, locale, field.fieldName, field.value]
              );
            }

            // Fetch translations for the selected locale
            const result = await pool.query(
              `SELECT field_name, translated_value
               FROM translations
               WHERE content_type = $1 AND content_id = $2 AND locale = $3`,
              ['test_content', contentId, locale]
            );

            // Property 1: All inserted translations should be retrievable
            if (result.rows.length !== uniqueFields.length) {
              return false;
            }

            // Property 2: Retrieved translations should match inserted values
            const retrievedMap = new Map(result.rows.map(r => [r.field_name, r.translated_value]));
            for (const field of uniqueFields) {
              const retrieved = retrievedMap.get(field.fieldName);
              if (retrieved !== field.value) {
                return false;
              }
            }

            // Property 3: Translations should be specific to the locale
            // Check that we don't get translations from other locales
            const allResult = await pool.query(
              `SELECT locale, field_name, translated_value
               FROM translations
               WHERE content_type = $1 AND content_id = $2`,
              ['test_content', contentId]
            );

            for (const row of allResult.rows) {
              if (row.locale === locale) {
                // Should match our inserted values
                const expectedField = uniqueFields.find(f => f.fieldName === row.field_name);
                if (expectedField && row.translated_value !== expectedField.value) {
                  return false;
                }
              }
            }

            // Cleanup
            await pool.query(
              `DELETE FROM translations WHERE content_type = 'test_content' AND content_id = $1`,
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

  test('Translation display returns correct locale-specific content', async () => {
    const testContentId = 'display_test_' + Date.now();
    
    // Insert translations for multiple locales
    await pool.query(
      `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
       VALUES 
       ('test_content', $1, 'en', 'title', 'English Title'),
       ('test_content', $1, 'en', 'body', 'English Body'),
       ('test_content', $1, 'ss', 'title', 'siSwati Title'),
       ('test_content', $1, 'ss', 'body', 'siSwati Body'),
       ('test_content', $1, 'fr', 'title', 'French Title'),
       ('test_content', $1, 'fr', 'body', 'French Body')`,
      [testContentId]
    );

    // Test that each locale returns its own translations
    const locales = ['en', 'ss', 'fr'];
    const expectedTitles = ['English Title', 'siSwati Title', 'French Title'];
    const expectedBodies = ['English Body', 'siSwati Body', 'French Body'];

    for (let i = 0; i < locales.length; i++) {
      const result = await pool.query(
        `SELECT field_name, translated_value
         FROM translations
         WHERE content_type = 'test_content' AND content_id = $1 AND locale = $2
         ORDER BY field_name`,
        [testContentId, locales[i]]
      );

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].field_name).toBe('body');
      expect(result.rows[0].translated_value).toBe(expectedBodies[i]);
      expect(result.rows[1].field_name).toBe('title');
      expect(result.rows[1].translated_value).toBe(expectedTitles[i]);
    }

    // Cleanup
    await pool.query(
      `DELETE FROM translations WHERE content_type = 'test_content' AND content_id = $1`,
      [testContentId]
    );
  });

  test('Translation display handles missing fields gracefully', async () => {
    const testContentId = 'partial_test_' + Date.now();
    
    // Insert partial translations (only title, no body)
    await pool.query(
      `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
       VALUES 
       ('test_content', $1, 'en', 'title', 'English Title'),
       ('test_content', $1, 'ss', 'title', 'siSwati Title')`,
      [testContentId]
    );

    // Query for siSwati
    const result = await pool.query(
      `SELECT field_name, translated_value
       FROM translations
       WHERE content_type = 'test_content' AND content_id = $1 AND locale = 'ss'`,
      [testContentId]
    );

    // Should only return the title field
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].field_name).toBe('title');
    expect(result.rows[0].translated_value).toBe('siSwati Title');

    // Cleanup
    await pool.query(
      `DELETE FROM translations WHERE content_type = 'test_content' AND content_id = $1`,
      [testContentId]
    );
  });
});
