const ftp = require('basic-ftp');

async function testFTPCredentials(server, username, password, port = 21) {
    const client = new ftp.Client();
    client.ftp.verbose = false; // Less verbose for multiple tests
    
    try {
        console.log(`\n🔍 Testing: ${username}@${server}:${port}`);
        
        await client.access({
            host: server,
            user: username,
            password: password,
            port: port,
            secure: false
        });
        
        console.log('✅ SUCCESS! Credentials work!');
        console.log('Current directory:', await client.pwd());
        
        // List files in current directory
        const files = await client.list();
        console.log('Files in current directory:');
        files.forEach(file => console.log(`  ${file.name} (${file.type})`));
        
        return true;
        
    } catch (error) {
        console.log(`❌ FAILED: ${error.message}`);
        return false;
    } finally {
        client.close();
    }
}

async function runTests() {
    const server = 'server37.shared.spaceship.host';
    const port = 21;
    
    // Test different credential combinations
    const testCases = [
        // Original credentials
        { username: 'info@eswatinifacts.org', password: '-Qaxnhk1=*#' },
        
        // Try without @ symbol
        { username: 'infoeswatinifacts.org', password: '-Qaxnhk1=*#' },
        
        // Try different password variations
        { username: 'info@eswatinifacts.org', password: 'Qaxnhk1=*#' },
        { username: 'info@eswatinifacts.org', password: '-Qaxnhk1=*' },
        { username: 'info@eswatinifacts.org', password: 'Qaxnhk1=*' },
        
        // Try with different username formats
        { username: 'info', password: '-Qaxnhk1=*#' },
        { username: 'eswatinifacts', password: '-Qaxnhk1=*#' },
        
        // Try with domain variations
        { username: 'info@eswatinifacts.org', password: '-Qaxnhk1=*#' },
        { username: 'info@eswatinifacts.com', password: '-Qaxnhk1=*#' },
    ];
    
    console.log('🚀 Testing FTP credentials...\n');
    
    for (const testCase of testCases) {
        const success = await testFTPCredentials(server, testCase.username, testCase.password, port);
        if (success) {
            console.log('\n🎉 FOUND WORKING CREDENTIALS!');
            console.log(`Username: ${testCase.username}`);
            console.log(`Password: ${testCase.password}`);
            break;
        }
    }
    
    console.log('\n📋 If none worked, please check your cPanel FTP settings.');
}

runTests();
