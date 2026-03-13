import { SEMANTIC_SCHOLAR_API, CROSSREF_API } from './constants';

// Configuration management
const CONFIG_KEY = 'citefinder_config';

export function getConfig() {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
  
  // Default config - check environment variables first
  return {
    llmProvider: 'minimax',
    minimaxApiKey: import.meta.env.VITE_MINIMAX_API_KEY || '',
    minimaxBaseUrl: import.meta.env.VITE_MINIMAX_BASE_URL || 'https://api.minimax.chat/v1',
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    serpapiApiKey: import.meta.env.VITE_SERPAPI_API_KEY || '',
    tavilyApiKey: import.meta.env.VITE_TAVILY_API_KEY || '',
  };
}

export function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

/**
 * Split text into sentences (from analyzer.js logic)
 */
function splitIntoSentences(text) {
  const sentenceRegex = /(?<![A-Z][a-z]?)\.(?=\s+[A-Z])|[!?](?=\s+[A-Z])/g;
  let sentences = text.split(sentenceRegex);
  
  const cleaned = [];
  let current = '';
  
  for (const sent of sentences) {
    current += (current ? '. ' : '') + sent;
    if (current.match(/[.!?]$/) || sent === sentences[sentences.length - 1]) {
      if (current.trim()) {
        cleaned.push(current.trim());
      }
      current = '';
    }
  }
  
  if (current.trim()) {
    cleaned.push(current.trim());
  }
  
  return cleaned.length > 0 ? cleaned : [text];
}

/**
 * Use LLM to analyze text and identify sentences needing citations
 */
export async function analyzeTextWithLLM(text, config = null) {
  const cfg = config || getConfig();
  
  if (!text || !text.trim()) {
    return [];
  }
  
  const sentences = splitIntoSentences(text);
  
  // Prepare prompt for LLM
  const prompt = `Given the following text, analyze each sentence and identify which ones need academic citations.

Text:
${text}

For each sentence that needs a citation, respond with JSON in this format:
[
  {"sentence": "exact sentence text", "reason": "why citation is needed"}
]

A sentence needs a citation if it makes any of these claims:
1. **Statistics/numbers**: percentages, data, metrics (e.g., "95% accuracy", "3x faster")
2. **Research findings**: studies show, experiments demonstrate, research found
3. **External claims**: claims about what other papers/authors stated
4. **Strong factual statements**: assertions presented as facts that aren't the author's own analysis

For strong factual statements, ask: "Is this the author's own data/analysis, or is this claiming something as a fact that needs support?" If it's a claim about what is generally true in the field, it needs citation.

Ignore sentences that:
- Already have citations like (Smith, 2020) or [1]
- Are the author's own methodology descriptions
- Are purely transitional sentences
- Present the author's own findings/results from this paper

Return ONLY valid JSON array, nothing else.`;

  try {
    let response;
    const { llmProvider, minimaxApiKey, minimaxBaseUrl, openaiApiKey, geminiApiKey } = cfg;
    
    switch (llmProvider) {
      case 'openai':
        response = await callOpenAI(openaiApiKey, prompt);
        break;
      case 'gemini':
        response = await callGemini(geminiApiKey, prompt);
        break;
      case 'minimax':
      default:
        response = await callMinimax(minimaxApiKey, minimaxBaseUrl, prompt);
        break;
    }
    
    // Parse JSON response
    const results = JSON.parse(response.replace(/```json|```/g, '').trim());
    
    return results.map((item, index) => ({
      id: index,
      sentence: item.sentence,
      type: item.reason || 'claim',
      keywords: [],
      matchedText: ''
    }));
  } catch (error) {
    console.error('LLM text analysis error:', error);
    // Fallback to regex-based analysis
    return analyzeTextFallback(text);
  }
}

/**
 * Fallback to regex-based analysis if LLM fails
 */
function analyzeTextFallback(text) {
  const sentences = splitIntoSentences(text);
  const results = [];
  const CITATION_PATTERNS = [
    { pattern: /\b(\d+(?:\.\d+)?%)\s+(increase|decrease|rise|fall|drop|decline|growth|reduction)/gi, type: 'statistic' },
    { pattern: /\b(studies|research|experiments|surveys)\s+(show|demonstrate|reveal|indicate|suggest)/gi, type: 'finding' },
    { pattern: /\baccording to\s+([A-Z][a-z]+)/gi, type: 'method' },
    { pattern: /\b(found|shown|demonstrated)\s+that/i, type: 'finding' },
  ];
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence || sentence.length < 15) continue;
    
    // Skip if already has citation
    if (sentence.match(/\([A-Za-z\s&]+,\s*\d{4}\)/) || sentence.match(/\[\d+\]/)) {
      continue;
    }
    
    for (const { pattern, type } of CITATION_PATTERNS) {
      if (pattern.test(sentence)) {
        results.push({
          id: i,
          sentence: sentence,
          type: type,
          keywords: [],
          matchedText: ''
        });
        break;
      }
    }
  }
  
  return results;
}

/**
 * Generate a search query from a sentence using LLM
 */
export async function generateSearchQuery(sentence, config = null) {
  const cfg = config || getConfig();
  
  const prompt = `Given this sentence that needs a citation, extract the key concepts and generate an optimal academic paper search query. 

Sentence: "${sentence}"

Generate a concise search query (2-5 key terms) that would find relevant academic papers. Return ONLY the query, nothing else.`;

  try {
    let result;
    
    switch (cfg.llmProvider) {
      case 'openai':
        result = await callOpenAI(cfg.openaiApiKey, prompt);
        break;
      case 'gemini':
        result = await callGemini(cfg.geminiApiKey, prompt);
        break;
      case 'minimax':
      default:
        result = await callMinimax(cfg.minimaxApiKey, cfg.minimaxBaseUrl, prompt);
        break;
    }
    
    return result.trim();
  } catch (error) {
    console.error('LLM query generation error:', error);
    // Fallback to simple extraction
    return extractKeywordsFallback(sentence);
  }
}

/**
 * Call MiniMax API (default for China)
 */
async function callMinimax(apiKey, baseUrl, prompt) {
  if (!apiKey) {
    throw new Error('MiniMax API key not configured');
  }
  
  const response = await fetch(`${baseUrl}/text/chatcompletion_v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'abab6.5s-chat',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.3
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MiniMax API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Call OpenAI API
 */
async function callOpenAI(apiKey, prompt) {
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.3
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Call Gemini API
 */
async function callGemini(apiKey, prompt) {
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.3
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Fallback keyword extraction without LLM
 */
function extractKeywordsFallback(sentence) {
  // Remove common stop words
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once', 'if', 'because', 'as', 'until', 'while', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'study', 'research', 'paper', 'show', 'found', 'demonstrate']);
  
  const words = sentence.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
  
  // Get unique words and take first 4
  const unique = [...new Set(words)];
  return unique.slice(0, 4).join(' ');
}

/**
 * Search using SerpAPI
 */
export async function searchWithSerpAPI(query, apiKey) {
  if (!apiKey) {
    throw new Error('SerpAPI key not configured');
  }
  
  try {
    const params = new URLSearchParams({
      q: query,
      engine: 'google_scholar',
      num: 5,
      api_key: apiKey
    });
    
    const response = await fetch(`https://serpapi.com/search?${params}`);
    
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.organic_results || data.organic_results.length === 0) {
      return [];
    }
    
    return data.organic_results.map(result => ({
      title: result.title || 'Unknown Title',
      link: result.link || '',
      snippet: result.snippet || '',
      publicationInfo: result.publication_info?.summary || '',
      source: 'SerpAPI (Google Scholar)'
    }));
  } catch (error) {
    console.error('SerpAPI search error:', error);
    throw error;
  }
}

/**
 * Search using Tavily API
 */
export async function searchWithTavily(query, apiKey) {
  if (!apiKey) {
    throw new Error('Tavily API key not configured');
  }
  
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        max_results: 5,
        include_answer: false,
        include_raw_content: false,
        include_images: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return [];
    }
    
    return data.results.map(result => ({
      title: result.title || 'Unknown Title',
      link: result.url || '',
      snippet: result.content || '',
      publicationInfo: result.url || '',
      source: 'Tavily'
    }));
  } catch (error) {
    console.error('Tavily search error:', error);
    throw error;
  }
}

/**
 * Search with fallback between SerpAPI and Tavily
 */
export async function searchWithFallback(query, config = null) {
  const cfg = config || getConfig();
  const { serpapiApiKey, tavilyApiKey } = cfg;
  
  // Try SerpAPI first
  if (serpapiApiKey) {
    try {
      const results = await searchWithSerpAPI(query, serpapiApiKey);
      if (results.length > 0) {
        return { results, source: 'SerpAPI' };
      }
    } catch (error) {
      console.warn('SerpAPI failed, trying Tavily:', error.message);
    }
  }
  
  // Try Tavily as fallback
  if (tavilyApiKey) {
    try {
      const results = await searchWithTavily(query, tavilyApiKey);
      if (results.length > 0) {
        return { results, source: 'Tavily' };
      }
    } catch (error) {
      console.warn('Tavily failed:', error.message);
    }
  }
  
  // Fallback to Semantic Scholar API if no search API keys
  return null;
}

/**
 * Extract DOI from search result or URL
 */
export function extractDOIFromResult(result) {
  const { link, title, snippet } = result;
  
  // Try to find DOI in the link
  const doiPatterns = [
    /doi\.org\/(10\.\d{4,}\/[^\s]+)/i,
    /doi:(10\.\d{4,}\/[^\s]+)/i,
    /(10\.\d{4,}\/[^\s,;]+)/i
  ];
  
  for (const pattern of doiPatterns) {
    const match = link?.match(pattern) || title?.match(pattern) || snippet?.match(pattern);
    if (match) {
      return match[1].replace(/[.),;]$/, '');
    }
  }
  
  return null;
}

/**
 * Fetch BibTeX from Crossref using DOI
 */
export async function fetchBibTeXFromDOI(doi) {
  if (!doi) return null;
  
  try {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: {
        'Accept': 'application/x-bibtex'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Crossref error: ${response.status}`);
    }
    
    const bibtex = await response.text();
    return bibtex;
  } catch (error) {
    console.error('Crossref BibTeX fetch error:', error);
    return null;
  }
}

/**
 * Fetch paper metadata from Crossref using DOI
 */
export async function fetchPaperFromCrossref(doi) {
  if (!doi) return null;
  
  try {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Crossref error: ${response.status}`);
    }
    
    const data = await response.json();
    const item = data.message;
    
    const authors = item.author?.map(a => `${a.given || ''} ${a.family || ''}`.trim()).join(', ') || 'Unknown Authors';
    const url = item.URL || `https://doi.org/${doi}`;
    
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
  } catch (error) {
    console.error('Crossref paper fetch error:', error);
    return null;
  }
}

/**
 * Rank search results by relevance using LLM
 */
export async function rankResultsByRelevance(results, sentence, config = null) {
  const cfg = config || getConfig();
  const { llmProvider, minimaxApiKey, minimaxBaseUrl, openaiApiKey, geminiApiKey } = cfg;
  
  if (!results || results.length === 0) return results;
  if (results.length === 1) return results;
  
  const prompt = `Given this sentence that needs a citation:
"${sentence}"

Rate the following papers by relevance (most relevant first). Consider:
1. Does the paper's title match the key concepts in the sentence?
2. Is it likely an academic/scientific paper?

Return a JSON array of indices in order of relevance (0 = most relevant):
${results.map((r, i) => `${i}: ${r.title}`).join('\n')}

Only respond with the JSON array, nothing else.`;

  try {
    let response;
    
    switch (llmProvider) {
      case 'openai':
        response = await callOpenAI(openaiApiKey, prompt);
        break;
      case 'gemini':
        response = await callGemini(geminiApiKey, prompt);
        break;
      case 'minimax':
      default:
        response = await callMinimax(minimaxApiKey, minimaxBaseUrl, prompt);
        break;
    }
    
    // Parse the response
    const indices = JSON.parse(response.replace(/[^[\d,\s]/g, ''));
    
    // Reorder results
    return indices.map(i => results[i]).filter(Boolean);
  } catch (error) {
    console.error('LLM ranking error:', error);
    return results; // Return original order on error
  }
}

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
 * Enhanced fetch citations with LLM query generation and search API
 */
export async function fetchCitationsEnhanced(sentence, config = null) {
  const cfg = config || getConfig();
  
  // Step 1: Generate search query using LLM
  const searchQuery = await generateSearchQuery(sentence, cfg);
  
  // Step 2: Try search APIs first (SerpAPI/Tavily)
  const searchResult = await searchWithFallback(searchQuery, cfg);
  
  if (searchResult && searchResult.results.length > 0) {
    // Step 3: Extract DOI and fetch from Crossref
    const results = searchResult.results;
    
    // Try to get DOI from first result
    let doi = extractDOIFromResult(results[0]);
    
    if (doi) {
      const paper = await fetchPaperFromCrossref(doi);
      if (paper) {
        paper.searchQuery = searchQuery;
        paper.searchSource = searchResult.source;
        return paper;
      }
    }
    
    // If no DOI, rank results and use Semantic Scholar
    const rankedResults = await rankResultsByRelevance(results, sentence, cfg);
    
    for (const result of rankedResults) {
      doi = extractDOIFromResult(result);
      if (doi) {
        const paper = await fetchPaperFromCrossref(doi);
        if (paper) {
          paper.searchQuery = searchQuery;
          paper.searchSource = searchResult.source;
          return paper;
        }
      }
    }
  }
  
  // Step 4: Fallback to traditional APIs
  let papers = await fetchFromSemanticScholar(searchQuery);
  
  if (!papers || papers.length === 0) {
    papers = await fetchFromCrossref(searchQuery);
  }
  
  if (papers && papers.length > 0) {
    const rankedPapers = await rankResultsByRelevance(
      papers.map(p => ({ title: p.title, link: p.url, snippet: p.abstract })),
      sentence,
      cfg
    );
    
    // Match back to original papers
    for (const ranked of rankedPapers) {
      const original = papers.find(p => p.title === ranked.title);
      if (original) {
        original.searchQuery = searchQuery;
        original.searchSource = 'Semantic Scholar / Crossref (fallback)';
        return original;
      }
    }
  }
  
  return null;
}

/**
 * Fetch citations from both APIs and return combined results (legacy)
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
