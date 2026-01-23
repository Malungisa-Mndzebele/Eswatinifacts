import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import crypto from 'crypto';
import { pool } from '../src/config/database.js';

/**
 * Feature: eswatini-facts-platform, Property 10: Unsubscribe completeness
 * Validates: Requirements 3.4
 * 
 * For any confirmed subscription, requesting unsubscribe should remove the 
 * subscription from the active list and prevent future newsletters
 */

// Generate confirmation token
function generateConfirmationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Create a confirmed subscription
async function createConfirmedSubscription(email) {
  const result = await pool.query(
    `INSERT INTO newsletter_subscriptions (email, status, confirmed_at, categories)
     VALUES ($1, 'confirmed', NOW(), $2)
     RETURNING id, email, status, confirmed_at, created_at`,
    [email.toLowerCase().trim(), []]
  );
  return result.rows[0];
}

// Unsubscribe by email
async function unsubscribeByEmail(email) {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find subscription
    const result = await pool.query(
      'SELECT id, email, status FROM newsletter_subscriptions WHERE email = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return { success: false, reason: 'not_found' };
    }

    const subscription = result.rows[0];

    // If already unsubscribed, return success
    if (subscription.status === 'unsubscribed') {
      return { success: true, reason: 'already_unsubscribed', subscription };
    }

    // Unsubscribe
    await pool.query(
      `UPDATE newsletter_subscriptions 
       SET status = 'unsubscribed', unsubscribed_at = NOW()
       WHERE id = $1`,
      [subscription.id]
    );

    // Verify unsubscribe
    const verified = await pool.query(
      'SELECT id, email, status, unsubscribed_at FROM newsletter_subscriptions WHERE id = $1',
      [subscription.id]
    );

    return { 
      success: true, 
      reason: 'unsubscribed', 
      subscription: verified.rows[0] 
    };
  } catch (error) {
    return { success: false, reason: 'error', error };
  }
}

// Get active (confirmed) subscriptions
async function getActiveSubscriptions() {
  const result = await pool.query(
    "SELECT email FROM newsletter_subscriptions WHERE status = 'confirmed'"
  );
  return result.rows.map(row => row.email);
}

// Check if email would receive newsletters
async function wouldReceiveNewsletter(email) {
  const result = await pool.query(
    "SELECT status FROM newsletter_subscriptions WHERE email = $1 AND status = 'confirmed'",
    [email.toLowerCase().trim()]
  );
  return result.rows.length > 0;
}

// Generators for property-based testing
const emailGenerator = fc.emailAddress();

describe('Newsletter - Unsubscribe Completeness (PBT)', () => {
  let dbAvailable = false;

  before(async () => {
    // Check if database is available
    try {
      const client = await pool.connect();
      client.release();
      dbAvailable = true;
      console.log('Database connected - running unsubscribe tests');
    } catch (error) {
      console.log('Database not available - skipping unsubscribe tests');
      console.log('To run these tests, please set up PostgreSQL and configure .env');
    }
  });

  after(async () => {
    // Clean up test subscriptions
    if (dbAvailable) {
      await pool.query("DELETE FROM newsletter_subscriptions WHERE email LIKE '%test%' OR email LIKE '%example%'");
    }
  });

  it('Property 10: unsubscribe should remove subscription from active list', async () => {
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
          
          // Create confirmed subscription
          const subscription = await createConfirmedSubscription(uniqueEmail);
          assert.strictEqual(subscription.status, 'confirmed', 'Initial status should be confirmed');
          
          // Verify it's in active list
          const beforeUnsubscribe = await wouldReceiveNewsletter(uniqueEmail);
          assert.strictEqual(beforeUnsubscribe, true, 'Should be in active list before unsubscribe');
          
          // Unsubscribe
          const unsubResult = await unsubscribeByEmail(uniqueEmail);
          assert.strictEqual(unsubResult.success, true, 'Unsubscribe should succeed');
          assert.strictEqual(unsubResult.subscription.status, 'unsubscribed', 'Status should be unsubscribed');
          
          // Verify it's NOT in active list
          const afterUnsubscribe = await wouldReceiveNewsletter(uniqueEmail);
          assert.strictEqual(afterUnsubscribe, false, 'Should NOT be in active list after unsubscribe');
          
          // Clean up
          await pool.query('DELETE FROM newsletter_subscriptions WHERE id = $1', [subscription.id]);
          
          // Property holds: unsubscribed emails are removed from active list
          return true;
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 10: unsubscribe should prevent future newsletters', async () => {
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
          
          // Create confirmed subscription
          const subscription = await createConfirmedSubscription(uniqueEmail);
          
          // Unsubscribe
          await unsubscribeByEmail(uniqueEmail);
          
          // Check if would receive newsletter (should be false)
          const wouldReceive = await wouldReceiveNewsletter(uniqueEmail);
          
          // Clean up
          await pool.query('DELETE FROM newsletter_subscriptions WHERE id = $1', [subscription.id]);
          
          // Should NOT receive newsletters after unsubscribe
          return wouldReceive === false;
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 10: unsubscribe should be idempotent', async () => {
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
          
          // Create confirmed subscription
          const subscription = await createConfirmedSubscription(uniqueEmail);
          
          // First unsubscribe
          const firstUnsub = await unsubscribeByEmail(uniqueEmail);
          assert.strictEqual(firstUnsub.success, true);
          assert.strictEqual(firstUnsub.subscription.status, 'unsubscribed');
          
          // Second unsubscribe (should still succeed)
          const secondUnsub = await unsubscribeByEmail(uniqueEmail);
          assert.strictEqual(secondUnsub.success, true);
          assert.strictEqual(secondUnsub.reason, 'already_unsubscribed');
          
          // Verify still unsubscribed
          const finalCheck = await wouldReceiveNewsletter(uniqueEmail);
          
          // Clean up
          await pool.query('DELETE FROM newsletter_subscriptions WHERE id = $1', [subscription.id]);
          
          // Multiple unsubscribes should be safe (idempotent)
          return finalCheck === false;
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 10: unsubscribe should set unsubscribed_at timestamp', async () => {
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
          
          // Create confirmed subscription
          const subscription = await createConfirmedSubscription(uniqueEmail);
          
          // Unsubscribe
          const unsubResult = await unsubscribeByEmail(uniqueEmail);
          
          // Verify unsubscribed_at is set
          const hasTimestamp = unsubResult.subscription.unsubscribed_at !== null && 
                               unsubResult.subscription.unsubscribed_at !== undefined;
          
          // Verify timestamp is recent (within last minute)
          const timestamp = new Date(unsubResult.subscription.unsubscribed_at);
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

  it('Property 10: unsubscribing non-existent email should fail gracefully', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        emailGenerator,
        async (email) => {
          // Use a unique email that doesn't exist
          const nonExistentEmail = `nonexistent-${Date.now()}-${Math.random().toString(36).substring(7)}@${email.split('@')[1] || 'example.com'}`;
          
          const result = await unsubscribeByEmail(nonExistentEmail);
          
          // Should fail with not_found reason
          return result.success === false && result.reason === 'not_found';
        }
      ),
      { numRuns: 50, endOnFailure: true }
    );
  });

  it('Property 10: unsubscribe from pending subscription should work', async () => {
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
          const subscription = await pool.query(
            `INSERT INTO newsletter_subscriptions (email, status, confirmation_token)
             VALUES ($1, 'pending', $2)
             RETURNING id, email, status`,
            [uniqueEmail, generateConfirmationToken()]
          );
          
          const sub = subscription.rows[0];
          
          // Unsubscribe from pending
          const unsubResult = await unsubscribeByEmail(uniqueEmail);
          assert.strictEqual(unsubResult.success, true);
          assert.strictEqual(unsubResult.subscription.status, 'unsubscribed');
          
          // Verify not in active list
          const wouldReceive = await wouldReceiveNewsletter(uniqueEmail);
          
          // Clean up
          await pool.query('DELETE FROM newsletter_subscriptions WHERE id = $1', [sub.id]);
          
          return wouldReceive === false;
        }
      ),
      { numRuns: 20, endOnFailure: true }
    );
  });

  it('Property 10: active subscriptions query should exclude unsubscribed', async () => {
    if (!dbAvailable) {
      console.log('  Skipped - database not available');
      return;
    }

    // Create multiple subscriptions with different statuses
    const confirmedEmail = `test-confirmed-${Date.now()}@example.com`;
    const unsubscribedEmail = `test-unsubscribed-${Date.now()}@example.com`;
    const pendingEmail = `test-pending-${Date.now()}@example.com`;
    
    const sub1 = await createConfirmedSubscription(confirmedEmail);
    const sub2 = await createConfirmedSubscription(unsubscribedEmail);
    await unsubscribeByEmail(unsubscribedEmail);
    
    const sub3 = await pool.query(
      `INSERT INTO newsletter_subscriptions (email, status, confirmation_token)
       VALUES ($1, 'pending', $2)
       RETURNING id`,
      [pendingEmail, generateConfirmationToken()]
    );
    
    // Get active subscriptions
    const activeEmails = await getActiveSubscriptions();
    
    // Should include confirmed, exclude unsubscribed and pending
    const hasConfirmed = activeEmails.includes(confirmedEmail);
    const hasUnsubscribed = activeEmails.includes(unsubscribedEmail);
    const hasPending = activeEmails.includes(pendingEmail);
    
    // Clean up
    await pool.query('DELETE FROM newsletter_subscriptions WHERE id IN ($1, $2, $3)', 
      [sub1.id, sub2.id, sub3.rows[0].id]);
    
    assert.strictEqual(hasConfirmed, true, 'Should include confirmed subscription');
    assert.strictEqual(hasUnsubscribed, false, 'Should NOT include unsubscribed subscription');
    assert.strictEqual(hasPending, false, 'Should NOT include pending subscription');
  });
});
