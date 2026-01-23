# PII Encryption Implementation

## Overview

Implemented AES-256-GCM encryption for personally identifiable information (PII) in the Eswatini Facts Platform backend, ensuring all sensitive user data is encrypted at rest in compliance with Requirements 12.5.

## Implementation Details

### 1. Encryption Utility (`src/utils/encryption.js`)

Created a comprehensive encryption module with the following features:

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV**: Random 16-byte initialization vector for each encryption
- **Authentication**: 16-byte authentication tag for data integrity
- **Key Management**: Encryption key stored in environment variable `ENCRYPTION_KEY`

**Functions**:
- `encrypt(plaintext)` - Encrypts any string value
- `decrypt(encryptedData)` - Decrypts encrypted data
- `encryptEmail(email)` - Specialized email encryption
- `decryptEmail(encryptedEmail)` - Specialized email decryption
- `encryptName(name)` - Specialized name encryption
- `decryptName(encryptedName)` - Specialized name decryption
- `generateEncryptionKey()` - Utility to generate new encryption keys

### 2. Database Schema Updates

Created migration `src/database/migrations/001_add_pii_encryption.sql`:

- Added `email_encrypted` column to `users` table
- Added `name_encrypted` column to `users` table
- Added `email_encrypted` column to `newsletter_subscriptions` table
- Added `pii_encrypted` flag to track encryption status
- Created indexes on encrypted columns for query performance

### 3. Controller Updates

Updated authentication and user controllers to use encryption:

**`authController.js`**:
- `register()` - Encrypts email and name before storing
- `login()` - Queries by encrypted email, decrypts for response
- `getProfile()` - Decrypts PII when retrieving user data
- `requestPasswordReset()` - Uses encrypted email for user lookup

**`userController.js`**:
- `getUserProfile()` - Decrypts PII in user profile responses

### 4. Key Generation Script

Created `scripts/generate-encryption-key.js` to generate secure 32-byte encryption keys for production use.

### 5. Property-Based Tests

Implemented comprehensive property-based tests in `tests/pii-encryption.pbt.test.js`:

**Property 36: PII encryption at rest** - Validates Requirements 12.5

Test Coverage (100 iterations each):
1. ✅ Round-trip encryption/decryption preserves original values
2. ✅ Same plaintext produces different ciphertexts (random IV)
3. ✅ Encrypted data differs from plaintext
4. ✅ Email encryption round-trip preserves format
5. ✅ Name encryption round-trip preserves values
6. ✅ Null values handled correctly
7. ✅ Ciphertext structure validates AES-256-GCM usage
8. ✅ Tampering with encrypted data causes decryption failure

All tests passed successfully.

## Security Features

1. **AES-256-GCM**: Industry-standard authenticated encryption
2. **Random IVs**: Each encryption uses a unique initialization vector
3. **Authentication Tags**: Prevents tampering and ensures data integrity
4. **Key Management**: Encryption key stored securely in environment variables
5. **Fail-Safe Decryption**: Tampered data cannot be decrypted

## Configuration

### Environment Variables

```bash
# Generate a new key using:
node scripts/generate-encryption-key.js

# Add to .env:
ENCRYPTION_KEY=<64-character-hex-string>
```

### Database Migration

Run the migration to add encrypted columns:

```bash
node scripts/run-migration.js
```

Or use the integrated migration in database initialization:

```javascript
import { resetDatabase } from './src/database/init.js';
await resetDatabase(); // Includes migration
```

## Usage Example

```javascript
import { encryptEmail, decryptEmail } from './src/utils/encryption.js';

// Encrypt before storing
const encryptedEmail = encryptEmail('user@example.com');
await pool.query(
  'INSERT INTO users (email_encrypted) VALUES ($1)',
  [encryptedEmail]
);

// Decrypt when retrieving
const result = await pool.query('SELECT email_encrypted FROM users WHERE id = $1', [userId]);
const email = decryptEmail(result.rows[0].email_encrypted);
```

## Compliance

This implementation satisfies:
- **Requirement 12.5**: "WHEN the Platform stores user data THEN the Platform SHALL encrypt personally identifiable information at rest"
- **Property 36**: "For any personally identifiable information stored in the database, the data should be encrypted using AES-256 or stronger"

## Future Enhancements

1. Key rotation mechanism for periodic key updates
2. Encryption for additional PII fields (addresses, phone numbers)
3. Hardware security module (HSM) integration for key storage
4. Audit logging for encryption/decryption operations
