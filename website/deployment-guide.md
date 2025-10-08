# Eswatini Facts Website - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Eswatini Facts website, inspired by [USAFacts.org](https://usafacts.org/). The website is designed to be deployed on various platforms with minimal configuration.

## Prerequisites

### Required Knowledge
- Basic understanding of web development
- Familiarity with HTML, CSS, and JavaScript
- Knowledge of web hosting platforms

### Required Tools
- Text editor (VS Code, Sublime Text, etc.)
- Web browser for testing
- FTP client or Git (depending on deployment method)
- Image optimization tools (optional)

## Deployment Options

### 1. Static Hosting (Recommended)

#### GitHub Pages
1. **Create Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/username/eswatinifacts.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings
   - Scroll to "Pages" section
   - Select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Save settings

3. **Custom Domain (Optional)**
   - Add CNAME file with your domain
   - Configure DNS settings with your domain provider

#### Netlify
1. **Connect Repository**
   - Sign up at [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository

2. **Build Settings**
   - Build command: (leave empty for static site)
   - Publish directory: `/` (root directory)
   - Deploy site

3. **Custom Domain**
   - Go to Site settings > Domain management
   - Add custom domain
   - Configure DNS settings

#### Vercel
1. **Deploy from Git**
   - Sign up at [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure build settings (none needed for static site)

2. **Automatic Deployments**
   - Every push to main branch triggers deployment
   - Preview deployments for pull requests

### 2. Traditional Web Hosting

#### Shared Hosting
1. **Upload Files**
   - Use FTP client (FileZilla, WinSCP)
   - Upload all files to public_html directory
   - Ensure index.html is in root directory

2. **Configure Server**
   - Enable gzip compression
   - Set up caching headers
   - Configure SSL certificate

#### VPS/Dedicated Server
1. **Server Setup**
   ```bash
   # Install Nginx
   sudo apt update
   sudo apt install nginx

   # Create site directory
   sudo mkdir -p /var/www/eswatinifacts
   sudo chown -R $USER:$USER /var/www/eswatinifacts
   ```

2. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name eswatinifacts.com www.eswatinifacts.com;
       root /var/www/eswatinifacts;
       index index.html;

       location / {
           try_files $uri $uri/ =404;
       }

       # Enable gzip compression
       gzip on;
       gzip_types text/css application/javascript text/javascript;

       # Set caching headers
       location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

3. **SSL Certificate**
   ```bash
   # Install Certbot
   sudo apt install certbot python3-certbot-nginx

   # Obtain SSL certificate
   sudo certbot --nginx -d eswatinifacts.com -d www.eswatinifacts.com
   ```

## Pre-Deployment Checklist

### Content Review
- [ ] All data is accurate and up-to-date
- [ ] Sources are properly attributed
- [ ] Images are optimized and have alt text
- [ ] All links are working
- [ ] Contact information is correct

### Technical Review
- [ ] Website works in all major browsers
- [ ] Mobile responsiveness is tested
- [ ] Page load speed is optimized
- [ ] Accessibility standards are met
- [ ] SEO meta tags are included

### Performance Optimization
- [ ] Images are compressed (WebP format recommended)
- [ ] CSS and JavaScript are minified
- [ ] Unused code is removed
- [ ] Caching headers are configured
- [ ] CDN is set up (optional)

## Post-Deployment Tasks

### 1. Testing
- **Cross-browser Testing**: Test in Chrome, Firefox, Safari, Edge
- **Mobile Testing**: Test on various devices and screen sizes
- **Performance Testing**: Use Google PageSpeed Insights
- **Accessibility Testing**: Use WAVE or axe tools

### 2. SEO Setup
- **Google Search Console**: Submit sitemap
- **Google Analytics**: Set up tracking
- **Meta Tags**: Verify all meta tags are working
- **Structured Data**: Add JSON-LD markup (optional)

### 3. Monitoring
- **Uptime Monitoring**: Set up monitoring service
- **Error Tracking**: Implement error tracking
- **Performance Monitoring**: Monitor Core Web Vitals
- **Security**: Set up security headers

## Maintenance

### Regular Updates
- **Data Updates**: Update statistics monthly/quarterly
- **Content Updates**: Keep information current
- **Security Updates**: Update dependencies regularly
- **Performance Monitoring**: Monitor and optimize performance

### Backup Strategy
- **Code Backup**: Use Git for version control
- **Data Backup**: Regular backups of data files
- **Configuration Backup**: Backup server configurations
- **Disaster Recovery**: Plan for site recovery

## Customization

### Branding
- **Logo**: Replace placeholder logo with actual logo
- **Colors**: Customize color scheme in CSS
- **Fonts**: Change fonts to match brand
- **Content**: Customize content for specific audience

### Features
- **Additional Charts**: Add more data visualizations
- **Interactive Features**: Add more interactive elements
- **User Accounts**: Implement user registration (advanced)
- **API Integration**: Connect to live data sources

## Troubleshooting

### Common Issues

#### Page Not Loading
- Check file permissions
- Verify index.html is in root directory
- Check server configuration
- Verify DNS settings

#### Charts Not Displaying
- Check JavaScript console for errors
- Verify Chart.js library is loading
- Check data format and structure
- Test in different browsers

#### Mobile Issues
- Test responsive design
- Check viewport meta tag
- Verify CSS media queries
- Test touch interactions

#### Performance Issues
- Optimize images
- Minify CSS and JavaScript
- Enable compression
- Use CDN for assets

### Support Resources
- **Documentation**: Check this guide and README
- **Community**: GitHub issues and discussions
- **Professional Help**: Consider hiring web developer
- **Hosting Support**: Contact hosting provider

## Security Considerations

### Basic Security
- **HTTPS**: Always use SSL certificates
- **Security Headers**: Implement security headers
- **Regular Updates**: Keep all software updated
- **Access Control**: Secure admin access

### Advanced Security
- **Content Security Policy**: Implement CSP headers
- **Rate Limiting**: Prevent abuse and attacks
- **Monitoring**: Set up security monitoring
- **Backup Security**: Secure backup storage

## Analytics and Monitoring

### Google Analytics Setup
```html
<!-- Add to <head> section -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Performance Monitoring
- **Google PageSpeed Insights**: Regular performance checks
- **Core Web Vitals**: Monitor loading, interactivity, visual stability
- **Real User Monitoring**: Track actual user experience
- **Error Tracking**: Monitor JavaScript errors

## Conclusion

The Eswatini Facts website is designed to be easily deployable on various platforms. Choose the deployment method that best fits your needs and technical capabilities. For most users, static hosting services like GitHub Pages, Netlify, or Vercel provide the easiest deployment experience.

Remember to:
- Test thoroughly before going live
- Set up monitoring and analytics
- Plan for regular updates and maintenance
- Keep security in mind
- Monitor performance and user experience

For additional support or questions, refer to the documentation or contact the development team.
