

# Implementation Plan

## Current Status

**Backend Progress:** Tasks 1-5 completed (infrastructure, authentication, user profiles, PII encryption, blog/CMS)
**Frontend Progress:** Basic visualizations exist, but need API integration and new features
**Next Priority:** Tasks 6-13 (media upload, search, newsletter, API endpoints, translations, admin, data visualization)

---

- [x] 1. Set up backend infrastructure and database





  - Create Node.js/Express project structure
  - Set up PostgreSQL database with schema
  - Configure Redis for caching and sessions
  - Set up environment configuration
  - _Requirements: 5.1, 7.1, 12.2, 12.5_

- [x] 1.1 Write property test for database schema integrity


  - **Property 33: Data import integrity**
  - **Validates: Requirements 10.4**

- [x] 2. Implement authentication system





  - Create user registration endpoint with validation
  - Implement password hashing with bcrypt
  - Create login endpoint with JWT token generation
  - Implement session management
  - Create password reset functionality
  - _Requirements: 7.1, 7.2, 12.2, 12.3_

- [x] 2.1 Write property test for registration validation


  - **Property 21: Registration validation**
  - **Validates: Requirements 7.1**

- [x] 2.2 Write property test for password hashing


  - **Property 35: Password hashing security**
  - **Validates: Requirements 12.2**

- [x] 2.3 Write property test for authentication session


  - **Property 22: Authentication session creation**
  - **Validates: Requirements 7.2**

- [x] 3. Implement user profile and saved content features





  - Create user profile data model
  - Implement bookmark/save content endpoint
  - Create remove bookmark endpoint
  - Implement get saved content endpoint
  - Create user profile view endpoint
  - _Requirements: 7.3, 7.4, 7.5_

- [x] 3.1 Write property test for bookmark persistence


  - **Property 23: Bookmark persistence**
  - **Validates: Requirements 7.3**

- [x] 3.2 Write property test for bookmark removal


  - **Property 24: Bookmark removal**
  - **Validates: Requirements 7.4**

- [x] 3.3 Write property test for profile completeness


  - **Property 25: Profile completeness**
  - **Validates: Requirements 7.5**

- [x] 4. Implement PII encryption for user data





  - Create encryption utility functions
  - Implement encryption for email addresses
  - Implement encryption for user names
  - Update database queries to encrypt/decrypt PII
  - _Requirements: 12.5_

- [x] 4.1 Write property test for PII encryption


  - **Property 36: PII encryption at rest**
  - **Validates: Requirements 12.5**

- [x] 5. Create blog/CMS system




  - Create blog post data model
  - Implement create post endpoint
  - Implement publish post endpoint
  - Implement URL slug generation
  - Create get posts endpoint with pagination
  - Implement post search integration
  - _Requirements: 4.1, 4.3, 4.5_

- [x] 5.1 Write property test for post persistence


  - **Property 11: Blog post persistence**
  - **Validates: Requirements 4.1**

- [x] 5.2 Write property test for post publication


  - **Property 12: Post publication visibility**
  - **Validates: Requirements 4.3**

- [x] 5.3 Write property test for slug uniqueness


  - **Property 13: URL slug uniqueness**
  - **Validates: Requirements 4.5**

- [x] 6. Implement media upload and optimization





  - Create image upload endpoint with multer
  - Implement image optimization (resize, compress, WebP conversion) using sharp
  - Create file storage integration (local or S3-compatible)
  - Implement alt text management in database
  - Add media routes to server
  - _Requirements: 4.2_

- [x] 7. Build backend search system








  - Create search query endpoint with full-text search
  - Implement keyword highlighting in results
  - Implement category filtering
  - Implement result sorting (relevance, date, title)
  - Create suggestion system for no results
  - Add search routes to server
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - _Note: Search index table already exists in schema, blog posts already update search index_

- [x] 7.1 Write property test for keyword highlighting


  - **Property 5: Search keyword highlighting**
  - **Validates: Requirements 2.2**

- [x] 7.2 Write property test for category filtering


  - **Property 6: Category filter correctness**
  - **Validates: Requirements 2.3**

- [x] 7.3 Write property test for result ordering


  - **Property 7: Search result ordering**
  - **Validates: Requirements 2.4**

- [x] 8. Implement newsletter subscription system





  - Create newsletter controller with subscription logic
  - Implement subscribe endpoint with email validation
  - Integrate email service (SendGrid or similar)
  - Create confirmation email sending functionality
  - Implement confirmation link handler
  - Create unsubscribe endpoint
  - Implement newsletter creation and sending for admins
  - Add newsletter routes to server
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - _Note: Database table already exists in schema_

- [x] 8.1 Write property test for email validation


  - **Property 8: Email validation correctness**
  - **Validates: Requirements 3.1**

- [x] 8.2 Write property test for subscription confirmation


  - **Property 9: Subscription confirmation round-trip**
  - **Validates: Requirements 3.3**

- [x] 8.3 Write property test for unsubscribe


  - **Property 10: Unsubscribe completeness**
  - **Validates: Requirements 3.4**

- [x] 9. Create data API endpoints





  - Create data controller for statistical data
  - Implement API key generation and management endpoints
  - Create API key authentication middleware
  - Create data endpoints (economy, health, education, politics, culture)
  - Implement filtering for API requests (date range, category, etc.)
  - Implement API versioning in routes
  - Add data routes to server
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - _Note: Rate limiting already implemented, error handling already standardized_

- [x] 9.1 Write property test for API response format


  - **Property 14: API response format**
  - **Validates: Requirements 5.1**

- [x] 9.2 Write property test for API error handling


  - **Property 15: API error handling**
  - **Validates: Requirements 5.3**

- [x] 9.3 Write property test for API filtering



  - **Property 16: API filter correctness**
  - **Validates: Requirements 5.4**

- [x] 10. Checkpoint - Ensure all backend tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement multi-language support system




  - Create translation controller
  - Implement translation storage and retrieval endpoints
  - Create language switcher API endpoint
  - Implement language detection from browser headers
  - Create translation fallback logic in retrieval
  - Implement admin translation management endpoints (create, update, delete)
  - Add translation routes to server
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - _Note: Translations table already exists in schema_

- [x] 11.1 Write property test for language switching


  - **Property 17: Language switching completeness**
  - **Validates: Requirements 6.1**

- [x] 11.2 Write property test for translation display


  - **Property 18: Translation display logic**
  - **Validates: Requirements 6.2**


- [x] 11.3 Write property test for translation fallback


  - **Property 19: Translation fallback behavior**
  - **Validates: Requirements 6.3**

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
- [x] 11.4 Write property test for translation association


  - **Property 20: Translation association**
  - **Validates: Requirements 6.5**

- [x] 12. Build admin dashboard backend










  - Create admin controller with user management endpoints (list, view, edit, deactivate)
  - Create content moderation endpoints (approve, edit, remove)
  - Implement data import endpoints with CSV/JSON validation
  - Create audit logging utility and endpoints
  - Implement dashboard statistics endpoints (user count, content metrics, system health)
  - Add admin routes to server
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - _Note: requireAdmin middleware already exists, audit_logs table already in schema_

- [x] 12.1 Write property test for content moderation






  - **Property 31: Content moderation effects**
  - **Validates: Requirements 10.2**

- [x] 12.2 Write property test for user management






  - **Property 32: User management operations**
  - **Validates: Requirements 10.3**

- [x] 12.3 Write property test for audit logging






  - **Property 34: Audit log completeness**
  - **Validates: Requirements 10.5**

- [x] 13. Implement data visualization and aggregation backend











  - Create visualization controller for data aggregation
  - Implement multi-category data aggregation endpoint
  - Implement country comparison endpoint (Eswatini vs regional neighbors)
  - Create data export endpoints (CSV, JSON formats)
  - Implement filter configuration save/load endpoints with shareable URLs
  - Add visualization routes to server
  - _Requirements: 1.4, 8.1, 8.2, 8.3, 8.4, 8.5_
  - _Note: data_points and data_sources tables already exist in schema, date range filtering already implemented in data endpoints_

- [x] 13.1 Write property test for multi-category comparison






  - **Property 26: Multi-category comparison display**
  - **Validates: Requirements 8.1**

- [x] 13.2 Write property test for time filter propagation






  - **Property 27: Time filter propagation**
  - **Validates: Requirements 8.2**

- [x] 13.3 Write property test for country comparison











  - **Property 28: Country comparison completeness**
  - **Validates: Requirements 8.3**


- [x] 13.4 Write property test for data export





  - **Property 29: Data export correctness**
  - **Validates: Requirements 8.4**

- [x] 13.5 Write property test for filter configuration






  - **Property 30: Filter configuration round-trip**
  - **Validates: Requirements 8.5**

- [-] 14. Enhance frontend interactive visualizations



  - Connect existing Chart.js implementations to backend data API endpoints
  - Enhance tooltip display with complete metadata (source, date, metric details)
  - Implement legend toggle functionality with state preservation
  - Create date range filter UI components for data pages
  - Enhance chart animations and transitions for better UX
  - Improve responsive chart sizing for mobile devices
  - Add loading states and error handling for API calls
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - _Note: Basic Chart.js visualizations with static data already exist on economy, health, education, culture pages_

- [x] 14.1 Write property test for chart rendering






  - **Property 1: Chart rendering consistency**
  - **Validates: Requirements 1.1**

- [x] 14.2 Write property test for tooltip completeness






  - **Property 2: Tooltip information completeness**
  - **Validates: Requirements 1.2**

- [x] 14.3 Write property test for legend toggle






  - **Property 3: Legend toggle behavior**
  - **Validates: Requirements 1.3**

- [ ] 15. Build comprehensive frontend search interface
  - Create dedicated search page (search.html) with search input component
  - Connect to backend search API endpoint (/api/search)
  - Implement real-time search with debouncing (500ms delay)
  - Create search results display with keyword highlighting
  - Implement category filter UI with checkboxes (Economy, Health, Education, Politics, Culture)
  - Create sort options UI (relevance, date, title)
  - Implement pagination for search results
  - Add no results state with suggestions and related topics
  - Add loading states and error handling for API calls
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - _Note: Basic local search exists in script.js but needs replacement with backend full-text search_

- [ ] 16. Implement user authentication UI
  - Create login/register page (auth.html) or modal component
  - Create registration form with client-side validation (email format, password strength)
  - Create login form with error handling and feedback
  - Implement password strength indicator with visual feedback (weak/medium/strong)
  - Create password reset request form
  - Create password reset confirmation page
  - Implement JWT token storage in localStorage with expiration handling
  - Create session management utilities (checkAuth, refreshToken, logout)
  - Add authentication state to header (show user name, profile link, logout button)
  - Create logout functionality with token cleanup
  - Connect to backend auth API endpoints (/api/auth/register, /api/auth/login, /api/auth/logout)
  - _Requirements: 7.1, 7.2, 12.2, 12.3_

- [ ] 17. Build user profile and saved content UI
  - Create user profile page (profile.html) with account overview
  - Display user account information (email, name, join date, role)
  - Implement bookmark/save buttons on content pages (blog posts, data visualizations)
  - Create saved items list with filtering by content type (blog_post, data_point, visualization)
  - Implement remove bookmark functionality with confirmation dialog
  - Create user preferences section (language, email notifications)
  - Add profile link to header when authenticated
  - Connect to backend user API endpoints (/api/user/profile, /api/user/bookmarks)
  - _Requirements: 7.3, 7.4, 7.5_

- [ ] 18. Create newsletter subscription UI
  - Enhance existing subscription forms with backend API integration
  - Add client-side email validation and error handling
  - Create subscription confirmation page (newsletter-confirm.html) for email verification
  - Create unsubscribe page (newsletter-unsubscribe.html) with confirmation
  - Add subscription success/error messages with visual feedback
  - Add subscription widgets to footer and sidebar on all pages
  - Connect to backend newsletter API endpoints (/api/newsletter/subscribe, /api/newsletter/confirm, /api/newsletter/unsubscribe)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Note: Basic subscription forms already exist in contact.html, blog.html, join.html but need backend integration_

- [ ] 19. Build admin CMS interface
  - Create admin dashboard page (admin/index.html) with navigation
  - Create admin login page with role verification (redirect non-admins)
  - Build post editor page (admin/editor.html) with rich text editor (TinyMCE or Quill)
  - Implement image upload UI with preview and alt text input
  - Create post list page (admin/posts.html) with filters (status, category, author)
  - Implement publish/schedule UI with date picker for future publishing
  - Create post preview functionality (modal or separate page)
  - Add draft auto-save functionality (every 30 seconds)
  - Implement post deletion with confirmation dialog
  - Connect to backend blog API endpoints (/api/blog/posts, /api/blog/publish, /api/media/upload)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 20. Implement language switcher UI
  - Create language selector component in header
  - Implement language switching logic with localStorage persistence
  - Add translation status indicators (badges for translated/untranslated)
  - Create fallback notices for untranslated content
  - Implement browser language detection on first visit
  - Update all UI text to use translation keys
  - Connect to backend translation API endpoints
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 21. Build data filtering and comparison UI
  - Create category selection interface with checkboxes
  - Implement time period filter controls (date range picker)
  - Create country comparison selector (multi-select dropdown)
  - Implement export buttons (CSV, JSON) with download functionality
  - Create shareable URL generation with filter parameters
  - Add filter reset functionality
  - Implement filter state persistence in URL
  - Add loading states during data fetching
  - Connect to backend visualization API endpoints
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 22. Create admin dashboard UI
  - Build dashboard overview page with statistics cards
  - Create user management interface (list, view, edit, deactivate)
  - Create content moderation interface (approve, edit, remove posts)
  - Build data import interface with file upload and validation
  - Implement audit log viewer with filtering and pagination
  - Add admin navigation menu
  - Implement role-based UI visibility
  - Connect to backend admin API endpoints
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 23. Implement visualization embedding
  - Create embed button on visualization pages
  - Implement embed code generator (iframe HTML)
  - Create dedicated embed endpoint/page for iframes
  - Add attribution footer to embedded views
  - Implement privacy-preserving view tracking (no PII)
  - Add embed preview modal
  - Create embed customization options (size, theme)
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 23.1 Write property test for embed code generation
  - **Property 37: Embed code generation**
  - **Validates: Requirements 13.1**

- [ ] 23.2 Write property test for embedded functionality
  - **Property 38: Embedded visualization functionality**
  - **Validates: Requirements 13.2**

- [ ] 23.3 Write property test for embed attribution
  - **Property 39: Embed attribution presence**
  - **Validates: Requirements 13.3**

- [ ] 23.4 Write property test for embed tracking privacy
  - **Property 40: Embed view tracking privacy**
  - **Validates: Requirements 13.5**

- [ ] 24. Optimize for mobile devices
  - Enhance responsive CSS for all new components (auth, profile, admin)
  - Implement touch-friendly controls for charts (tap, swipe, pinch-zoom)
  - Enhance collapsible mobile navigation for new pages
  - Optimize table display for mobile (horizontal scroll or card layout)
  - Implement responsive images with srcset
  - Add mobile-specific optimizations (reduced animations, smaller fonts)
  - Test on various mobile devices and screen sizes
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - _Note: Basic responsive design already exists in styles.css_

- [ ] 25. Checkpoint - Ensure all frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 26. Enhance accessibility features
  - Audit and enhance semantic HTML5 elements throughout new pages
  - Add comprehensive ARIA labels and landmarks to new components
  - Enhance keyboard navigation support (Tab, Enter, Escape, Arrow keys)
  - Add skip navigation links to new pages
  - Ensure focus indicators are visible on all interactive elements
  - Implement patterns/labels in visualizations (not just color)
  - Add captions/transcripts for video content
  - Run automated accessibility tests (axe-core)
  - Test with screen readers (NVDA, JAWS, VoiceOver)
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
  - _Note: Basic accessibility features already exist in current pages_

- [ ] 26.1 Write property test for semantic HTML
  - **Property 41: Semantic HTML structure**
  - **Validates: Requirements 15.1**

- [ ] 26.2 Write property test for keyboard navigation
  - **Property 42: Keyboard navigation completeness**
  - **Validates: Requirements 15.2**

- [ ] 26.3 Write property test for visualization accessibility
  - **Property 43: Visualization accessibility**
  - **Validates: Requirements 15.4**

- [ ] 26.4 Write property test for media alternatives
  - **Property 44: Media text alternatives**
  - **Validates: Requirements 15.5**

- [ ] 27. Implement performance optimizations
  - Configure CDN for static assets (if not already done)
  - Enhance lazy loading for images (Intersection Observer)
  - Implement code splitting for JavaScript modules
  - Create service worker for offline support and caching
  - Configure caching headers on backend responses
  - Add database indexes for frequently queried columns
  - Implement Redis caching for API responses with TTL
  - Minify and bundle JavaScript/CSS for production
  - Optimize images with WebP format
  - Add resource hints (preconnect, prefetch, preload)
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - _Note: Basic lazy loading already exists in script.js_

- [ ] 28. Enhance security measures
  - Configure HTTPS with TLS 1.2+ on production server
  - Implement CSRF protection middleware
  - Add Content Security Policy headers to server
  - Verify rate limiting on all endpoints
  - Add input sanitization middleware
  - Configure secure session cookies (httpOnly, secure, sameSite)
  - Add security headers (X-Frame-Options, X-Content-Type-Options, etc.)
  - Implement request validation middleware
  - _Requirements: 12.1, 12.3, 12.4_
  - _Note: Helmet, CORS, and rate limiting already configured_

- [ ] 29. Enhance CI/CD pipeline
  - Update GitHub Actions workflow for backend
  - Configure automated testing (unit, property, integration tests)
  - Implement staging deployment for backend
  - Update production deployment for full stack
  - Configure automatic rollback on failure
  - Implement smoke tests for critical paths
  - Add deployment notifications
  - _Requirements: 14.1, 14.2, 14.3_
  - _Note: GitHub Actions already exists for frontend deployment_

- [ ] 30. Set up monitoring and alerting
  - Configure error logging service (Sentry or similar)
  - Set up performance monitoring (response times, memory, CPU)
  - Enhance health check endpoints with detailed status
  - Configure alert rules (error rate, response time, downtime)
  - Set up uptime monitoring service (UptimeRobot or similar)
  - Add logging middleware for request tracking
  - Implement metrics collection endpoint
  - _Requirements: 14.4, 14.5_
  - _Note: Basic health check endpoint already exists_

- [ ] 31. Create API documentation
  - Create API documentation page (api-docs.html or use Swagger/OpenAPI)
  - Document all API endpoints with request/response examples
  - Create authentication guide with JWT token usage
  - Add code examples for common use cases (JavaScript, Python, cURL)
  - Document rate limits and error codes
  - Create API versioning guide
  - Add interactive API explorer (optional)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 32. Write user documentation
  - Create user guide page for main features
  - Document search functionality with tips
  - Create guide for account creation and saving content
  - Document newsletter subscription process
  - Create accessibility guide with keyboard shortcuts
  - Add FAQ section
  - _Requirements: 2.1, 3.1, 7.3, 15.1_

- [ ] 33. Write admin documentation
  - Create CMS user guide with screenshots
  - Document content moderation workflow
  - Create data import guide with CSV/JSON format examples
  - Document user management procedures
  - Create translation management guide
  - Add troubleshooting section
  - _Requirements: 4.1, 6.5, 10.2, 10.3, 10.4_

- [ ] 34. Final checkpoint - Comprehensive testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 35. Perform security audit
  - Review authentication implementation for vulnerabilities
  - Test for SQL injection vulnerabilities (automated and manual)
  - Test for XSS vulnerabilities in all input fields
  - Verify CSRF protection on state-changing operations
  - Test rate limiting effectiveness
  - Review encryption implementation and key management
  - Test session management security
  - Verify secure headers configuration
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 36. Conduct accessibility audit
  - Run automated accessibility tests (axe-core, WAVE)
  - Perform manual keyboard navigation testing on all pages
  - Test with screen readers (NVDA, JAWS, VoiceOver)
  - Verify color contrast ratios meet WCAG 2.1 AA
  - Test at 200% zoom without layout breaking
  - Test with high contrast mode
  - Verify focus indicators on all interactive elements
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 37. Performance testing and optimization
  - Run Lighthouse audits on all pages
  - Test page load times on 3G and 4G connections
  - Identify and optimize slow database queries
  - Review and optimize JavaScript bundle sizes
  - Test under load with load testing tool (k6, Artillery)
  - Optimize images and assets
  - Verify caching effectiveness
  - _Requirements: 11.1, 11.2, 11.3_

- [ ] 38. Cross-browser and device testing
  - Test on Chrome (latest and previous version)
  - Test on Firefox (latest and previous version)
  - Test on Safari (latest)
  - Test on Edge (latest)
  - Test on iOS devices (iPhone, iPad)
  - Test on Android devices (various screen sizes)
  - Test on tablets (iPad, Android tablets)
  - Verify responsive design at all breakpoints
  - Test touch interactions on mobile
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 39. Prepare for launch
  - Create comprehensive deployment checklist
  - Set up production database with proper credentials
  - Configure production environment variables (.env)
  - Set up SSL certificates (Let's Encrypt or commercial)
  - Configure DNS records for backend API
  - Create automated backup strategy for database
  - Set up database replication (optional)
  - Configure production logging
  - Prepare rollback plan
  - _Requirements: 12.1, 14.1, 14.2_

- [ ] 40. Final checkpoint - Production readiness
  - Ensure all tests pass, ask the user if questions arise.
