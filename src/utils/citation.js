import { SEMANTIC_SCHOLAR_API, CROSSREF_API } from './constants';

/**
 * Fetch citation data from Semantic Scholar API
 */
export async function fetchFromSemanticScholar(query) {
  try {
    const params = new URLSearchParams({
      query: query,
      limit: 5,
      fields: 'title,authors,year,venue,doi,url,abstract'
    });
    
    const response = await fetch(`${SEMANTIC_SCHOLAR_API}?${params}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Semantic Scholar API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return data.data.map(paper => ({
        title: paper.title || 'Unknown Title',
        authors: paper.authors?.map(a => a.name).join(', ') || 'Unknown Authors',
        year: paper.year || 'n.d.',
        venue: paper.venue || '',
        doi: paper.doi || '',
        url: paper.url || '',
        abstract: paper.abstract || '',
        source: 'Semantic Scholar'
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Semantic Scholar fetch error:', error);
    return null;
  }
}

/**
 * Fetch citation data from Crossref API
 */
export async function fetchFromCrossref(query) {
  try {
    const params = new URLSearchParams({
      query: query,
      rows: 5
    });
    
    const response = await fetch(`${CROSSREF_API}?${params}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Crossref API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.message?.items?.length > 0) {
      return data.message.items.map(item => {
        const authors = item.author?.map(a => `${a.given || ''} ${a.family || ''}`.trim()).join(', ') || 'Unknown Authors';
        const doi = item.DOI || '';
        const url = `https://doi.org/${doi}`;
        
        return {
          title: item.title?.[0] || 'Unknown Title',
          authors: authors,
          year: item.published?.['date-parts']?.[0]?.[0] || 'n.d.',
          venue: item['container-title']?.[0] || '',
          doi: doi,
          url: url,
          abstract: item.abstract || '',
          source: 'Crossref'
        };
      });
    }
    
    return [];
  } catch (error) {
    console.error('Crossref fetch error:', error);
    return null;
  }
}

/**
 * Fetch citations from both APIs and return combined results
 */
export async function fetchCitations(query) {
  // Try Semantic Scholar first
  let results = await fetchFromSemanticScholar(query);
  
  if (!results || results.length === 0) {
    // Fallback to Crossref
    results = await fetchFromCrossref(query);
  }
  
  return results || [];
}

/**
 * Generate BibTeX entry from paper data
 */
export function generateBibTeX(paper) {
  // Create citation key
  const firstAuthor = paper.authors.split(',')[0].trim();
  const lastName = firstAuthor.split(' ').pop().replace(/[^a-zA-Z]/g, '');
  const year = paper.year !== 'n.d.' ? paper.year : '';
  const key = `${lastName}${year}`.toLowerCase() || 'unknown';
  
  let bibtex = `@article{${key},\n`;
  bibtex += `  title = {${paper.title}},\n`;
  bibtex += `  author = {${paper.authors}},\n`;
  
  if (year) {
    bibtex += `  year = {${year}},\n`;
  }
  
  if (paper.venue) {
    bibtex += `  journal = {${paper.venue}},\n`;
  }
  
  if (paper.doi) {
    bibtex += `  doi = {${paper.doi}},\n`;
  }
  
  if (paper.url) {
    bibtex += `  url = {${paper.url}},\n`;
  }
  
  if (paper.abstract) {
    bibtex += `  abstract = {${paper.abstract.replace(/<[^>]*>/g, '')}},\n`;
  }
  
  // Remove trailing comma and close
  bibtex = bibtex.replace(/,\n$/, '\n');
  bibtex += `}`;
  
  return bibtex;
}

/**
 * Format authors for display
 */
export function formatAuthors(authors) {
  const authorList = authors.split(',').map(a => a.trim());
  if (authorList.length > 3) {
    return `${authorList[0]} et al.`;
  }
  return authors;
}
