import fc from 'fast-check';
import pool from '../src/config/database.js';

/**
 * Property-Based Test: Translation Association
 * Feature: eswatini-facts-platform, Property 20: Translation association
 * Validates: Requirements 6.5
 * 
 * For any translation added by an administrator, the translation should be 
 * correctly associated with the original content and retrievable by content ID and locale
 */

describe('Translation - Association', () => {
  // Clean up test data after tests
  afterAll(async () => {
    await pool.query(`DELETE FROM translations WHERE content_type = 'test_association'`);
    await pool.end();
  });

  test('Property 20: Translations are correctly associated with content and retrievable', () => {
    return fc.assert(
      fc.asyncProperty(
        // Generate content type and ID
        fc.constantFrom('blog_post', 'data_point', 'ui_element', 'page_content'),
        fc.uuid(),
        // Generate locale
        fc.constantFrom('en', 'ss', 'zu', 'fr', 'pt', 'es'),
        // Generate translations
        fc.array(
          fc.record({
            fieldName: fc.stringOf(fc.constantFrom('a', 'b', 'c', '_'), { minLength: 3, maxLength: 15 }),
            value: fc.string({ minLength: 5, maxLength: 100 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (contentType, contentId, locale, translations) => {
          // Create unique field names
          const uniqueTranslations = [];
          const seenFields = new Set();
          for (const trans of translations) {
            if (!seenFields.has(trans.fieldName)) {
              uniqueTranslations.push(trans);
              seenFields.add(trans.fieldName);
            }
          }

          if (uniqueTranslations.length === 0) return true;

          try {
            // Insert translations
            for (const trans of uniqueTranslations) {
              await pool.query(
                `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (content_type, content_id, locale, field_name) DO UPDATE
                 SET translated_value = $5`,
                ['test_association', contentId, locale, trans.fieldName, trans.value]
              );
            }

            // Property 1: Retrieve by content_type, content_id, and locale
            const result1 = await pool.query(
              `SELECT field_name, translated_value
               FROM translations
               WHERE content_type = $1 AND content_id = $2 AND locale = $3`,
              ['test_association', contentId, locale]
            );

            if (result1.rows.length !== uniqueTranslations.length) {
              return false;
            }

            // Property 2: All inserted translations should be retrievable with correct values
            const retrievedMap = new Map(result1.rows.map(r => [r.field_name, r.translated_value]));
            for (const trans of uniqueTranslations) {
              const retrieved = retrievedMap.get(trans.fieldName);
              if (retrieved !== trans.value) {
                return false;
              }
            }

            // Property 3: Retrieve by content_type and content_id (all locales)
            const result2 = await pool.query(
              `SELECT locale, field_name, translated_value
               FROM translations
               WHERE content_type = $1 AND content_id = $2`,
              ['test_association', contentId]
            );

            // Should include all our translations
            const localeSpecific = result2.rows.filter(r => r.locale === locale);
            if (localeSpecific.length !== uniqueTranslations.length) {
              return false;
            }

            // Property 4: Translations should not be retrievable with wrong content_id
            const wrongId = contentId.replace(/[0-9]/g, 'a'); // Modify the ID
            const result3 = await pool.query(
              `SELECT field_name, translated_value
               FROM translations
               WHERE content_type = $1 AND content_id = $2 AND locale = $3`,
              ['test_association', wrongId, locale]
            );

            // Should return no results for wrong content_id
            if (result3.rows.length > 0) {
              // Only fail if these are our test translations
              const hasOurTranslations = result3.rows.some(r => 
                uniqueTranslations.some(t => t.fieldName === r.field_name && t.value === r.translated_value)
              );
              if (hasOurTranslations) {
                return false;
              }
            }

            // Property 5: Translations should maintain association after update
            const updatedValue = `updated_${uniqueTranslations[0].value}`;
            await pool.query(
              `UPDATE translations 
               SET translated_value = $1
               WHERE content_type = $2 AND content_id = $3 AND locale = $4 AND field_name = $5`,
              [updatedValue, 'test_association', contentId, locale, uniqueTranslations[0].fieldName]
            );

            const result4 = await pool.query(
              `SELECT translated_value
               FROM translations
               WHERE content_type = $1 AND content_id = $2 AND locale = $3 AND field_name = $4`,
              ['test_association', contentId, locale, uniqueTranslations[0].fieldName]
            );

            if (result4.rows.length !== 1 || result4.rows[0].translated_value !== updatedValue) {
              return false;
            }

            // Cleanup
            await pool.query(
              `DELETE FROM translations WHERE content_type = 'test_association' AND content_id = $1`,
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

  test('Translation association maintains referential integrity', async () => {
    const testContentId = 'assoc_test_' + Date.now();
    
    // Insert translations for multiple locales
    await pool.query(
      `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
       VALUES 
       ('test_association', $1, 'en', 'title', 'English Title'),
       ('test_association', $1, 'en', 'body', 'English Body'),
       ('test_association', $1, 'ss', 'title', 'siSwati Title'),
       ('test_association', $1, 'ss', 'body', 'siSwati Body')`,
      [testContentId]
    );

    // Verify all translations are associated with the same content_id
    const result = await pool.query(
      `SELECT DISTINCT content_id, content_type
       FROM translations
       WHERE content_id = $1`,
      [testContentId]
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].content_id).toBe(testContentId);
    expect(result.rows[0].content_type).toBe('test_association');

    // Verify we can retrieve by content_id and locale
    const enResult = await pool.query(
      `SELECT field_name, translated_value
       FROM translations
       WHERE content_type = 'test_association' AND content_id = $1 AND locale = 'en'
       ORDER BY field_name`,
      [testContentId]
    );

    expect(enResult.rows).toHaveLength(2);
    expect(enResult.rows[0].field_name).toBe('body');
    expect(enResult.rows[1].field_name).toBe('title');

    // Cleanup
    await pool.query(
      `DELETE FROM translations WHERE content_type = 'test_association' AND content_id = $1`,
      [testContentId]
    );
  });

  test('Translation association supports multiple content types', async () => {
    const testContentId = 'multi_type_' + Date.now();
    
    // Insert translations for different content types with same content_id
    await pool.query(
      `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
       VALUES 
       ('blog_post', $1, 'en', 'title', 'Blog Post Title'),
       ('data_point', $1, 'en', 'title', 'Data Point Title'),
       ('ui_element', $1, 'en', 'title', 'UI Element Title')`,
      [testContentId]
    );

    // Verify each content type is separate
    const blogResult = await pool.query(
      `SELECT translated_value
       FROM translations
       WHERE content_type = 'blog_post' AND content_id = $1 AND locale = 'en' AND field_name = 'title'`,
      [testContentId]
    );

    const dataResult = await pool.query(
      `SELECT translated_value
       FROM translations
       WHERE content_type = 'data_point' AND content_id = $1 AND locale = 'en' AND field_name = 'title'`,
      [testContentId]
    );

    const uiResult = await pool.query(
      `SELECT translated_value
       FROM translations
       WHERE content_type = 'ui_element' AND content_id = $1 AND locale = 'en' AND field_name = 'title'`,
      [testContentId]
    );

    expect(blogResult.rows[0].translated_value).toBe('Blog Post Title');
    expect(dataResult.rows[0].translated_value).toBe('Data Point Title');
    expect(uiResult.rows[0].translated_value).toBe('UI Element Title');

    // Cleanup
    await pool.query(
      `DELETE FROM translations WHERE content_id = $1`,
      [testContentId]
    );
  });

  test('Translation association enforces uniqueness constraint', async () => {
    const testContentId = 'unique_test_' + Date.now();
    
    // Insert a translation
    await pool.query(
      `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
       VALUES ('test_association', $1, 'en', 'title', 'Original Title')`,
      [testContentId]
    );

    // Try to insert duplicate (should update instead due to ON CONFLICT)
    await pool.query(
      `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
       VALUES ('test_association', $1, 'en', 'title', 'Updated Title')
       ON CONFLICT (content_type, content_id, locale, field_name) DO UPDATE
       SET translated_value = EXCLUDED.translated_value`,
      [testContentId]
    );

    // Verify only one translation exists with updated value
    const result = await pool.query(
      `SELECT translated_value
       FROM translations
       WHERE content_type = 'test_association' AND content_id = $1 AND locale = 'en' AND field_name = 'title'`,
      [testContentId]
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].translated_value).toBe('Updated Title');

    // Cleanup
    await pool.query(
      `DELETE FROM translations WHERE content_type = 'test_association' AND content_id = $1`,
      [testContentId]
    );
  });
});
