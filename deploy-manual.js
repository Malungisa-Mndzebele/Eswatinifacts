const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

async function deployWebsite() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    
    try {
        console.log('🚀 Starting manual deployment...');
        
        // Connect to FTP server
        await client.access({
            host: 'server37.shared.spaceship.host',
            user: 'info@eswatinifacts.org',
            password: 'Eswatini2024!',
            port: 21,
            secure: false
        });
        
        console.log('✅ Connected to FTP server');
        console.log('Current directory:', await client.pwd());
        
        // Upload website files
        const websiteDir = './website';
        const files = fs.readdirSync(websiteDir);
        
        console.log(`📁 Found ${files.length} files to upload:`);
        files.forEach(file => console.log(`  - ${file}`));
        
        for (const file of files) {
            if (file.endsWith('.html') || file.endsWith('.css') || file.endsWith('.js')) {
                const localPath = path.join(websiteDir, file);
                const remotePath = `./${file}`;
                
                console.log(`📤 Uploading ${file}...`);
                await client.uploadFrom(localPath, remotePath);
                console.log(`✅ Uploaded ${file}`);
            }
        }
        
        console.log('🎉 Deployment completed successfully!');
        console.log('🌐 Website should be available at: https://eswatinifacts.org/info/');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        console.error('Full error:', error);
    } finally {
        client.close();
    }
}

deployWebsite();
