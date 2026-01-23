/**
 * Eswatini Facts - Forms Handling
 */

import { logger } from './utils.js';

// Email routing mapping based on subject selection
const EMAIL_ROUTING = {
    'data-question': 'data@eswatinifacts.com',
    'error-report': 'issues@eswatinifacts.com',
    'collaboration': 'data@eswatinifacts.com',
    'media-inquiry': 'media@eswatinifacts.com',
    'general': 'info@eswatinifacts.com',
    'other': 'info@eswatinifacts.com'
};

// CSRF Token Generation (Simple client-side token)
function generateCSRFToken() {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    // Store token in sessionStorage
    sessionStorage.setItem('csrf_token', token);
    sessionStorage.setItem('csrf_token_time', Date.now().toString());

    return token;
}

// Validate CSRF Token
function validateCSRFToken(token) {
    const storedToken = sessionStorage.getItem('csrf_token');
    const tokenTime = sessionStorage.getItem('csrf_token_time');

    // Token expires after 1 hour
    if (!storedToken || !tokenTime) {
        return false;
    }

    const timeDiff = Date.now() - parseInt(tokenTime, 10);
    if (timeDiff > 3600000) { // 1 hour
        sessionStorage.removeItem('csrf_token');
        sessionStorage.removeItem('csrf_token_time');
        return false;
    }

    return storedToken === token;
}

// Contact Form Functionality
export function initializeContactForm() {
    const contactForm = document.getElementById('contactForm');
    const formSuccess = document.getElementById('formSuccess');

    if (contactForm) {
        // Generate and add CSRF token
        const csrfToken = generateCSRFToken();
        let csrfInput = contactForm.querySelector('input[name="csrf_token"]');
        if (!csrfInput) {
            csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrf_token';
            csrfInput.value = csrfToken;
            contactForm.appendChild(csrfInput);
        } else {
            csrfInput.value = csrfToken;
        }

        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const submitBtn = this.querySelector('.submit-btn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');

            // Validate CSRF token
            const formToken = this.querySelector('input[name="csrf_token"]')?.value;
            if (!formToken || !validateCSRFToken(formToken)) {
                alert('Security validation failed. Please refresh the page and try again.');
                // Regenerate token
                const newToken = generateCSRFToken();
                this.querySelector('input[name="csrf_token"]').value = newToken;
                return;
            }

            // Validate form
            if (!validateContactForm(this)) {
                return;
            }

            // Show loading state
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
            submitBtn.disabled = true;

            // Collect form data
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);

            // Get the recipient email based on subject
            const subject = data.subject;
            const recipientEmail = EMAIL_ROUTING[subject] || 'info@eswatinifacts.com';

            // Send email using EmailJS or Formspree
            sendContactEmail(data, recipientEmail, function (success, method) {
                if (success) {
                    // Check if using mailto fallback
                    const isMailtoFallback = method === 'mailto';

                    // Hide form and show success message
                    contactForm.style.display = 'none';
                    formSuccess.style.display = 'block';

                    // Update success message if using mailto
                    if (isMailtoFallback) {
                        const successP = formSuccess.querySelector('p');
                        const noticeP = formSuccess.querySelector('#emailMethodNotice');
                        const subjectLabel = getSubjectLabel(data.subject);

                        if (successP) {
                            successP.innerHTML = 'Your default email client should open with a pre-filled message to <strong>' +
                                recipientEmail + '</strong>. Please click "Send" in your email client to complete the submission.';
                        }

                        if (noticeP) {
                            noticeP.style.display = 'block';
                            noticeP.innerHTML = '<strong>Note:</strong> If your email client didn\'t open automatically, ' +
                                'please send your message directly to <a href="mailto:' + recipientEmail +
                                '" style="color: #2563eb; font-weight: 600;">' + recipientEmail + '</a> ' +
                                'with the subject: "' + subjectLabel + '"';
                        }
                    } else {
                        // Show recipient email in success message for other methods
                        const successP = formSuccess.querySelector('p');
                        if (successP) {
                            successP.innerHTML = 'Thank you for contacting us. Your message has been sent to <strong>' +
                                recipientEmail + '</strong>. We\'ll get back to you as soon as possible.';
                        }
                    }

                    // Scroll to success message
                    formSuccess.scrollIntoView({ behavior: 'smooth' });

                    // Reset form (but keep it hidden)
                    contactForm.reset();
                } else {
                    // Show error message with fallback option
                    const errorMsg = 'There was an error sending your message. ' +
                        'Please try again or email us directly at: ' + recipientEmail;
                    alert(errorMsg);
                }

                // Reset form state
                btnText.style.display = 'block';
                btnLoading.style.display = 'none';
                submitBtn.disabled = false;
            });
        });

        // Add real-time validation
        addFormValidation(contactForm);
    }
}

// Join Form Functionality
export function initializeJoinForm() {
    const joinForm = document.getElementById('joinForm');
    const formSuccess = document.getElementById('formSuccess');

    if (joinForm) {
        // Generate and add CSRF token
        const csrfToken = generateCSRFToken();
        let csrfInput = joinForm.querySelector('input[name="csrf_token"]');
        if (!csrfInput) {
            csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrf_token';
            csrfInput.value = csrfToken;
            joinForm.appendChild(csrfInput);
        } else {
            csrfInput.value = csrfToken;
        }

        joinForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const submitBtn = this.querySelector('.submit-btn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');

            // Validate CSRF token
            const formToken = this.querySelector('input[name="csrf_token"]')?.value;
            if (!formToken || !validateCSRFToken(formToken)) {
                alert('Security validation failed. Please refresh the page and try again.');
                // Regenerate token
                const newToken = generateCSRFToken();
                this.querySelector('input[name="csrf_token"]').value = newToken;
                return;
            }

            // Validate form
            if (!validateJoinForm(this)) {
                return;
            }

            // Show loading state
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
            submitBtn.disabled = true;

            // Collect form data
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);

            // Simulate form submission (replace with actual form handling)
            setTimeout(() => {
                // Hide form and show success message
                joinForm.style.display = 'none';
                formSuccess.style.display = 'block';

                // Reset form state
                btnText.style.display = 'block';
                btnLoading.style.display = 'none';
                submitBtn.disabled = false;

                // Log form data (in production, send to server)
                logger.log('Join application submitted:', data);

                // Scroll to success message
                formSuccess.scrollIntoView({ behavior: 'smooth' });
            }, 2000);
        });

        // Add real-time validation
        addJoinFormValidation(joinForm);
    }
}

// Internal Helper Functions (not exported)

function sendContactEmail(formData, recipientEmail, callback) {
    // Check for Formspree IDs or other config
    // ... (This function is simplified from original for modularity, actual implementation below)

    // IMPORTANT: Replace these with your actual Formspree form IDs
    const FORMPREE_ENDPOINTS = {
        'data@eswatinifacts.com': 'YOUR_FORMSPREE_FORM_ID_DATA',
        'issues@eswatinifacts.com': 'YOUR_FORMSPREE_FORM_ID_ISSUES',
        'media@eswatinifacts.com': 'YOUR_FORMSPREE_FORM_ID_MEDIA',
        'info@eswatinifacts.com': 'YOUR_FORMSPREE_FORM_ID_INFO'
    };

    const isConfigured = (endpoint) => {
        return endpoint &&
            typeof endpoint === 'string' &&
            !endpoint.startsWith('YOUR_') &&
            endpoint.length > 10;
    };

    const formspreeId = FORMPREE_ENDPOINTS[recipientEmail] || FORMPREE_ENDPOINTS['info@eswatinifacts.com'];

    if (!isConfigured(formspreeId)) {
        logger.warn('Formspree endpoints not configured. Using mailto fallback.');
    }

    // Check if Formspree is available
    if (isConfigured(formspreeId)) {
        sendViaFormspree(formData, recipientEmail, formspreeId, (success) => callback(success, 'formspree'));
        return;
    }

    // Check if EmailJS is available
    if (typeof emailjs !== 'undefined' && typeof emailjs.send === 'function') {
        sendViaEmailJS(formData, recipientEmail, (success) => callback(success, 'emailjs'));
        return;
    }

    // Fallback to mailto
    sendViaMailto(formData, recipientEmail);
    callback(true, 'mailto');
}

function sendViaFormspree(formData, recipientEmail, formspreeId, callback) {
    const endpoint = formspreeId.startsWith('http') ? formspreeId : `https://formspree.io/f/${formspreeId}`;

    const formPayload = {
        _replyto: formData.email,
        name: formData.name,
        email: formData.email,
        subject: getSubjectLabel(formData.subject),
        message: formData.message,
        newsletter: formData.newsletter ? 'Yes' : 'No',
        recipient_email: recipientEmail
    };

    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(formPayload)
    })
        .then(response => {
            if (response.ok) {
                logger.log('Email sent successfully via Formspree to', recipientEmail);
                callback(true);
            } else {
                return response.json().then(err => {
                    const errorMsg = err.error || 'Formspree submission failed';
                    logger.error('Formspree error:', errorMsg);
                    throw new Error(errorMsg);
                });
            }
        })
        .catch(error => {
            logger.error('Formspree send failed:', error);
            sendViaMailto(formData, recipientEmail);
            callback(true, 'mailto');
        });
}

function sendViaEmailJS(formData, recipientEmail, callback) {
    // Placeholder configuration
    const SERVICE_ID = 'YOUR_SERVICE_ID';
    const TEMPLATE_ID = 'YOUR_TEMPLATE_ID';

    const templateParams = {
        to_email: recipientEmail,
        from_name: formData.name,
        from_email: formData.email,
        subject: getSubjectLabel(formData.subject),
        message: formData.message,
        newsletter: formData.newsletter ? 'Yes' : 'No'
    };

    if (SERVICE_ID.startsWith('YOUR_') || TEMPLATE_ID.startsWith('YOUR_')) {
        logger.warn('EmailJS not configured. Falling back to mailto.');
        sendViaMailto(formData, recipientEmail);
        callback(true, 'mailto');
        return;
    }

    emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams)
        .then(function (response) {
            logger.log('Email sent successfully:', response.status, response.text);
            callback(true, 'emailjs');
        }, function (error) {
            logger.error('Email send failed:', error);
            sendViaMailto(formData, recipientEmail);
            callback(true, 'mailto');
        });
}

function sendViaMailto(formData, recipientEmail) {
    try {
        const subject = encodeURIComponent(getSubjectLabel(formData.subject));
        const body = encodeURIComponent(
            `From: ${formData.name} (${formData.email})\n\n` +
            `Message:\n${formData.message}\n\n` +
            `Newsletter subscription: ${formData.newsletter ? 'Yes' : 'No'}`
        );

        const mailtoLink = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;

        const mailtoWindow = window.open(mailtoLink, '_self');

        if (!mailtoWindow || typeof mailtoWindow === 'undefined') {
            window.location.href = mailtoLink;
        }

        logger.info('Mailto link generated for:', recipientEmail);
    } catch (error) {
        logger.error('Error creating mailto link:', error);
        alert(`Unable to open email client automatically. Please send your message to: ${recipientEmail}\n\n` +
            `Subject: ${getSubjectLabel(formData.subject)}\n\n` +
            `Message:\n${formData.message}`);
    }
}

function getSubjectLabel(subjectValue) {
    const subjectLabels = {
        'data-question': 'Data Question',
        'error-report': 'Error Report',
        'collaboration': 'Collaboration Request',
        'media-inquiry': 'Media Inquiry',
        'general': 'General Question',
        'other': 'Other'
    };
    return subjectLabels[subjectValue] || 'General Question';
}

function validateContactForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showFieldError(field, 'This field is required');
            isValid = false;
        } else {
            clearFieldError(field);
        }
    });

    const emailField = form.querySelector('#email');
    if (emailField && emailField.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailField.value)) {
            showFieldError(emailField, 'Please enter a valid email address');
            isValid = false;
        }
    }

    return isValid;
}

function validateJoinForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showFieldError(field, 'This field is required');
            isValid = false;
        } else {
            clearFieldError(field);
        }
    });

    const emailField = form.querySelector('#email');
    if (emailField && emailField.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailField.value)) {
            showFieldError(emailField, 'Please enter a valid email address');
            isValid = false;
        }
    }

    const interests = form.querySelectorAll('input[name="interests"]:checked');
    if (interests.length === 0) {
        const interestsLabel = form.querySelector('label[for="interests"]');
        showFieldError(interestsLabel, 'Please select at least one area of interest');
        isValid = false;
    }

    const agreeCheckbox = form.querySelector('#agree');
    if (agreeCheckbox && !agreeCheckbox.checked) {
        showFieldError(agreeCheckbox, 'You must agree to the terms and privacy policy');
        isValid = false;
    }

    return isValid;
}

function showFieldError(field, message) {
    clearFieldError(field);

    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.color = '#1e3a8a';
    errorDiv.style.fontSize = '0.875rem';
    errorDiv.style.marginTop = '0.25rem';

    field.style.borderColor = '#1e3a8a';
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(field) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    field.style.borderColor = '#e1e8ed';
}

function addFormValidation(form) {
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', function () {
            if (this.hasAttribute('required') && !this.value.trim()) {
                showFieldError(this, 'This field is required');
            } else {
                clearFieldError(this);
            }
        });

        input.addEventListener('input', function () {
            if (this.style.borderColor === 'rgb(231, 76, 60)') {
                clearFieldError(this);
            }
        });
    });
}

function addJoinFormValidation(form) {
    // Re-use logic for input validation
    addFormValidation(form);

    // Special checkboxes logic
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            if (this.style.borderColor === 'rgb(231, 76, 60)') {
                clearFieldError(this);
            }
        });
    });
}
