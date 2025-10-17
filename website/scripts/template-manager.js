const fs = require('fs');
const path = require('path');

// Page configurations
const pageConfigs = {
    'index.html': {
        page_title: 'Trusted Information About the Kingdom of Eswatini',
        page_description: 'Discover accurate, up-to-date information about Eswatini (formerly Swaziland). Explore the country\'s economy, politics, culture, and development.',
        page_keywords: 'Eswatini, Swaziland, African kingdom, southern Africa, Eswatini facts, Eswatini information',
        canonical_url: '/',
        og_image: 'eswatini-facts-social.jpg'
    },
    'videos.html': {
        page_title: 'Educational Videos About Eswatini | Economy, Culture & Politics',
        page_description: 'Watch in-depth educational videos about Eswatini\'s economy, culture, politics, and development. Expert analysis and insights from Eswatini Facts.',
        page_keywords: 'Eswatini videos, Swaziland documentary, Eswatini economy, Eswatini culture, Eswatini politics',
        canonical_url: '/videos',
        og_image: 'eswatini-videos-social.jpg'
    },
    'economy.html': {
        page_title: 'Eswatini Economy | GDP, Trade, Development & Analysis',
        page_description: 'Comprehensive analysis of Eswatini\'s economy, including GDP data, trade relationships, development challenges, and economic indicators.',
        page_keywords: 'Eswatini economy, Swaziland GDP, Eswatini trade, economic development, African economies',
        canonical_url: '/economy',
        og_image: 'eswatini-economy-social.jpg'
    },
    'politics.html': {
        page_title: 'Eswatini Politics | Government, Monarchy & Political System',
        page_description: 'Understanding Eswatini\'s political system, including the monarchy, government structure, and current political developments.',
        page_keywords: 'Eswatini politics, Swaziland government, King Mswati III, Eswatini monarchy, African politics',
        canonical_url: '/politics',
        og_image: 'eswatini-politics-social.jpg'
    },
    'culture.html': {
        page_title: 'Eswatini Culture | Traditions, Customs & Heritage',
        page_description: 'Explore the rich cultural heritage of Eswatini, including traditional ceremonies, customs, art, and modern cultural expressions.',
        page_keywords: 'Eswatini culture, Swazi traditions, cultural heritage, African customs, Umhlanga reed dance',
        canonical_url: '/culture',
        og_image: 'eswatini-culture-social.jpg'
    },
    'health.html': {
        page_title: 'Healthcare in Eswatini | Health System & Medical Services',
        page_description: 'Analysis of Eswatini\'s healthcare system, including public health initiatives, medical services, and health indicators.',
        page_keywords: 'Eswatini healthcare, Swaziland health system, medical services, public health, African healthcare',
        canonical_url: '/health',
        og_image: 'eswatini-health-social.jpg'
    },
    'education.html': {
        page_title: 'Education in Eswatini | Schools, Universities & Learning',
        page_description: 'Overview of Eswatini\'s education system, including schools, universities, educational policies, and development.',
        page_keywords: 'Eswatini education, Swaziland schools, universities, educational system, African education',
        canonical_url: '/education',
        og_image: 'eswatini-education-social.jpg'
    },
    'about.html': {
        page_title: 'About Eswatini Facts | Mission & Approach',
        page_description: 'Our mission is to make Eswatini\'s data accessible and understandable for everyone. Learn how we research, verify, and present facts.',
        page_keywords: 'About Eswatini Facts, mission, methodology, research approach',
        canonical_url: '/about',
        og_image: 'eswatini-facts-about-social.jpg'
    },
    'contact.html': {
        page_title: 'Contact Eswatini Facts | Questions & Feedback',
        page_description: 'Get in touch with Eswatini Facts. Send us questions, feedback, corrections, or collaboration ideas.',
        page_keywords: 'contact Eswatini Facts, feedback, questions, collaboration',
        canonical_url: '/contact',
        og_image: 'eswatini-facts-contact-social.jpg'
    },
    'join.html': {
        page_title: 'Join Eswatini Facts | Volunteer & Contribute',
        page_description: 'Volunteer, contribute research, or collaborate with us to improve data transparency and public understanding in Eswatini.',
        page_keywords: 'volunteer Eswatini Facts, contribute, collaborate, research',
        canonical_url: '/join',
        og_image: 'eswatini-facts-join-social.jpg'
    },
    'data-sources.html': {
        page_title: 'Data Sources | Eswatini Facts Research & Methodology',
        page_description: 'See the original sources behind our data and how we compile and maintain accurate, up-to-date information for Eswatini.',
        page_keywords: 'Eswatini data sources, methodology, research sources, references',
        canonical_url: '/data-sources',
        og_image: 'eswatini-facts-data-sources-social.jpg'
    }
};

// Read the base template and shared components
const baseTemplate = fs.readFileSync(path.join(__dirname, '..', 'templates', 'base.html'), 'utf8');
const headerTemplate = fs.readFileSync(path.join(__dirname, '..', 'components', 'header.html'), 'utf8');
const footerTemplate = fs.readFileSync(path.join(__dirname, '..', 'components', 'footer.html'), 'utf8');

// Process each page
Object.entries(pageConfigs).forEach(([filename, config]) => {
    // Read the existing page content
    const pagePath = path.join(__dirname, '..', filename);
    const pageContent = fs.readFileSync(pagePath, 'utf8');
    
    // Extract the main content (everything between <body> and </body>)
    const bodyMatch = pageContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    let mainContent = bodyMatch ? bodyMatch[1] : pageContent;

    // Strip any existing header/footer placeholders or duplicated components from page content
    mainContent = mainContent
        // remove header/footer placeholders (header/footer tags or divs)
        .replace(/<header[^>]*id=["']header-placeholder["'][\s\S]*?<\/header>/gi, '')
        .replace(/<footer[^>]*id=["']footer-placeholder["'][\s\S]*?<\/footer>/gi, '')
        .replace(/<div[^>]*id=["']header-placeholder["'][^>]*><\/div>/gi, '')
        .replace(/<div[^>]*id=["']footer-placeholder["'][^>]*><\/div>/gi, '')
        // remove any stray HTML comments around placeholders
        .replace(/<!--\s*Header Component\s*-->/gi, '')
        .replace(/<!--\s*Footer Component\s*-->/gi, '')
        .trim();
    
    // Extract any additional head content (scripts, styles, etc.)
    const headMatch = pageContent.match(/<head[^>]*>([\s\S]*)<\/head>/i);
    let additionalHead = headMatch ? 
        headMatch[1].replace(/<meta[^>]*>/g, '')
                   .replace(/<title[^>]*>.*?<\/title>/g, '')
                   .replace(/<link[^>]*>/g, '')
                   .trim() : '';
    // Remove client component loader if present (we SSR header/footer now)
    additionalHead = additionalHead.replace(/<script[^>]*components\/component-loader\.js[^>]*><\/script>/gi, '');
    
    // Extract any additional scripts at the end of the body
    const scriptsMatch = mainContent.match(/<script[\s\S]*?<\/script>/g);
    const additionalScripts = scriptsMatch ? scriptsMatch.join('\n') : '';
    
    // Replace template variables
    const buildId = Date.now().toString();
    let newPageContent = baseTemplate
        .replace('{{page_title}}', config.page_title)
        .replace('{{page_description}}', config.page_description)
        .replace('{{page_keywords}}', config.page_keywords)
        .replace(/{{canonical_url}}/g, config.canonical_url)
        .replace(/{{og_image}}/g, config.og_image)
        .replace(/{{build_id}}/g, buildId)
        .replace('{{additional_head_content}}', additionalHead)
        .replace('{{page_content}}', mainContent.replace(/<script[\s\S]*?<\/script>/g, ''))
        .replace('{{header}}', headerTemplate)
        .replace('{{footer}}', footerTemplate)
        .replace('{{additional_scripts}}', additionalScripts);
    
    // Write the new page content
    fs.writeFileSync(pagePath, newPageContent);
    console.log(`Updated ${filename} with template`);
});

console.log('Template implementation complete!');
