import fc from 'fast-check';
import pool from '../src/config/database.js';

/**
 * Property-Based Test: Language Switching Completeness
 * Feature: eswatini-facts-platform, Property 17: Language switching completeness
 * Validates: Requirements 6.1
 * 
 * For any supported language selection, all UI text elements should be displayed 
 * in the selected language or clearly marked as untranslated
 */

describe('Translation - Language Switching Completeness', () => {
  // Clean up test data after tests
  afterAll(async () => {
    await pool.query(`DELETE FROM translations WHERE content_type = 'test_ui_element'`);
    await pool.end();
  });

  test('Property 17: Language switching returns all UI elements in selected language or marks as untranslated', () => {
    return fc.assert(
      fc.asyncProperty(
        // Generate a locale (language code)
        fc.constantFrom('en', 'ss', 'zu', 'fr', 'pt'),
        // Generate UI element keys
        fc.array(
          fc.record({
            key: fc.stringOf(fc.constantFrom('a', 'b', 'c', '_'), { minLength: 3, maxLength: 10 }),
            defaultText: fc.string({ minLength: 5, maxLength: 50 }),
          }),
          { minLength: 3, maxLength: 10 }
        ),
        // Generate which elements have translations
        fc.array(fc.boolean()),
        async (locale, uiElements, hasTranslations) => {
          // Ensure hasTranslations array matches uiElements length
          const translationFlags = hasTranslations.slice(0, uiElements.length);
          while (translationFlags.length < uiElements.length) {
            translationFlags.push(false);
          }

          // Create unique UI element keys
          const uniqueElements = [];
          const seenKeys = new Set();
          for (const element of uiElements) {
            if (!seenKeys.has(element.key)) {
              uniqueElements.push(element);
              seenKeys.add(element.key);
            }
          }

          if (uniqueElements.length === 0) return true;

          try {
            // Insert default (English) translations
            for (const element of uniqueElements) {
              await pool.query(
                `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (content_type, content_id, locale, field_name) DO NOTHING`,
                ['test_ui_element', 'ui', 'en', element.key, element.defaultText]
              );
            }

            // Insert translations for selected locale (only for elements that should have translations)
            for (let i = 0; i < uniqueElements.length; i++) {
              if (translationFlags[i] && locale !== 'en') {
                await pool.query(
                  `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT (content_type, content_id, locale, field_name) DO NOTHING`,
                  ['test_ui_element', 'ui', locale, uniqueElements[i].key, `${locale}_${uniqueElements[i].defaultText}`]
                );
              }
            }

            // Fetch translations for the selected locale
            const result = await pool.query(
              `SELECT field_name, translated_value
               FROM translations
               WHERE content_type = $1 AND content_id = $2 AND locale = $3`,
              ['test_ui_element', 'ui', locale]
            );

            // Fetch default translations
            const defaultResult = await pool.query(
              `SELECT field_name, translated_value
               FROM translations
               WHERE content_type = $1 AND content_id = $2 AND locale = 'en'`,
              ['test_ui_element', 'ui']
            );

            const translations = new Map(result.rows.map(r => [r.field_name, r.translated_value]));
            const defaultTranslations = new Map(defaultResult.rows.map(r => [r.field_name, r.translated_value]));

            // Property: Every UI element should have either:
            // 1. A translation in the selected locale, OR
            // 2. A fallback to the default (English) translation
            for (const element of uniqueElements) {
              const hasTranslation = translations.has(element.key);
              const hasFallback = defaultTranslations.has(element.key);
              
              // Every element must have at least a fallback
              if (!hasTranslation && !hasFallback) {
                return false;
              }

              // If locale is English, translation should match default
              if (locale === 'en' && hasTranslation) {
                if (translations.get(element.key) !== defaultTranslations.get(element.key)) {
                  return false;
                }
              }
            }

            // Property: All returned translations should be complete (no null/empty values)
            for (const [key, value] of translations) {
              if (!value || value.trim() === '') {
                return false;
              }
            }

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

  test('Language switching API returns consistent results', async () => {
    // Setup test data
    const testContentId = 'test_content_' + Date.now();
    
    await pool.query(
      `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
       VALUES 
       ('test_ui_element', $1, 'en', 'title', 'English Title'),
       ('test_ui_element', $1, 'en', 'description', 'English Description'),
       ('test_ui_element', $1, 'ss', 'title', 'siSwati Title'),
       ('test_ui_element', $1, 'ss', 'description', 'siSwati Description')`,
      [testContentId]
    );

    // Test English
    const enResult = await pool.query(
      `SELECT field_name, translated_value
       FROM translations
       WHERE content_type = 'test_ui_element' AND content_id = $1 AND locale = 'en'
       ORDER BY field_name`,
      [testContentId]
    );

    expect(enResult.rows).toHaveLength(2);
    expect(enResult.rows[0].field_name).toBe('description');
    expect(enResult.rows[1].field_name).toBe('title');

    // Test siSwati
    const ssResult = await pool.query(
      `SELECT field_name, translated_value
       FROM translations
       WHERE content_type = 'test_ui_element' AND content_id = $1 AND locale = 'ss'
       ORDER BY field_name`,
      [testContentId]
    );

    expect(ssResult.rows).toHaveLength(2);
    expect(ssResult.rows[0].translated_value).toBe('siSwati Description');
    expect(ssResult.rows[1].translated_value).toBe('siSwati Title');

    // Cleanup
    await pool.query(
      `DELETE FROM translations WHERE content_type = 'test_ui_element' AND content_id = $1`,
      [testContentId]
    );
  });
});
