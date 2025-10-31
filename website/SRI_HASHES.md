# Subresource Integrity (SRI) Hashes

This document contains the SRI hashes for external scripts used on the website.

## How to Generate SRI Hashes

### Method 1: Using Online Tool
1. Visit: https://www.srihash.org/
2. Paste the CDN URL
3. Select SHA-384
4. Copy the generated hash

### Method 2: Using Command Line
```bash
# For Chart.js
curl -s https://cdn.jsdelivr.net/npm/chart.js | openssl dgst -sha384 -binary | openssl base64 -A

# For Plotly.js 2.26.0
curl -s https://cdn.jsdelivr.net/npm/plotly.js-dist@2.26.0/plotly.min.js | openssl dgst -sha384 -binary | openssl base64 -A
```

### Method 3: Using PowerShell (Windows)
```powershell
# Download and hash Chart.js
$url = "https://cdn.jsdelivr.net/npm/chart.js"
$content = Invoke-WebRequest -Uri $url -UseBasicParsing
$hash = [System.Security.Cryptography.SHA384]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($content.Content))
[Convert]::ToBase64String($hash)
```

## Current Status

### Chart.js
- **URL:** `https://cdn.jsdelivr.net/npm/chart.js`
- **Status:** ⚠️ TODO - Hash needs to be generated
- **Instructions:**
  1. Generate SHA-384 hash using one of the methods above
  2. Update all HTML files that load Chart.js
  3. Add `integrity="sha384-GENERATED_HASH_HERE"` attribute

### Plotly.js 2.26.0
- **URL:** `https://cdn.jsdelivr.net/npm/plotly.js-dist@2.26.0/plotly.min.js`
- **Status:** ⚠️ TODO - Hash needs to be generated
- **Instructions:**
  1. Generate SHA-384 hash using one of the methods above
  2. Update all HTML files that load Plotly.js
  3. Add `integrity="sha384-GENERATED_HASH_HERE"` attribute

## Files That Need Updates

Update these files after generating hashes:
- `website/index.html`
- `website/about.html`
- `website/economy.html`
- `website/health.html`
- `website/education.html`
- `website/culture.html`
- `website/politics.html`
- `website/videos.html`
- Any other pages using these libraries

## Example Update Format

**Before:**
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js" 
        crossorigin="anonymous" 
        defer></script>
```

**After:**
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js" 
        integrity="sha384-XXXXXXXXXXXXX..." 
        crossorigin="anonymous" 
        defer></script>
```

## Security Note

SRI hashes ensure that the browser verifies the integrity of external scripts before execution, protecting against CDN compromise. Always generate fresh hashes when updating library versions.

