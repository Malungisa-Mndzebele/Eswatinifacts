const ftp = require('basic-ftp');

async function testNewPassword() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    
    try {
        console.log('Testing with new password...');
        
        await client.access({
            host: 'server37.shared.spaceship.host',
            user: 'info@eswatinifacts.org',
            password: 'Eswatini2024!', // New password
            port: 21,
            secure: false
        });
        
        console.log('✅ SUCCESS! New password works!');
        console.log('Current directory:', await client.pwd());
        
        // List files in current directory
        const files = await client.list();
        console.log('Files in current directory:');
        files.forEach(file => console.log(`  ${file.name} (${file.type})`));
        
    } catch (error) {
        console.error('❌ Still failed:', error.message);
    } finally {
        client.close();
    }
}

testNewPassword();
