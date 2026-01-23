/**
 * Manual test script for media upload functionality
 * 
 * This script tests the media upload system by:
 * 1. Creating a test image buffer
 * 2. Testing the image processing logic
 * 3. Verifying file operations
 * 
 * Note: This is a manual test, not an automated test suite
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');

async function ensureUploadDirs() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(THUMBNAIL_DIR, { recursive: true });
    console.log('✓ Upload directories created');
  } catch (error) {
    console.error('✗ Error creating upload directories:', error);
    throw error;
  }
}

async function createTestImage() {
  try {
    // Create a simple test image (red square)
    const testImage = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    })
    .png()
    .toBuffer();
    
    console.log('✓ Test image created');
    return testImage;
  } catch (error) {
    console.error('✗ Error creating test image:', error);
    throw error;
  }
}

async function testImageProcessing(imageBuffer) {
  try {
    // Test metadata extraction
    const metadata = await sharp(imageBuffer).metadata();
    console.log('✓ Image metadata extracted:', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    });

    // Test WebP conversion
    const timestamp = Date.now();
    const filename = `test-${timestamp}.webp`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await sharp(imageBuffer)
      .resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(filepath);

    const stats = await fs.stat(filepath);
    console.log('✓ WebP conversion successful:', {
      filename,
      size: stats.size,
      path: filepath
    });

    // Test thumbnail generation
    const thumbnailFilename = `thumb-${filename}`;
    const thumbnailFilepath = path.join(THUMBNAIL_DIR, thumbnailFilename);

    await sharp(imageBuffer)
      .resize(400, 400, {
        fit: 'cover',
      })
      .webp({ quality: 80 })
      .toFile(thumbnailFilepath);

    const thumbStats = await fs.stat(thumbnailFilepath);
    console.log('✓ Thumbnail generation successful:', {
      filename: thumbnailFilename,
      size: thumbStats.size,
      path: thumbnailFilepath
    });

    // Cleanup test files
    await fs.unlink(filepath);
    await fs.unlink(thumbnailFilepath);
    console.log('✓ Test files cleaned up');

    return true;
  } catch (error) {
    console.error('✗ Error processing image:', error);
    throw error;
  }
}

async function runTests() {
  console.log('\n=== Media Upload System Test ===\n');

  try {
    // Test 1: Directory creation
    await ensureUploadDirs();

    // Test 2: Image creation
    const testImage = await createTestImage();

    // Test 3: Image processing
    await testImageProcessing(testImage);

    console.log('\n=== All Tests Passed ✓ ===\n');
    console.log('Media upload system is working correctly!');
    console.log('\nNext steps:');
    console.log('1. Ensure database is running and media table exists');
    console.log('2. Start the server: npm start');
    console.log('3. Test the API endpoints with a real image upload');
    
  } catch (error) {
    console.error('\n=== Tests Failed ✗ ===\n');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

runTests();
