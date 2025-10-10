# Deployment Guide

## Overview
This website is automatically deployed using GitHub Actions. When changes are pushed to the main branch, they are automatically deployed to the production server.

## Required Secrets
The following secrets must be configured in GitHub Actions:
- `FTP_SERVER`
- `FTP_USERNAME`
- `FTP_PASSWORD`
- `FTP_PORT`

⚠️ **IMPORTANT**: Never commit these credentials to the repository. Always use GitHub Secrets.

## How to Configure Secrets

1. Go to your GitHub repository
2. Click **Settings**
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each required secret

## Deployment Process

1. Push changes to main branch
2. GitHub Actions workflow triggers automatically
3. Files are deployed via FTP
4. Deployment status is reported in Actions tab

## Troubleshooting

If deployment fails:
1. Check GitHub Actions logs
2. Verify secrets are configured correctly
3. Ensure files are in correct location
4. Contact administrator for FTP issues

## Security Notes

- Keep credentials secure
- Never share or expose secrets
- Use environment variables
- Regular credential rotation recommended
