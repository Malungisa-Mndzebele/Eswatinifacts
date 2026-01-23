import { query, validationResult } from 'express-validator';
import { pool } from '../config/database.js';
import { highlightKeywords, extractSnippet } from '../utils/searchHelpers.js';

/**
 * Validation rules for search query
 */
export const searchValidation = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Search query must be between 1 and 500 characters'),
  query('categories')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return true;
      }
      if (Array.isArray(value)) {
        return value.every((cat) => typeof cat === 'string');
      }
      return false;
    })
    .withMessage('Categories must be a string or array of strings'),
  query('sort')
    .optional()
    .isIn(['relevance', 'date', 'title'])
    .withMessage('Sort must be one of: relevance, date, title'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

/**
 * Get search suggestions for no results
 */
async function getSearchSuggestions(searchQuery) {
  try {
    // Get popular categories
    const categoriesResult = await pool.query(
      `SELECT DISTINCT category 
       FROM search_index 
       WHERE category IS NOT NULL 
       ORDER BY category 
       LIMIT 5`
    );

    const suggestions = {
      message: 'No results found. Try these suggestions:',
      categories: categoriesResult.rows.map((row) => row.category),
      tips: [
        'Try different keywords',
        'Check your spelling',
        'Use more general terms',
        'Browse by category',
      ],
    };

    // Try to find similar terms using trigram similarity if available
    if (searchQuery && searchQuery.length >= 3) {
      const similarResult = await pool.query(
        `SELECT DISTINCT title
         FROM search_index
         WHERE title ILIKE $1
         LIMIT 3`,
        [`%${searchQuery.substring(0, Math.floor(searchQuery.length / 2))}%`]
      );

      if (similarResult.rows.length > 0) {
        suggestions.relatedTopics = similarResult.rows.map((row) => row.title);
      }
    }

    return suggestions;
  } catch (error) {
    console.error('Get suggestions error:', error);
    return {
      message: 'No results found. Try different keywords or browse by category.',
      tips: ['Try different keywords', 'Check your spelling', 'Use more general terms'],
    };
  }
}

/**
 * Search across all content
 */
export async function search(req, res) {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid search parameters',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        },
      });
    }

    const {
      q: searchQuery = '',
      categories,
      sort = 'relevance',
      page = 1,
      limit = 10,
    } = req.query;

    // Parse categories
    let categoryFilter = [];
    if (categories) {
      categoryFilter = Array.isArray(categories) ? categories : [categories];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause
    const conditions = [];
    const values = [];
    let paramCount = 1;

    // Full-text search if query provided
    if (searchQuery && searchQuery.trim()) {
      const tsQuery = searchQuery
        .trim()
        .split(/\s+/)
        .map((word) => `${word}:*`)
        .join(' & ');
      
      conditions.push(`search_vector @@ to_tsquery('english', $${paramCount})`);
      values.push(tsQuery);
      paramCount++;
    }

    // Category filter
    if (categoryFilter.length > 0) {
      conditions.push(`category = ANY($${paramCount})`);
      values.push(categoryFilter);
      paramCount++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    let orderByClause;
    if (sort === 'relevance' && searchQuery && searchQuery.trim()) {
      const tsQuery = searchQuery
        .trim()
        .split(/\s+/)
        .map((word) => `${word}:*`)
        .join(' & ');
      orderByClause = `ORDER BY ts_rank(search_vector, to_tsquery('english', '${tsQuery}')) DESC, created_at DESC`;
    } else if (sort === 'date') {
      orderByClause = 'ORDER BY created_at DESC';
    } else if (sort === 'title') {
      orderByClause = 'ORDER BY title ASC';
    } else {
      orderByClause = 'ORDER BY created_at DESC';
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM search_index ${whereClause}`,
      values
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // If no results, return suggestions
    if (totalCount === 0) {
      const suggestions = await getSearchSuggestions(searchQuery);
      return res.json({
        success: true,
        data: {
          results: [],
          suggestions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            totalCount: 0,
            totalPages: 0,
          },
        },
      });
    }

    // Get results
    values.push(parseInt(limit));
    values.push(offset);

    const result = await pool.query(
      `SELECT id, content_type, content_id, title, content, category, url, created_at
       FROM search_index
       ${whereClause}
       ${orderByClause}
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values
    );

    // Extract keywords from search query
    const keywords = searchQuery
      ? searchQuery
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 2)
      : [];

    // Format results with highlighting
    const results = result.rows.map((row) => {
      const snippet = extractSnippet(row.content, keywords);
      const highlightedSnippet = highlightKeywords(snippet, keywords);
      const highlightedTitle = highlightKeywords(row.title, keywords);

      return {
        id: row.id,
        contentType: row.content_type,
        contentId: row.content_id,
        title: row.title,
        highlightedTitle,
        snippet: highlightedSnippet,
        category: row.category,
        url: row.url,
        createdAt: row.created_at,
      };
    });

    res.json({
      success: true,
      data: {
        results,
        query: searchQuery,
        filters: {
          categories: categoryFilter,
          sort,
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Search failed',
        timestamp: new Date().toISOString(),
      },
    });
  }
}
