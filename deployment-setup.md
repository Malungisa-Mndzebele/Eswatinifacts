# Deployment Setup Guide for Eswatini Facts Website

## Overview
This guide explains how to set up automated deployment of the Eswatini Facts website to [eswatinifacts.org](http://eswatinifacts.org/) using GitHub Actions and FTP.

## Prerequisites
- GitHub repository with the website code
- FTP hosting account with the provided credentials
- GitHub account with repository access

## Step 1: Set Up GitHub Secrets

### Required Secrets
You need to add the following secrets to your GitHub repository:

1. **FTP_SERVER**: `server37.shared.spaceship.host`
2. **FTP_USERNAME**: `info@eswatinifacts.org`
3. **FTP_PASSWORD**: `-Qaxnhk1=*#`
4. **FTP_PORT**: `21`

### How to Add Secrets
1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret with the exact name and value listed above

## Step 2: Verify Workflow File

The deployment workflow is already configured in `.github/workflows/deploy.yml`. It will:
- Trigger on pushes to the `main` branch when `website/` files change
- Deploy using FTP to your hosting server
- Exclude unnecessary files (git files, node_modules, etc.)

## Step 3: Test Deployment

### Manual Trigger
1. Make a small change to any file in the `website/` directory
2. Commit and push to the `main` branch
3. Go to the **Actions** tab in your GitHub repository
4. Watch the deployment workflow run

### Automatic Trigger
The workflow will automatically run when:
- You push changes to the `main` branch
- Changes are made to files in the `website/` directory
- You manually trigger it from the Actions tab

## Step 4: Verify Website

After deployment:
1. Visit [http://eswatinifacts.org/](http://eswatinifacts.org/)
2. Check that all pages load correctly
3. Verify that charts and interactive elements work
4. Test on different devices and browsers

## Troubleshooting

### Common Issues

#### Deployment Fails
- **Check secrets**: Ensure all FTP credentials are correctly set
- **Check server**: Verify FTP server is accessible
- **Check permissions**: Ensure FTP user has write permissions

#### Website Not Loading
- **Check file paths**: Ensure files are uploaded to correct directory
- **Check index.html**: Verify index.html is in the root directory
- **Check server logs**: Contact hosting provider if issues persist

#### Charts Not Displaying
- **Check JavaScript**: Ensure script.js is loading correctly
- **Check Chart.js**: Verify Chart.js library is accessible
- **Check console**: Look for JavaScript errors in browser console

### Debug Steps
1. Check GitHub Actions logs for detailed error messages
2. Verify FTP connection manually using an FTP client
3. Test website locally before deployment
4. Check browser developer tools for errors

## Security Best Practices

### Credential Management
- ✅ Secrets are stored securely in GitHub
- ✅ No sensitive information in repository
- ✅ FTP credentials are encrypted in transit
- ✅ Access is limited to repository collaborators

### File Security
- ✅ Exclude sensitive files from deployment
- ✅ Use HTTPS for all external resources
- ✅ Validate all user inputs (if any)
- ✅ Keep dependencies updated

## Monitoring and Maintenance

### Regular Checks
- Monitor deployment success rates
- Check website uptime and performance
- Review and update dependencies
- Monitor for security vulnerabilities

### Updates
- Update website content regularly
- Keep data current and accurate
- Monitor for broken links
- Update dependencies as needed

## Advanced Configuration

### Custom Domain
If you want to use a custom domain:
1. Configure DNS settings with your domain provider
2. Set up SSL certificate (Let's Encrypt recommended)
3. Update any hardcoded URLs in the website

### Performance Optimization
- Enable gzip compression on server
- Set up CDN for static assets
- Optimize images and assets
- Monitor Core Web Vitals

### Analytics
- Set up Google Analytics
- Monitor user engagement
- Track page performance
- Analyze user behavior

## Support

### GitHub Actions
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [FTP Deploy Action](https://github.com/SamKirkland/FTP-Deploy-Action)

### FTP Hosting
- Contact your hosting provider for FTP issues
- Check hosting provider documentation
- Monitor server resources and limits

### Website Issues
- Check browser console for errors
- Validate HTML and CSS
- Test on different devices
- Use web development tools

## Conclusion

With this setup, your Eswatini Facts website will automatically deploy whenever you make changes to the `website/` directory. The deployment process is secure, automated, and reliable.

Remember to:
- Keep your secrets secure
- Test changes locally before pushing
- Monitor deployment success
- Keep the website content updated

For additional help or questions, refer to the GitHub Actions documentation or contact your hosting provider.
