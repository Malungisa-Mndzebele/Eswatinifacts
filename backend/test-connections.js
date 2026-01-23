import { testConnection } from './src/config/database.js';
import { connectRedis } from './src/config/redis.js';
import redisClient from './src/config/redis.js';

async function testConnections() {
  console.log('Testing database connection...');
  const dbOk = await testConnection();
  
  console.log('\nTesting Redis connection...');
  const redisOk = await connectRedis();
  
  if (redisOk) {
    await redisClient.quit();
  }
  
  console.log('\n=== Connection Test Results ===');
  console.log(`Database: ${dbOk ? '✓ Connected' : '✗ Failed'}`);
  console.log(`Redis: ${redisOk ? '✓ Connected' : '✗ Failed'}`);
  
  process.exit(dbOk && redisOk ? 0 : 1);
}

testConnections();
