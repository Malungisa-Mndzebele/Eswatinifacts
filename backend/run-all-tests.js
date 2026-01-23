import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testsDir = join(__dirname, 'tests');

async function runAllTests() {
  console.log('Running all property-based tests...\n');
  
  try {
    const files = await readdir(testsDir);
    const testFiles = files.filter(f => f.endsWith('.pbt.test.js'));
    
    console.log(`Found ${testFiles.length} test files\n`);
    
    const testPaths = testFiles.map(f => `tests/${f}`);
    
    const nodeProcess = spawn('node', ['--test', ...testPaths], {
      stdio: 'inherit',
      shell: true,
      cwd: __dirname
    });
    
    nodeProcess.on('close', (code) => {
      console.log(`\nTest process exited with code ${code}`);
      process.exit(code);
    });
    
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

runAllTests();
