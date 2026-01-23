# Technology Stack

## Core Technologies

- **HTML5** - Semantic markup with accessibility features
- **CSS3** - Modern styling with CSS variables for theming
- **JavaScript (ES6+)** - Vanilla JS, no framework dependencies
- **Chart.js** - Data visualization library
- **Plotly.js** - Advanced interactive charts

## Build System

### Dependencies

```json
{
  "sharp": "^0.33.2"  // Image optimization
}
```

### Common Commands

```bash
# Optimize images
npm run optimize-images

# Apply HTML templates
npm run apply-templates

# Full build
npm run build
```

## Deployment

- **Platform**: FTP deployment to production server
- **CI/CD**: GitHub Actions (automatic on push to main)
- **Production URL**: https://eswatinifacts.org

### Deployment Files

- `.github/workflows/` - GitHub Actions configuration
- `secure-config/` - Deployment scripts (credentials NOT in repo)
- `DEPLOYMENT.md` - Deployment documentation

## Architecture Patterns

### Component-Based Structure

- Reusable header/footer components loaded via `component-loader.js`
- Reduces code duplication across pages
- Components stored in `website/components/`

### File Organization

```
website/
├── components/          # Reusable UI components
│   ├── header.html
│   ├── footer.html
│   └── component-loader.js
├── scripts/            # Utility scripts
│   └── template-manager.js
├── *.html              # Page files
├── styles.css          # Global styles
└── script.js           # Main JavaScript
```

### CSS Architecture

- CSS variables for theming (`:root` in styles.css)
- Mobile-first responsive design
- Breakpoints: 768px (mobile), 1200px (desktop)
- Design system with consistent spacing, colors, shadows

### JavaScript Patterns

- Module pattern with initialization functions
- Event delegation for dynamic content
- Intersection Observer for lazy loading and animations
- Production/development mode detection
- Centralized logger utility

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Optimizations

- Lazy loading images with Intersection Observer
- Debounced resize events
- Chart.js responsive mode
- Minimal external dependencies
- Optimized images via Sharp

## Accessibility

- Semantic HTML5 elements
- ARIA labels and roles
- Keyboard navigation support
- Skip links for screen readers
- Alt text for all images
- Focus management
