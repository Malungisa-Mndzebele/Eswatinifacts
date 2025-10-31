# Contact Form Email Routing Setup Guide

The contact form on `/contact` page now supports routing messages to different email addresses based on the selected subject/topic.

## Email Routing Map

The form routes messages as follows:

- **Data Question** → `data@eswatinifacts.org`
- **Error Report** → `issues@eswatinifacts.org`
- **Collaboration Request** → `data@eswatinifacts.org`
- **Media Inquiry** → `media@eswatinifacts.org`
- **General Question** → `info@eswatinifacts.org`
- **Other** → `info@eswatinifacts.org`

## Setup Options

The form supports three methods for sending emails (in order of preference):

### Option 1: Formspree (Recommended - Easiest)

Formspree is a free service that handles form submissions without requiring any backend code.

**Setup Steps:**

1. Go to [Formspree.io](https://formspree.io/) and create a free account
2. Create **4 separate forms** (one for each email address):
   - Form for `data@eswatinifacts.org`
   - Form for `issues@eswatinifacts.org`
   - Form for `media@eswatinifacts.org`
   - Form for `info@eswatinifacts.org`
3. For each form, configure the recipient email in the Formspree dashboard
4. Copy the form IDs (they look like `https://formspree.io/f/xxxxx` or just `xxxxx`)
5. Open `website/script.js` and find the `FORMPREE_ENDPOINTS` object (around line 822)
6. Replace the placeholder values with your actual Formspree form IDs:

```javascript
const FORMPREE_ENDPOINTS = {
    'data@eswatinifacts.org': 'your-actual-form-id-here',
    'issues@eswatinifacts.org': 'your-actual-form-id-here',
    'media@eswatinifacts.org': 'your-actual-form-id-here',
    'info@eswatinifacts.org': 'your-actual-form-id-here'
};
```

**Free Tier Limits:**
- 50 submissions per month (free tier)
- Can upgrade for more submissions

### Option 2: EmailJS

EmailJS allows you to send emails directly from the browser using your email service provider (Gmail, Outlook, etc.).

**Setup Steps:**

1. Go to [EmailJS.com](https://www.emailjs.com/) and create a free account
2. Add an email service (Gmail, Outlook, etc.)
3. Create an email template with the following variables:
   - `{{to_email}}` - Recipient email
   - `{{from_name}}` - Sender name
   - `{{from_email}}` - Sender email
   - `{{subject}}` - Email subject
   - `{{message}}` - Message content
   - `{{newsletter}}` - Newsletter subscription status
4. Note your **Service ID** and **Template ID**
5. Open `website/contact.html` and uncomment the EmailJS script section (around line 235)
6. Replace `YOUR_PUBLIC_KEY` with your EmailJS public key
7. Open `website/script.js` and find the `sendViaEmailJS` function (around line 850)
8. Replace `YOUR_SERVICE_ID` and `YOUR_TEMPLATE_ID` with your actual IDs

**Free Tier Limits:**
- 200 emails per month (free tier)
- Can upgrade for more emails

### Option 3: Mailto (Fallback)

If neither Formspree nor EmailJS is configured, the form will fall back to using `mailto:` links. This opens the user's email client with a pre-filled message. This method:

- ✅ Always works (no setup required)
- ✅ Routes to correct email automatically
- ❌ Requires user's email client to be configured
- ❌ Not ideal for user experience

## Testing

After setup:

1. Test each subject option to ensure messages route correctly
2. Check that emails arrive at the intended addresses
3. Verify that form validation works correctly
4. Test the newsletter subscription checkbox

## Troubleshooting

**Form not sending emails:**
- Check browser console for errors
- Verify Formspree/EmailJS credentials are correct
- Ensure CORS is enabled if using custom endpoints
- Check that email addresses are valid

**Emails going to wrong address:**
- Verify the `EMAIL_ROUTING` object in `website/script.js` matches your needs
- Check Formspree form configurations in dashboard
- Ensure subject values match the routing map

**Form shows success but no email received:**
- Check spam/junk folder
- Verify email service is configured correctly
- Check Formspree/EmailJS dashboard for submission logs
- Verify recipient email addresses are valid

## Security Notes

- Never commit Formspree form IDs or EmailJS credentials to public repositories
- Use environment variables or a config file that's excluded from version control
- Consider rate limiting to prevent spam
- Use reCAPTCHA or similar to prevent bot submissions

## Implementation Details

The email routing logic is in `website/script.js`:
- `EMAIL_ROUTING` object maps subject values to email addresses
- `sendContactEmail()` function determines which method to use
- Falls back gracefully if preferred method is unavailable

