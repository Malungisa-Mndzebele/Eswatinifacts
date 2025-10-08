const ftp = require('basic-ftp');

async function testFTP() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    
    try {
        console.log('Testing FTP connection...');
        console.log('Server:', process.env.FTP_SERVER || 'server37.shared.spaceship.host');
        console.log('Username:', process.env.FTP_USERNAME || 'info@eswatinifacts.org');
        console.log('Port:', process.env.FTP_PORT || '21');
        
        await client.access({
            host: process.env.FTP_SERVER || 'server37.shared.spaceship.host',
            user: process.env.FTP_USERNAME || 'info@eswatinifacts.org',
            password: process.env.FTP_PASSWORD || '-Qaxnhk1=*#',
            port: parseInt(process.env.FTP_PORT || '21'),
            secure: false
        });
        
        console.log('✅ FTP connection successful!');
        console.log('Current directory:', await client.pwd());
        
        // List files in current directory
        const files = await client.list();
        console.log('Files in current directory:');
        files.forEach(file => console.log(`  ${file.name} (${file.type})`));
        
    } catch (error) {
        console.error('❌ FTP connection failed:', error.message);
        console.error('Full error:', error);
    } finally {
        client.close();
    }
}

testFTP();
