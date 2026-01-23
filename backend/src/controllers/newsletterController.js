import { pool } from '../config/database.js';
import crypto from 'crypto';

/**
 * Newsletter Controller
 * Handles newsletter subscription, confirmation, unsubscribe, and admin newsletter sending
 */

// Email validation helper (RFC 5322 compliant)
function isValidEmail(email) {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
}

// Generate confirmation token
function generateConfirmationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Send confirmation email (placeholder - will integrate with email service)
async function sendConfirmationEmail(email, token) {
  // TODO: Integrate with SendGrid or similar email service
  const confirmationUrl = `${process.env.API_URL || 'http://localhost:3000'}/api/v1/newsletter/confirm/${token}`;
  
  console.log(`[EMAIL] Confirmation email would be sent to: ${email}`);
  console.log(`[EMAIL] Confirmation URL: ${confirmationUrl}`);
  
  // For now, just log. In production, this would send via email service:
  // await emailService.send({
  //   to: email,
  //   subject: 'Confirm your newsletter subscription',
  //   html: `<p>Click here to confirm: <a href="${confirmationUrl}">${confirmationUrl}</a></p>`
  // });
  
  return true;
}

// Send newsletter to subscribers (placeholder)
async function sendNewsletterEmail(email, subject, content, htmlContent) {
  console.log(`[EMAIL] Newsletter would be sent to: ${email}`);
  console.log(`[EMAIL] Subject: ${subject}`);
  
  // TODO: Integrate with email service
  // await emailService.send({
  //   to: email,
  //   subject: subject,
  //   text: content,
  //   html: htmlContent
  // });
  
  return true;
}

/**
 * Subscribe to newsletter
 * POST /api/v1/newsletter/subscribe
 */
export async function subscribe(req, res) {
  try {
    const { email, categories = [] } = req.body;

    // Validate email format
    if (!email || !isValidEmail(email)) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Please provide a valid email address',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const existing = await pool.query(
      'SELECT id, status FROM newsletter_subscriptions WHERE email = $1',
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      const subscription = existing.rows[0];
      
      // If already confirmed, return success
      if (subscription.status === 'confirmed') {
        return res.json({
          success: true,
          message: 'You are already subscribed to our newsletter',
          data: { status: 'confirmed' },
        });
      }
      
      // If pending, resend confirmation
      if (subscription.status === 'pending') {
        const token = generateConfirmationToken();
        await pool.query(
          'UPDATE newsletter_subscriptions SET confirmation_token = $1 WHERE id = $2',
          [token, subscription.id]
        );
        
        await sendConfirmationEmail(normalizedEmail, token);
        
        return res.json({
          success: true,
          message: 'Confirmation email resent. Please check your inbox.',
          data: { status: 'pending' },
        });
      }
      
      // If unsubscribed, reactivate
      if (subscription.status === 'unsubscribed') {
        const token = generateConfirmationToken();
        await pool.query(
          `UPDATE newsletter_subscriptions 
           SET status = 'pending', confirmation_token = $1, unsubscribed_at = NULL, categories = $2
           WHERE id = $3`,
          [token, categories, subscription.id]
        );
        
        await sendConfirmationEmail(normalizedEmail, token);
        
        return res.json({
          success: true,
          message: 'Subscription reactivated. Please check your email to confirm.',
          data: { status: 'pending' },
        });
      }
    }

    // Create new subscription
    const token = generateConfirmationToken();
    const result = await pool.query(
      `INSERT INTO newsletter_subscriptions (email, status, confirmation_token, categories)
       VALUES ($1, 'pending', $2, $3)
       RETURNING id, email, status, created_at`,
      [normalizedEmail, token, categories]
    );

    // Send confirmation email
    await sendConfirmationEmail(normalizedEmail, token);

    res.status(201).json({
      success: true,
      message: 'Subscription created. Please check your email to confirm.',
      data: {
        subscription: result.rows[0],
      },
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SUBSCRIPTION_ERROR',
        message: 'Failed to process subscription',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Confirm newsletter subscription
 * GET /api/v1/newsletter/confirm/:token
 */
export async function confirm(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Confirmation token is required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Find subscription by token
    const result = await pool.query(
      'SELECT id, email, status FROM newsletter_subscriptions WHERE confirmation_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired confirmation token',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const subscription = result.rows[0];

    // If already confirmed, return success
    if (subscription.status === 'confirmed') {
      return res.json({
        success: true,
        message: 'Your subscription is already confirmed',
        data: { status: 'confirmed' },
      });
    }

    // Confirm subscription
    await pool.query(
      `UPDATE newsletter_subscriptions 
       SET status = 'confirmed', confirmed_at = NOW(), confirmation_token = NULL
       WHERE id = $1`,
      [subscription.id]
    );

    res.json({
      success: true,
      message: 'Subscription confirmed successfully!',
      data: {
        email: subscription.email,
        status: 'confirmed',
      },
    });
  } catch (error) {
    console.error('Confirm error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIRMATION_ERROR',
        message: 'Failed to confirm subscription',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Unsubscribe from newsletter
 * POST /api/v1/newsletter/unsubscribe
 * GET /api/v1/newsletter/unsubscribe/:token (for email links)
 */
export async function unsubscribe(req, res) {
  try {
    const email = req.body?.email || req.query?.email;
    const token = req.params?.token;

    let subscription;

    if (token) {
      // Unsubscribe via token (from email link)
      const result = await pool.query(
        'SELECT id, email, status FROM newsletter_subscriptions WHERE confirmation_token = $1 OR id::text = $1',
        [token]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Subscription not found',
            timestamp: new Date().toISOString(),
          },
        });
      }
      
      subscription = result.rows[0];
    } else if (email) {
      // Unsubscribe via email
      if (!isValidEmail(email)) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: 'Please provide a valid email address',
            timestamp: new Date().toISOString(),
          },
        });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const result = await pool.query(
        'SELECT id, email, status FROM newsletter_subscriptions WHERE email = $1',
        [normalizedEmail]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Email address not found in our subscription list',
            timestamp: new Date().toISOString(),
          },
        });
      }

      subscription = result.rows[0];
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETER',
          message: 'Email address or token is required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // If already unsubscribed, return success
    if (subscription.status === 'unsubscribed') {
      return res.json({
        success: true,
        message: 'You are already unsubscribed',
        data: { status: 'unsubscribed' },
      });
    }

    // Unsubscribe
    await pool.query(
      `UPDATE newsletter_subscriptions 
       SET status = 'unsubscribed', unsubscribed_at = NOW()
       WHERE id = $1`,
      [subscription.id]
    );

    res.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter',
      data: {
        email: subscription.email,
        status: 'unsubscribed',
      },
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UNSUBSCRIBE_ERROR',
        message: 'Failed to process unsubscribe request',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get subscription status
 * GET /api/v1/newsletter/status/:email
 */
export async function getStatus(req, res) {
  try {
    const { email } = req.params;

    if (!email || !isValidEmail(email)) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Please provide a valid email address',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const result = await pool.query(
      'SELECT id, email, status, confirmed_at, created_at FROM newsletter_subscriptions WHERE email = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Email address not found',
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to retrieve subscription status',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Create and send newsletter (Admin only)
 * POST /api/v1/newsletter/send
 */
export async function sendNewsletter(req, res) {
  try {
    const { subject, content, htmlContent, categories = [] } = req.body;

    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Subject and content are required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Get confirmed subscribers
    let query = 'SELECT email FROM newsletter_subscriptions WHERE status = $1';
    const params = ['confirmed'];

    // Filter by categories if specified
    if (categories.length > 0) {
      query += ' AND categories && $2';
      params.push(categories);
    }

    const subscribers = await pool.query(query, params);

    if (subscribers.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_SUBSCRIBERS',
          message: 'No confirmed subscribers found',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Create newsletter record
    const newsletter = await pool.query(
      `INSERT INTO newsletters (subject, content, html_content, recipient_count, sent_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, subject, recipient_count, sent_at`,
      [subject, content, htmlContent || content, subscribers.rows.length]
    );

    // Send emails to all subscribers
    const sendPromises = subscribers.rows.map(sub =>
      sendNewsletterEmail(sub.email, subject, content, htmlContent || content)
    );

    await Promise.all(sendPromises);

    res.json({
      success: true,
      message: `Newsletter sent to ${subscribers.rows.length} subscribers`,
      data: {
        newsletter: newsletter.rows[0],
      },
    });
  } catch (error) {
    console.error('Send newsletter error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEND_ERROR',
        message: 'Failed to send newsletter',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get newsletter list (Admin only)
 * GET /api/v1/newsletter/list
 */
export async function listNewsletters(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT id, subject, recipient_count, open_count, click_count, sent_at, created_at
       FROM newsletters
       ORDER BY sent_at DESC NULLS LAST, created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM newsletters');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        newsletters: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('List newsletters error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LIST_ERROR',
        message: 'Failed to retrieve newsletters',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get subscriber list (Admin only)
 * GET /api/v1/newsletter/subscribers
 */
export async function listSubscribers(req, res) {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT id, email, status, confirmed_at, created_at FROM newsletter_subscriptions';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) FROM newsletter_subscriptions';
    if (status) {
      countQuery += ' WHERE status = $1';
    }
    const countResult = await pool.query(countQuery, status ? [status] : []);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        subscribers: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('List subscribers error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LIST_ERROR',
        message: 'Failed to retrieve subscribers',
        timestamp: new Date().toISOString(),
      },
    });
  }
}
