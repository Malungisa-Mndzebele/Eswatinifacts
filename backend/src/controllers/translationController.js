import pool from '../config/database.js';

/**
 * Translation Controller
 * Handles multi-language support for content
 */

/**
 * Get translations for specific content
 * GET /api/v1/translations/:contentType/:contentId
 */
export const getTranslations = async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const { locale } = req.query;

    let query = `
      SELECT id, content_type, content_id, locale, field_name, translated_value, created_at, updated_at
      FROM translations
      WHERE content_type = $1 AND content_id = $2
    `;
    const params = [contentType, contentId];

    // Filter by locale if provided
    if (locale) {
      query += ` AND locale = $3`;
      params.push(locale);
    }

    query += ` ORDER BY locale, field_name`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      metadata: {
        count: result.rows.length,
        contentType,
        contentId,
        locale: locale || 'all',
      },
    });
  } catch (error) {
    console.error('Error fetching translations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSLATION_FETCH_ERROR',
        message: 'Failed to fetch translations',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Get content with translations (fallback to default language)
 * GET /api/v1/translations/content/:contentType/:contentId
 */
export const getContentWithTranslations = async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const locale = req.query.locale || req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';

    // Fetch translations for the requested locale
    const translationsResult = await pool.query(
      `SELECT field_name, translated_value
       FROM translations
       WHERE content_type = $1 AND content_id = $2 AND locale = $3`,
      [contentType, contentId, locale]
    );

    // Fetch default (English) translations as fallback
    const defaultTranslationsResult = await pool.query(
      `SELECT field_name, translated_value
       FROM translations
       WHERE content_type = $1 AND content_id = $2 AND locale = 'en'`,
      [contentType, contentId]
    );

    // Build translation map
    const translations = {};
    const defaultTranslations = {};
    const usedFallback = [];

    // Store default translations
    defaultTranslationsResult.rows.forEach(row => {
      defaultTranslations[row.field_name] = row.translated_value;
    });

    // Store requested locale translations
    translationsResult.rows.forEach(row => {
      translations[row.field_name] = row.translated_value;
    });

    // Apply fallback for missing translations
    Object.keys(defaultTranslations).forEach(fieldName => {
      if (!translations[fieldName]) {
        translations[fieldName] = defaultTranslations[fieldName];
        usedFallback.push(fieldName);
      }
    });

    res.json({
      success: true,
      data: {
        contentType,
        contentId,
        locale,
        translations,
        fallbackUsed: usedFallback.length > 0,
        fallbackFields: usedFallback,
      },
    });
  } catch (error) {
    console.error('Error fetching content with translations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_TRANSLATION_ERROR',
        message: 'Failed to fetch content with translations',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Create or update translation
 * POST /api/v1/translations
 * Requires admin role
 */
export const createOrUpdateTranslation = async (req, res) => {
  try {
    const { contentType, contentId, locale, fieldName, translatedValue } = req.body;

    // Validation
    if (!contentType || !contentId || !locale || !fieldName || !translatedValue) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: contentType, contentId, locale, fieldName, translatedValue',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Validate locale format (e.g., 'en', 'ss', 'en-US')
    if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_LOCALE',
          message: 'Invalid locale format. Expected format: "en" or "en-US"',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Insert or update translation
    const result = await pool.query(
      `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (content_type, content_id, locale, field_name)
       DO UPDATE SET translated_value = $5, updated_at = NOW()
       RETURNING *`,
      [contentType, contentId, locale, fieldName, translatedValue]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Translation saved successfully',
    });
  } catch (error) {
    console.error('Error creating/updating translation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSLATION_SAVE_ERROR',
        message: 'Failed to save translation',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Delete translation
 * DELETE /api/v1/translations/:id
 * Requires admin role
 */
export const deleteTranslation = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM translations WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TRANSLATION_NOT_FOUND',
          message: 'Translation not found',
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      message: 'Translation deleted successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error deleting translation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRANSLATION_DELETE_ERROR',
        message: 'Failed to delete translation',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Get available locales
 * GET /api/v1/translations/locales
 */
export const getAvailableLocales = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT locale, COUNT(*) as translation_count
       FROM translations
       GROUP BY locale
       ORDER BY locale`
    );

    res.json({
      success: true,
      data: result.rows,
      metadata: {
        count: result.rows.length,
      },
    });
  } catch (error) {
    console.error('Error fetching available locales:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOCALES_FETCH_ERROR',
        message: 'Failed to fetch available locales',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Detect user's preferred language from browser headers
 * GET /api/v1/translations/detect-language
 */
export const detectLanguage = async (req, res) => {
  try {
    const acceptLanguage = req.headers['accept-language'];
    
    if (!acceptLanguage) {
      return res.json({
        success: true,
        data: {
          detectedLocale: 'en',
          source: 'default',
        },
      });
    }

    // Parse Accept-Language header
    // Format: "en-US,en;q=0.9,ss;q=0.8"
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const parts = lang.trim().split(';');
        const locale = parts[0].split('-')[0]; // Get primary language code
        const quality = parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0;
        return { locale, quality };
      })
      .sort((a, b) => b.quality - a.quality);

    // Get available locales from database
    const availableResult = await pool.query(
      'SELECT DISTINCT locale FROM translations'
    );
    const availableLocales = availableResult.rows.map(row => row.locale);

    // Find first matching locale
    let detectedLocale = 'en';
    let source = 'default';

    for (const lang of languages) {
      if (availableLocales.includes(lang.locale)) {
        detectedLocale = lang.locale;
        source = 'browser';
        break;
      }
    }

    res.json({
      success: true,
      data: {
        detectedLocale,
        source,
        availableLocales,
        browserLanguages: languages.map(l => l.locale),
      },
    });
  } catch (error) {
    console.error('Error detecting language:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LANGUAGE_DETECTION_ERROR',
        message: 'Failed to detect language',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Bulk create translations
 * POST /api/v1/translations/bulk
 * Requires admin role
 */
export const bulkCreateTranslations = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { translations } = req.body;

    if (!Array.isArray(translations) || translations.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'translations must be a non-empty array',
          timestamp: new Date().toISOString(),
        },
      });
    }

    await client.query('BEGIN');

    const results = [];
    for (const translation of translations) {
      const { contentType, contentId, locale, fieldName, translatedValue } = translation;

      if (!contentType || !contentId || !locale || !fieldName || !translatedValue) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Each translation must have contentType, contentId, locale, fieldName, and translatedValue',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const result = await client.query(
        `INSERT INTO translations (content_type, content_id, locale, field_name, translated_value)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (content_type, content_id, locale, field_name)
         DO UPDATE SET translated_value = $5, updated_at = NOW()
         RETURNING *`,
        [contentType, contentId, locale, fieldName, translatedValue]
      );

      results.push(result.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: results,
      message: `${results.length} translations saved successfully`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error bulk creating translations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BULK_TRANSLATION_ERROR',
        message: 'Failed to save translations',
        timestamp: new Date().toISOString(),
      },
    });
  } finally {
    client.release();
  }
};
