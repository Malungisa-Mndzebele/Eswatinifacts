import { body, validationResult } from 'express-validator';
import { pool } from '../config/database.js';

/**
 * Generate URL-safe slug from title
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Ensure slug is unique by appending number if needed
 */
async function ensureUniqueSlug(slug, excludeId = null) {
  let uniqueSlug = slug;
  let counter = 1;
  
  while (true) {
    const query = excludeId
      ? 'SELECT id FROM blog_posts WHERE slug = $1 AND id != $2'
      : 'SELECT id FROM blog_posts WHERE slug = $1';
    
    const params = excludeId ? [uniqueSlug, excludeId] : [uniqueSlug];
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return uniqueSlug;
    }
    
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
}

/**
 * Validation rules for creating a post
 */
export const createPostValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Title must be between 1 and 500 characters'),
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Content is required'),
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Excerpt must not exceed 1000 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must not exceed 100 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('featuredImage')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Featured image URL must not exceed 500 characters'),
  body('status')
    .optional()
    .isIn(['draft', 'scheduled', 'published'])
    .withMessage('Status must be draft, scheduled, or published'),
  body('publishedAt')
    .optional()
    .isISO8601()
    .withMessage('Published date must be a valid ISO 8601 date'),
];

/**
 * Validation rules for updating a post
 */
export const updatePostValidation = createPostValidation;

/**
 * Create a new blog post
 */
export async function createPost(req, res) {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        },
      });
    }

    const {
      title,
      content,
      excerpt,
      category,
      tags,
      featuredImage,
      status = 'draft',
      publishedAt,
    } = req.body;

    // Generate unique slug
    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueSlug(baseSlug);

    // Insert post
    const result = await pool.query(
      `INSERT INTO blog_posts 
       (title, slug, content, excerpt, author_id, category, tags, featured_image, status, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, title, slug, content, excerpt, author_id, category, tags, featured_image, status, published_at, created_at, updated_at`,
      [
        title,
        slug,
        content,
        excerpt || null,
        req.user.id,
        category || null,
        tags || [],
        featuredImage || null,
        status,
        publishedAt || null,
      ]
    );

    const post = result.rows[0];

    // If published, update search index
    if (status === 'published') {
      await updateSearchIndex(post);
    }

    res.status(201).json({
      success: true,
      data: {
        post: {
          id: post.id,
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          authorId: post.author_id,
          category: post.category,
          tags: post.tags,
          featuredImage: post.featured_image,
          status: post.status,
          publishedAt: post.published_at,
          createdAt: post.created_at,
          updatedAt: post.updated_at,
        },
      },
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create post',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Update an existing blog post
 */
export async function updatePost(req, res) {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { id } = req.params;
    const {
      title,
      content,
      excerpt,
      category,
      tags,
      featuredImage,
      status,
      publishedAt,
    } = req.body;

    // Check if post exists and user has permission
    const existingPost = await pool.query(
      'SELECT author_id, slug FROM blog_posts WHERE id = $1',
      [id]
    );

    if (existingPost.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Blog post not found',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check authorization (only author or admin can update)
    if (
      existingPost.rows[0].author_id !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this post',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Generate new slug if title changed
    let slug = existingPost.rows[0].slug;
    if (title) {
      const baseSlug = generateSlug(title);
      slug = await ensureUniqueSlug(baseSlug, id);
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
      updates.push(`slug = $${paramCount}`);
      values.push(slug);
      paramCount++;
    }
    if (content !== undefined) {
      updates.push(`content = $${paramCount}`);
      values.push(content);
      paramCount++;
    }
    if (excerpt !== undefined) {
      updates.push(`excerpt = $${paramCount}`);
      values.push(excerpt);
      paramCount++;
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount}`);
      values.push(category);
      paramCount++;
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramCount}`);
      values.push(tags);
      paramCount++;
    }
    if (featuredImage !== undefined) {
      updates.push(`featured_image = $${paramCount}`);
      values.push(featuredImage);
      paramCount++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }
    if (publishedAt !== undefined) {
      updates.push(`published_at = $${paramCount}`);
      values.push(publishedAt);
      paramCount++;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE blog_posts 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, title, slug, content, excerpt, author_id, category, tags, featured_image, status, published_at, created_at, updated_at`,
      values
    );

    const post = result.rows[0];

    // Update search index if published
    if (post.status === 'published') {
      await updateSearchIndex(post);
    } else {
      // Remove from search index if unpublished
      await removeFromSearchIndex(post.id);
    }

    res.json({
      success: true,
      data: {
        post: {
          id: post.id,
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          authorId: post.author_id,
          category: post.category,
          tags: post.tags,
          featuredImage: post.featured_image,
          status: post.status,
          publishedAt: post.published_at,
          createdAt: post.created_at,
          updatedAt: post.updated_at,
        },
      },
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update post',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Publish a blog post
 */
export async function publishPost(req, res) {
  try {
    const { id } = req.params;

    // Check if post exists and user has permission
    const existingPost = await pool.query(
      'SELECT author_id, status FROM blog_posts WHERE id = $1',
      [id]
    );

    if (existingPost.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Blog post not found',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check authorization
    if (
      existingPost.rows[0].author_id !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to publish this post',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Update status to published
    const result = await pool.query(
      `UPDATE blog_posts 
       SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, slug, content, excerpt, author_id, category, tags, featured_image, status, published_at, created_at, updated_at`,
      [id]
    );

    const post = result.rows[0];

    // Update search index
    await updateSearchIndex(post);

    res.json({
      success: true,
      data: {
        post: {
          id: post.id,
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          authorId: post.author_id,
          category: post.category,
          tags: post.tags,
          featuredImage: post.featured_image,
          status: post.status,
          publishedAt: post.published_at,
          createdAt: post.created_at,
          updatedAt: post.updated_at,
        },
      },
    });
  } catch (error) {
    console.error('Publish post error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to publish post',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get blog posts with pagination and filtering
 */
export async function getPosts(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      authorId,
      includeUnpublished = false,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause
    const conditions = [];
    const values = [];
    let paramCount = 1;

    // Only show published posts to non-authenticated users
    if (!includeUnpublished || !req.user || req.user.role !== 'admin') {
      conditions.push(`status = 'published'`);
    } else if (status) {
      conditions.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (category) {
      conditions.push(`category = $${paramCount}`);
      values.push(category);
      paramCount++;
    }

    if (authorId) {
      conditions.push(`author_id = $${paramCount}`);
      values.push(authorId);
      paramCount++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM blog_posts ${whereClause}`,
      values
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get posts
    values.push(parseInt(limit));
    values.push(offset);

    const result = await pool.query(
      `SELECT id, title, slug, content, excerpt, author_id, category, tags, featured_image, status, published_at, created_at, updated_at
       FROM blog_posts
       ${whereClause}
       ORDER BY published_at DESC NULLS LAST, created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values
    );

    const posts = result.rows.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      authorId: post.author_id,
      category: post.category,
      tags: post.tags,
      featuredImage: post.featured_image,
      status: post.status,
      publishedAt: post.published_at,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
    }));

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get posts',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get a single blog post by ID or slug
 */
export async function getPost(req, res) {
  try {
    const { identifier } = req.params;

    // Try to find by ID first, then by slug
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier
      );

    const query = isUUID
      ? 'SELECT * FROM blog_posts WHERE id = $1'
      : 'SELECT * FROM blog_posts WHERE slug = $1';

    const result = await pool.query(query, [identifier]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Blog post not found',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const post = result.rows[0];

    // Only allow viewing unpublished posts if user is author or admin
    if (post.status !== 'published') {
      if (
        !req.user ||
        (post.author_id !== req.user.id && req.user.role !== 'admin')
      ) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Blog post not found',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    res.json({
      success: true,
      data: {
        post: {
          id: post.id,
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          authorId: post.author_id,
          category: post.category,
          tags: post.tags,
          featuredImage: post.featured_image,
          status: post.status,
          publishedAt: post.published_at,
          createdAt: post.created_at,
          updatedAt: post.updated_at,
        },
      },
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get post',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Delete a blog post
 */
export async function deletePost(req, res) {
  try {
    const { id } = req.params;

    // Check if post exists and user has permission
    const existingPost = await pool.query(
      'SELECT author_id FROM blog_posts WHERE id = $1',
      [id]
    );

    if (existingPost.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Blog post not found',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Check authorization
    if (
      existingPost.rows[0].author_id !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this post',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Delete post
    await pool.query('DELETE FROM blog_posts WHERE id = $1', [id]);

    // Remove from search index
    await removeFromSearchIndex(id);

    res.json({
      success: true,
      data: {
        message: 'Post deleted successfully',
      },
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete post',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Update search index for a blog post
 */
async function updateSearchIndex(post) {
  try {
    // Create search vector from title and content
    await pool.query(
      `INSERT INTO search_index (content_type, content_id, title, content, category, url, search_vector)
       VALUES ($1, $2, $3, $4, $5, $6, to_tsvector('english', $3 || ' ' || $4))
       ON CONFLICT (content_type, content_id)
       DO UPDATE SET
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         category = EXCLUDED.category,
         url = EXCLUDED.url,
         search_vector = EXCLUDED.search_vector,
         updated_at = NOW()`,
      [
        'blog_post',
        post.id,
        post.title,
        post.content,
        post.category,
        `/blog/${post.slug}`,
      ]
    );
  } catch (error) {
    console.error('Update search index error:', error);
    // Don't throw - search index update failure shouldn't fail the main operation
  }
}

/**
 * Remove blog post from search index
 */
async function removeFromSearchIndex(postId) {
  try {
    await pool.query(
      `DELETE FROM search_index WHERE content_type = 'blog_post' AND content_id = $1`,
      [postId]
    );
  } catch (error) {
    console.error('Remove from search index error:', error);
    // Don't throw - search index removal failure shouldn't fail the main operation
  }
}

export { generateSlug, ensureUniqueSlug };
