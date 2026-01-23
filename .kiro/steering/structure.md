# Project Structure

## Root Directory

```
/
├── .github/                 # GitHub Actions workflows
├── .kiro/                   # Kiro configuration and specs
├── analysis/                # Research analysis documents
├── data/                    # Research data and analysis
│   ├── contemporary_events/
│   ├── media_analysis/
│   ├── primary_sources/
│   ├── statistical_analysis/
│   └── visual_documentation/
├── Eswatini/               # Media assets (videos, images, PDFs)
│   ├── images/             # Photo documentation
│   ├── Eswatini Leaks/     # Investigative content
│   ├── Pronounce/          # Pronunciation guides
│   ├── short vids/         # Short-form video content
│   └── Vid*/               # Video project folders
├── findings/               # Organized research findings
│   ├── contemporary/
│   ├── culture/
│   ├── economy/
│   ├── geography/
│   ├── health/
│   ├── history/
│   └── politics/
├── resources/              # Key resources documentation
├── secure-config/          # Deployment configuration (credentials excluded)
├── website/                # Production website files
│   ├── components/         # Reusable UI components
│   ├── scripts/            # Build and utility scripts
│   └── templates/          # HTML templates
├── package.json            # Node.js dependencies
└── README.md               # Project documentation
```

## Website Directory (`website/`)

This is the deployable website code:

```
website/
├── components/
│   ├── header.html         # Site navigation
│   ├── footer.html         # Site footer
│   └── component-loader.js # Component loading logic
├── scripts/
│   └── template-manager.js # Template processing
├── templates/
│   └── base.html           # Base HTML template
├── index.html              # Homepage
├── about.html              # About page
├── economy.html            # Economy data page
├── health.html             # Health data page
├── education.html          # Education data page
├── politics.html           # Politics page
├── culture.html            # Culture page
├── data-sources.html       # Data sources and methodology
├── contact.html            # Contact form
├── join.html               # Contribution form
├── videos.html             # Video content page
├── blog.html               # Blog page
├── donate.html             # Donation page
├── styles.css              # Global stylesheet
├── script.js               # Main JavaScript
├── .htaccess               # Apache configuration
├── robots.txt              # SEO robots file
└── sitemap.xml             # SEO sitemap
```

## Data Organization

### Research Data (`data/`)

- **contemporary_events/** - Current events analysis
- **media_analysis/** - Media coverage analysis
- **primary_sources/** - Government documents, speeches
- **statistical_analysis/** - Economic and demographic data
- **visual_documentation/** - Photo analysis and documentation

### Findings (`findings/`)

Organized by topic with `overview.md` files:
- Contemporary issues
- Cultural aspects
- Economic indicators
- Geographic information
- Health statistics
- Historical context
- Political system

## Media Assets (`Eswatini/`)

- Raw video files and projects
- Image documentation
- PDF documents
- Audio pronunciation guides
- Video editing projects organized by topic

## Configuration Files

- `.gitignore` - Git exclusions
- `package.json` - Node.js project configuration
- `robots.txt` - SEO configuration
- `sitemap.xml` - SEO sitemap
- `.htaccess` - Apache server configuration

## Documentation

- `README.md` - Main project documentation
- `DEPLOYMENT.md` - Deployment guide
- `CODE_REVIEW_REPORT.md` - Code review findings
- `CONTACT_FORM_*.md` - Contact form documentation
- `FINAL_OPTIMIZATION_REPORT.md` - Optimization report
- `research_framework.md` - Research methodology

## Conventions

### File Naming

- HTML pages: lowercase with hyphens (e.g., `data-sources.html`)
- JavaScript: camelCase (e.g., `component-loader.js`)
- CSS: single file (`styles.css`)
- Markdown: UPPERCASE for root docs, lowercase for nested

### Code Organization

- One main CSS file with CSS variables
- One main JavaScript file with modular functions
- Components separated into `components/` directory
- Build scripts in `scripts/` directory

### Asset Management

- Images optimized via `npm run optimize-images`
- Media files stored in `Eswatini/` directory
- Research data separate from website code
