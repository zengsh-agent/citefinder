import { CITATION_PATTERNS } from './constants';

/**
 * Analyze text and identify sentences that need citations
 */
export function analyzeText(text) {
  if (!text || !text.trim()) {
    return [];
  }

  // Split text into sentences
  const sentences = splitIntoSentences(text);
  
  // Find sentences that need citations
  const results = [];
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence || sentence.length < 10) continue;
    
    const detection = detectCitationNeed(sentence);
    if (detection.needsCitation) {
      results.push({
        id: i,
        sentence: sentence,
        type: detection.type,
        keywords: detection.keywords,
        matchedText: detection.matchedText
      });
    }
  }
  
  return results;
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text) {
  // Match sentence endings: . ! ? followed by space or end of string
  // Also handle abbreviations like et al., etc., Dr., Mr., etc.
  const sentenceRegex = /(?<![A-Z][a-z]?)\.(?=\s+[A-Z])|[!?](?=\s+[A-Z])/g;
  
  let sentences = text.split(sentenceRegex);
  
  // Clean up and rejoin sentences that were incorrectly split
  const cleaned = [];
  let current = '';
  
  for (const sent of sentences) {
    current += (current ? '. ' : '') + sent;
    
    // Check if this looks like a complete sentence
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
 * Detect if a sentence needs a citation
 */
function detectCitationNeed(sentence) {
  for (const { pattern, type } of CITATION_PATTERNS) {
    const matches = sentence.match(pattern);
    if (matches && matches.length > 0) {
      return {
        needsCitation: true,
        type: type,
        keywords: matches,
        matchedText: matches[0]
      };
    }
  }
  
  // Check for parenthetical citations (Author, Year) or [1]
  const hasParenthetical = sentence.match(/\([A-Za-z\s&]+,\s*\d{4}\)/) || 
                           sentence.match(/\([A-Z][a-z]+\s+et\s+al\.,\s*\d{4}\)/);
  if (hasParenthetical) {
    return { needsCitation: false, type: null };
  }
  
  // Check for numbered citations [1], [2], etc.
  const hasNumbered = sentence.match(/\[\d+(?:,\s*\d+)*\]/);
  if (hasNumbered) {
    return { needsCitation: false, type: null };
  }
  
  return {
    needsCitation: false,
    type: null,
    keywords: [],
    matchedText: null
  };
}

/**
 * Extract potential search terms from a sentence
 */
export function extractSearchTerms(sentence) {
  const terms = [];
  
  // Look for quoted phrases
  const quotes = sentence.match(/"([^"]+)"/g);
  if (quotes) {
    terms.push(...quotes.map(q => q.replace(/"/g, '')));
  }
  
  // Look for key nouns/verbs in citation-needed sentences
  const importantWords = sentence.match(/\b([A-Z][a-z]{3,}(?:\s+[A-Z][a-z]+)*)\b/g);
  if (importantWords) {
    // Take unique important-looking terms
    const unique = [...new Set(importantWords)];
    terms.push(...unique.slice(0, 3));
  }
  
  return terms.length > 0 ? terms : [sentence.split(' ').slice(0, 5).join(' ')];
}
