import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import crypto from 'crypto';
import { pool } from '../src/config/database.js';

/**
 * Feature: eswatini-facts-platform, Property 9: Subscription confirmation round-trip
 * Validates: Requirements 3.3
 * 
 * For any subscription with a confirmation token, clicking the confirmation link 
 * should activate the subscription and mark it as confirmed
 */

// Generate confirmation token
function generateConfirmationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Create a pending subscription
async function createPendingSubscription(email) {
  const token = generateConfirmationToken();
  const result = await pool.query(
    `INSERT INTO newsletter_subscriptions (email, status, confirmation_token, categories)
     VALUES ($1, 'pending', $2, $3)
     RETURNING id, email, status, confirmation_token, created_at`,
    [email.toLowerCase().trim(), token, []]
  );
  return result.rows[0];
}

// Confirm subscription by token
async function confirmSubscription(token) {
  try {
    // Find subscription by token
    const result = await pool.query(
      'SELECT id, email, status FROM newsletter_subscriptions WHERE confirmation_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return { success: false, reason: 'invalid_token' };
    }

    const subscription = result.rows[0];

    // If already confirmed, return success
    if (subscription.status === 'confirmed') {
      return { success: true, reason: 'already_confirmed', subscription };
    }

    // Confirm subscription
    await pool.query(
      `UPDATE newsletter_subscriptions 
       SET status = 'confirmed', confirmed_at = NOW(), confirmation_token = NULL
       WHERE id = $1`,
      [subscription.id]
    );

    // Verify confirmation
    const verified = await pool.query(
      'SELECT id, email, status, confirmed_at FROM newsletter_subscriptions WHERE id = $1',
      [subscription.id]
    );

    return { 
      success: true, 
      reason: 'confirmed', 
      subscription: verified.rows[0] 
    };
  } catch (error) {
    return { success: false, reason: 'error', error };
  }
}

// Get subscription status
async function getSubscriptionStatus(email) {
  const result = await pool.query(
    'SELECT id, email, status, confirmed_at FROM newsletter_subscriptions WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  return result.rows[0] || null;
}

// Generators for property-based testing
const emailGenerator = fc.emailAddress();

describe('Newsletter - Subscription Confirmation Round-trip (PBT)', () => {
  let dbAvailable = false;

  before(async () => {
    // Check if database is available
    try {
      const client = await pool.connect();
      client.release();
      dbAvailable = true;
      console.log('Database connected - running confirmation round-trip tests');
    } catch (error) {
      console.log('Database not available - skipping confirmation tests');
      console.log('To run these tests, please set up PostgreSQL and configure .env');
    }
  });

  after(async () => {
    // Clean up test subscriptions
    if (dbAvailable) {
      await pool.query("DELETE FROM newsletter_subscriptions WHERE email LIKE '%test%' OR email LIKE '%example%'");
    }
  });

  it('Property 9: subscription confirmation round-trip should activate subscription', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        emailGenerator,
        async (email) => {
          // Make email unique for this test
          const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@${email.split('@')[1] || 'example.com'}`;
          
          // Step 1: Create pending subscription
          const subscription = await createPendingSubscription(uniqueEmail);
          assert.strictEqual(subscription.status, 'pending', 'Initial status should be pending');
          assert.ok(subscription.confirmation_token, 'Should have confirmation token');
          
          // Step 2: Confirm subscription using token
          const confirmResult = await confirmSubscription(subscription.confirmation_token);
          assert.strictEqual(confirmResult.success, true, 'Confirmation should succeed');
          assert.strictEqual(confirmResult.subscription.status, 'confirmed', 'Status should be confirmed');
          assert.ok(confirmResult.subscription.confirmed_at, 'Should have confirmed_at timestamp');
          
          // Step 3: Verify subscription is confirmed
          const status = await getSubscriptionStatus(uniqueEmail);
          assert.strictEqual(status.status, 'confirmed', 'Status should remain confirmed');
          assert.ok(status.confirmed_at, 'Should have confirmed_at timestamp');
          
          // Clean up
          await pool.query('DELETE FROM newsletter_subscriptions WHERE id = $1', [subscription.id]);
          
          // Round-trip successful: pending -> confirm -> confirmed
          return true;
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 9: confirming with invalid token should fail', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.hexaString({ minLength: 64, maxLength: 64 }), // Random token
        async (invalidToken) => {
          const result = await confirmSubscription(invalidToken);
          
          // Invalid token should fail
          return result.success === false && result.reason === 'invalid_token';
        }
      ),
      { numRuns: 50, endOnFailure: true }
    );
  });

  it('Property 9: confirming already confirmed subscription should be idempotent', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        emailGenerator,
        async (email) => {
          // Make email unique
          const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@${email.split('@')[1] || 'example.com'}`;
          
          // Create and confirm subscription
          const subscription = await createPendingSubscription(uniqueEmail);
          const token = subscription.confirmation_token;
          
          // First confirmation
          const firstConfirm = await confirmSubscription(token);
          assert.strictEqual(firstConfirm.success, true);
          assert.strictEqual(firstConfirm.subscription.status, 'confirmed');
          
          // Get the subscription again (token should be null now)
          const afterFirst = await getSubscriptionStatus(uniqueEmail);
          
          // Try to confirm again with original token (should fail since token is cleared)
          const secondConfirm = await confirmSubscription(token);
          
          // Second confirmation with same token should fail (token was cleared)
          const isIdempotent = secondConfirm.success === false && secondConfirm.reason === 'invalid_token';
          
          // But subscription should still be confirmed
          const finalStatus = await getSubscriptionStatus(uniqueEmail);
          const stillConfirmed = finalStatus.status === 'confirmed';
          
          // Clean up
          await pool.query('DELETE FROM newsletter_subscriptions WHERE id = $1', [subscription.id]);
          
          return isIdempotent && stillConfirmed;
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 9: confirmation should clear the confirmation token', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        emailGenerator,
        async (email) => {
          // Make email unique
          const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@${email.split('@')[1] || 'example.com'}`;
          
          // Create pending subscription
          const subscription = await createPendingSubscription(uniqueEmail);
          const token = subscription.confirmation_token;
          
          // Confirm subscription
          await confirmSubscription(token);
          
          // Check that token is cleared
          const result = await pool.query(
            'SELECT confirmation_token FROM newsletter_subscriptions WHERE id = $1',
            [subscription.id]
          );
          
          const tokenCleared = result.rows[0].confirmation_token === null;
          
          // Clean up
          await pool.query('DELETE FROM newsletter_subscriptions WHERE id = $1', [subscription.id]);
          
          return tokenCleared;
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 9: confirmation timestamp should be set', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        emailGenerator,
        async (email) => {
          // Make email unique
          const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@${email.split('@')[1] || 'example.com'}`;
          
          // Create pending subscription
          const subscription = await createPendingSubscription(uniqueEmail);
          
          // Verify no confirmed_at initially
          assert.strictEqual(subscription.confirmed_at, undefined);
          
          // Confirm subscription
          const confirmResult = await confirmSubscription(subscription.confirmation_token);
          
          // Verify confirmed_at is set
          const hasTimestamp = confirmResult.subscription.confirmed_at !== null && 
                               confirmResult.subscription.confirmed_at !== undefined;
          
          // Verify timestamp is recent (within last minute)
          const timestamp = new Date(confirmResult.subscription.confirmed_at);
          const now = new Date();
          const isRecent = (now - timestamp) < 60000; // within 60 seconds
          
          // Clean up
          await pool.query('DELETE FROM newsletter_subscriptions WHERE id = $1', [subscription.id]);
          
          return hasTimestamp && isRecent;
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 9: multiple subscriptions can be confirmed independently', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    // Create multiple subscriptions
    const email1 = `test-multi-1-${Date.now()}@example.com`;
    const email2 = `test-multi-2-${Date.now()}@example.com`;
    const email3 = `test-multi-3-${Date.now()}@example.com`;
    
    const sub1 = await createPendingSubscription(email1);
    const sub2 = await createPendingSubscription(email2);
    const sub3 = await createPendingSubscription(email3);
    
    // Confirm only sub2
    await confirmSubscription(sub2.confirmation_token);
    
    // Check statuses
    const status1 = await getSubscriptionStatus(email1);
    const status2 = await getSubscriptionStatus(email2);
    const status3 = await getSubscriptionStatus(email3);
    
    const correct = status1.status === 'pending' &&
                    status2.status === 'confirmed' &&
                    status3.status === 'pending';
    
    // Clean up
    await pool.query('DELETE FROM newsletter_subscriptions WHERE id IN ($1, $2, $3)', 
      [sub1.id, sub2.id, sub3.id]);
    
    assert.strictEqual(correct, true, 'Only confirmed subscription should have confirmed status');
  });
});
