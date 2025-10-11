const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imageDir = path.join(__dirname, 'Eswatini', 'images');
const optimizedDir = path.join(__dirname, 'website', 'images');

// Create optimized directory if it doesn't exist
if (!fs.existsSync(optimizedDir)) {
    fs.mkdirSync(optimizedDir, { recursive: true });
}

// SEO-friendly name mapping
const nameMapping = {
    '1699258794923.jpg': 'eswatini-parliament-building.jpg',
    '1707714518405.jpg': 'eswatini-government-officials.jpg',
    '1713514525109.jpg': 'eswatini-cultural-ceremony.jpg',
    '1713514525434.jpg': 'eswatini-traditional-dancers.jpg',
    '1713589928539.jpg': 'eswatini-royal-palace.jpg',
    '1713589932080.jpg': 'eswatini-royal-ceremony.jpg',
    '2024 king\'s birthday people.jpg': 'kings-birthday-2024-celebration.jpg',
    '2024 king\'s birthday queen mother.jpg': 'queen-mother-kings-birthday-2024.jpg',
    'Deputy Prime Minister Thulisile Dladla.jpg': 'deputy-pm-thulisile-dladla.jpg',
    'Eswatini traditional man.jpg': 'eswatini-traditional-male-dress.jpg',
    'Eswatini traditional woman.jpg': 'eswatini-traditional-female-dress.jpg',
    'king in parliament.jpg': 'king-mswati-parliament-session.jpg',
    'Mbabane at night.jpg': 'mbabane-city-night-view.jpg',
    'Minister of Finance Neal Rijkenberg.jpg': 'finance-minister-neal-rijkenberg.jpg',
    // Add mappings for other images...
};

// Image optimization options
const optimizationOptions = {
    jpeg: {
        quality: 80,
        mozjpeg: true,
    },
    png: {
        quality: 80,
        compressionLevel: 9,
    },
    webp: {
        quality: 80,
    },
};

// Process each image
async function optimizeImages() {
    const files = fs.readdirSync(imageDir);
    
    for (const file of files) {
        if (file.match(/\.(jpg|jpeg|png)$/i)) {
            const oldPath = path.join(imageDir, file);
            const newName = nameMapping[file] || file.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const newPath = path.join(optimizedDir, newName);
            const webpPath = path.join(optimizedDir, newName.replace(/\.[^.]+$/, '.webp'));
            
            try {
                // Create WebP version
                await sharp(oldPath)
                    .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
                    .webp(optimizationOptions.webp)
                    .toFile(webpPath);
                
                // Create optimized JPEG/PNG version
                await sharp(oldPath)
                    .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
                    .jpeg(optimizationOptions.jpeg)
                    .toFile(newPath);
                
                console.log(`Optimized: ${file} -> ${newName} (+ WebP version)`);
            } catch (error) {
                console.error(`Error processing ${file}:`, error);
            }
        }
    }
}

// Run optimization
optimizeImages().then(() => {
    console.log('Image optimization complete!');
}).catch(console.error);
