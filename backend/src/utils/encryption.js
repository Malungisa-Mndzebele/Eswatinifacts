import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment variable
 * The key should be a 32-byte (256-bit) hex string
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  // Convert hex string to buffer
  const keyBuffer = Buffer.from(key, 'hex');
  
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte (64 character) hex string');
  }
  
  return keyBuffer;
}

/**
 * Encrypt a string value using AES-256-GCM
 * @param {string} plaintext - The text to encrypt
 * @returns {string} - Base64 encoded encrypted data with IV and auth tag
 */
export function encrypt(plaintext) {
  if (!plaintext) {
    return null;
  }
  
  if (typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a string');
  }
  
  try {
    const key = getEncryptionKey();
    
    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine IV + encrypted data + auth tag
    const combined = Buffer.concat([
      iv,
      Buffer.from(encrypted, 'hex'),
      authTag
    ]);
    
    // Return as base64
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string value encrypted with AES-256-GCM
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @returns {string} - The decrypted plaintext
 */
export function decrypt(encryptedData) {
  if (!encryptedData) {
    return null;
  }
  
  if (typeof encryptedData !== 'string') {
    throw new Error('Encrypted data must be a string');
  }
  
  try {
    const key = getEncryptionKey();
    
    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract IV, encrypted data, and auth tag
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt email address
 * @param {string} email - The email to encrypt
 * @returns {string} - Encrypted email
 */
export function encryptEmail(email) {
  return encrypt(email);
}

/**
 * Decrypt email address
 * @param {string} encryptedEmail - The encrypted email
 * @returns {string} - Decrypted email
 */
export function decryptEmail(encryptedEmail) {
  return decrypt(encryptedEmail);
}

/**
 * Encrypt user name
 * @param {string} name - The name to encrypt
 * @returns {string} - Encrypted name
 */
export function encryptName(name) {
  return encrypt(name);
}

/**
 * Decrypt user name
 * @param {string} encryptedName - The encrypted name
 * @returns {string} - Decrypted name
 */
export function decryptName(encryptedName) {
  return decrypt(encryptedName);
}

/**
 * Generate a new encryption key (for setup/rotation)
 * @returns {string} - 32-byte hex string
 */
export function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}
