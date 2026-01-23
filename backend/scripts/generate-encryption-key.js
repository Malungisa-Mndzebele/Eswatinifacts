import crypto from 'crypto';

/**
 * Generate a secure 32-byte encryption key for AES-256
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

console.log('Generated Encryption Key (32 bytes / 64 hex characters):');
console.log(generateEncryptionKey());
console.log('\nAdd this to your .env file as:');
console.log('ENCRYPTION_KEY=<generated_key>');
