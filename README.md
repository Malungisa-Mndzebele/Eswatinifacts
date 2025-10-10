# Eswatini Facts Website

A comprehensive data platform providing nonpartisan, data-driven insights about the Kingdom of Eswatini.

## Overview

Eswatini Facts is a USAFacts-inspired data transparency platform that provides accurate, up-to-date information about Eswatini's:
- Economy
- Health
- Education
- Politics
- Culture

## Website Structure

### Main Pages
- **Home** (`/`) - Overview and key statistics
- **Economy** (`/economy`) - Economic indicators and analysis
- **Health** (`/health`) - Healthcare statistics and trends
- **Education** (`/education`) - Educational system data
- **Politics** (`/politics`) - Political system and governance
- **Culture** (`/culture`) - Demographics and cultural insights
- **Data Sources** (`/data-sources`) - Information sources and methodology
- **About** (`/about`) - Project information
- **Contact** (`/contact`) - Get in touch
- **Join Us** (`/join`) - Contribute to the project
- **Videos** (`/videos`) - Educational video content

### Components
The website uses a component-based architecture for consistent layout:
- Header (Navigation)
- Footer
- Dynamic content sections

### Features
- Responsive design
- Interactive data visualizations
- Real-time search functionality
- Category filtering for videos
- Contact and join forms
- Cross-browser compatibility

## Technology Stack

- HTML5
- CSS3 (with CSS Variables for theming)
- JavaScript (ES6+)
- Chart.js for data visualization
- YouTube API for video embedding

## Development

### Project Structure
```
website/
├── components/
│   ├── header.html
│   ├── footer.html
│   └── component-loader.js
├── index.html
├── about.html
├── economy.html
├── health.html
├── education.html
├── politics.html
├── culture.html
├── data-sources.html
├── contact.html
├── join.html
├── videos.html
├── styles.css
└── script.js
```

### Design System
The website uses a comprehensive design system with CSS variables for:
- Colors
- Typography
- Spacing
- Shadows
- Border radius
- Transitions
- Z-index scale

## Deployment

The website is automatically deployed using GitHub Actions:
- Pushes to main branch trigger deployment
- FTP deployment to production server
- Clean slate deployment (removes old files)

### Production URL
- Website: [https://eswatinifacts.org](https://eswatinifacts.org)
- YouTube Channel: [@Eswatiniinfo](https://www.youtube.com/@Eswatiniinfo)

## Maintenance

### Content Updates
1. Edit relevant HTML files
2. Update data in JavaScript files
3. Push changes to main branch
4. Automatic deployment will handle the rest

### Style Updates
1. Use CSS variables in `styles.css`
2. Maintain consistent spacing and colors
3. Follow responsive design patterns

### Adding New Content
1. Use existing components
2. Follow established patterns
3. Maintain responsive design
4. Test across browsers

## YouTube Integration

The website features video content from our YouTube channel:
- Current subscribers: 2
- Total videos: 5
- Topics covered: Economy, Politics, Culture

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## Performance

The website is optimized for:
- Fast loading times
- Smooth animations
- Responsive interactions
- Efficient resource loading

## Contributing

To contribute to this project:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

All rights reserved. © 2025 Eswatini Facts.