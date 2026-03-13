# CiteFinder - Citation Detection Web App

## Project Overview
- **Type**: Single-page web application
- **Core functionality**: Analyze text input, identify sentences requiring citations, retrieve real BibTeX entries from scholarly APIs
- **Target users**: Academic researchers, students writing papers

## UI/UX Specification

### Layout Structure
- **Header**: App title + minimal tagline
- **Main content**: 
  - Left: Text input area (large textarea)
  - Right: Results panel (citations found)
- **Footer**: Minimal credits

### Responsive Breakpoints
- Mobile (<768px): Stacked layout (input above results)
- Desktop (≥768px): Two-column side-by-side

### Visual Design

#### Color Palette (Unified - "Ink Blue" theme)
- **Primary**: `#1e3a5f` (deep ink blue)
- **Secondary**: `#f8fafc` (off-white background)
- **Accent**: `#3b82f6` (bright blue for highlights)
- **Text Primary**: `#1e293b` (dark slate)
- **Text Secondary**: `#64748b` (muted gray)
- **Border**: `#e2e8f0` (light gray)
- **Success**: `#10b981` (green for valid citations)
- **Warning**: `#f59e0b` (amber for uncertain)

#### Typography
- **Font Family**: "Inter", system-ui, sans-serif
- **Headings**: 600 weight, clean
- **Body**: 400 weight, readable line-height (1.6)
- **Code/BibTeX**: "JetBrains Mono", monospace

#### Spacing
- Base unit: 4px
- Container padding: 24px
- Card padding: 16px
- Gap between elements: 16px

#### Visual Effects
- Subtle box-shadow on cards: `0 1px 3px rgba(0,0,0,0.1)`
- Smooth transitions: 200ms ease
- Hover states on interactive elements
- No gradients, no flashy animations

### Components

1. **TextInput**
   - Large textarea with placeholder
   - Character/word count
   - "Analyze" button (primary style)

2. **CitationCard**
   - Sentence that needs citation (highlighted)
   - Detected claim type (e.g., "statistic", "finding", "method")
   - BibTeX entry (collapsible)
   - URL link to source
   - Copy button for BibTeX

3. **LoadingState**
   - Subtle spinner
   - Progress text

4. **EmptyState**
   - Friendly message when no input

## Functionality Specification

### Core Features

1. **Text Analysis**
   - Parse input text into sentences
   - Identify sentences with citation indicators:
     - Statistical claims ("X% increase", "X times more")
     - Findings ("studies show", "research demonstrates")
     - Methods ("according to", "proposed by")
     - Claims without author attribution

2. **Citation Retrieval (Real Data - No Hallucination)**
   - Use Semantic Scholar API to search for papers
   - Fallback to Crossref API
   - Extract: title, authors, year, venue, DOI, URL
   - Generate BibTeX from actual API data

3. **Results Display**
   - Show each sentence with detected claim type
   - Display matched paper info
   - Copyable BibTeX
   - Direct URL to paper

### User Flow
1. User pastes/types text in input area
2. Clicks "Analyze"
3. App processes text, identifies citation needs
4. For each identified sentence, queries scholarly APIs
5. Displays results with real BibTeX

### Edge Cases
- No sentences need citation → Show "No citations needed" message
- API fails → Show error gracefully, allow retry
- Empty input → Validate and prompt user

## Technical Implementation

### Stack
- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **APIs**: 
  - Semantic Scholar API (https://api.semanticscholar.org)
  - Crossref API (https://api.crossref.org)
- **Version Control**: GitHub

### Project Structure
```
citefinder/
├── src/
│   ├── components/
│   │   ├── TextInput.jsx
│   │   ├── CitationCard.jsx
│   │   ├── LoadingState.jsx
│   │   └── EmptyState.jsx
│   ├── utils/
│   │   ├── analyzer.js      # Sentence analysis logic
│   │   ├── citation.js      # API calls + BibTeX generation
│   │   └── constants.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Acceptance Criteria

1. ✅ Text input accepts multi-paragraph text
2. ✅ Identifies sentences with citation indicators
3. ✅ Fetches real BibTeX from Semantic Scholar/Crossref (not LLM-generated)
4. ✅ Displays citations with copyable BibTeX
5. ✅ UI matches "Ink Blue" minimalist theme
6. ✅ Responsive on mobile and desktop
7. ✅ GitHub repository created and code pushed
