# 🚀 Eswatini Facts Website - Deployment Setup

## Quick Start Guide

This guide will help you set up automated deployment of your Eswatini Facts website to [eswatinifacts.org](http://eswatinifacts.org/) using GitHub Actions and FTP.

## 📋 Prerequisites

- ✅ GitHub repository with your website code
- ✅ FTP hosting account (already configured)
- ✅ GitHub account with repository access

## 🔐 Step 1: Configure GitHub Secrets

### Add the following secrets to your GitHub repository:

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each of these:

| Secret Name | Secret Value |
|-------------|--------------|
| `FTP_SERVER` | `server37.shared.spaceship.host` |
| `FTP_USERNAME` | `info@eswatinifacts.org` |
| `FTP_PASSWORD` | `-Qaxnhk1=*#` |
| `FTP_PORT` | `21` |

### 🔒 Security Note
These credentials are now stored securely in GitHub and will never appear in your code or logs.

## 🚀 Step 2: Deploy Your Website

### Automatic Deployment
The website will automatically deploy when you:
1. Push changes to the `main` branch
2. Make changes to files in the `website/` directory
3. Manually trigger the workflow from GitHub Actions

### Manual Deployment
1. Go to your repository's **Actions** tab
2. Select **Deploy to Eswatini Facts Website**
3. Click **Run workflow**

## ✅ Step 3: Verify Deployment

After deployment:
1. Visit [http://eswatinifacts.org/](http://eswatinifacts.org/)
2. Check that all pages load correctly
3. Verify charts and interactive elements work
4. Test on different devices

## 🛠️ Local Testing (Optional)

To test FTP connection locally:

```bash
cd website
npm install
npm run deploy
```

**Note**: This requires setting environment variables or modifying the script temporarily.

## 📁 What Gets Deployed

The deployment includes:
- ✅ `index.html` - Main homepage
- ✅ `styles.css` - All styling
- ✅ `script.js` - Interactive functionality
- ✅ `data-sources.html` - Data sources page

The deployment excludes:
- ❌ Development files (package.json, deploy scripts)
- ❌ Git files and documentation
- ❌ Node modules and dependencies

## 🔍 Troubleshooting

### Deployment Fails
- **Check secrets**: Ensure all FTP credentials are correctly set in GitHub
- **Check server**: Verify FTP server is accessible
- **Check logs**: Review GitHub Actions logs for detailed error messages

### Website Not Loading
- **Check file paths**: Ensure files are uploaded to correct directory
- **Check index.html**: Verify index.html is in the root directory
- **Wait for propagation**: DNS changes can take up to 24 hours

### Charts Not Displaying
- **Check JavaScript**: Ensure script.js is loading correctly
- **Check Chart.js**: Verify Chart.js library is accessible
- **Check console**: Look for JavaScript errors in browser console

## 📊 Monitoring

### GitHub Actions
- Monitor deployment success in the **Actions** tab
- Check logs for any errors or warnings
- Set up notifications for failed deployments

### Website Performance
- Use Google PageSpeed Insights to monitor performance
- Set up Google Analytics for user tracking
- Monitor Core Web Vitals

## 🔄 Workflow Details

The deployment workflow:
1. **Triggers** on pushes to `main` branch with `website/` changes
2. **Checks out** your code
3. **Installs** dependencies
4. **Deploys** via FTP to your hosting server
5. **Verifies** deployment success

## 🎯 Next Steps

After successful deployment:
1. **Customize content**: Update data, add your logo, modify colors
2. **Add analytics**: Set up Google Analytics or similar
3. **Monitor performance**: Track website speed and user engagement
4. **Regular updates**: Keep data current and accurate

## 🆘 Support

### GitHub Actions Issues
- Check [GitHub Actions Documentation](https://docs.github.com/en/actions)
- Review [FTP Deploy Action](https://github.com/SamKirkland/FTP-Deploy-Action)

### Hosting Issues
- Contact your hosting provider for FTP/server issues
- Check server logs and resources

### Website Issues
- Validate HTML and CSS
- Check browser console for errors
- Test on different devices and browsers

## 🎉 Success!

Once deployed, your Eswatini Facts website will be live at [http://eswatinifacts.org/](http://eswatinifacts.org/) and will automatically update whenever you make changes to the website files.

The deployment process is:
- ✅ **Secure**: Credentials stored safely in GitHub
- ✅ **Automatic**: Deploys on every relevant change
- ✅ **Reliable**: Uses proven GitHub Actions
- ✅ **Fast**: Typically completes in 1-2 minutes

---

**Need help?** Check the troubleshooting section above or review the detailed deployment guide in `deployment-setup.md`.
