// Citation indicators patterns
export const CITATION_PATTERNS = [
  // Statistics
  { pattern: /\b(\d+(?:\.\d+)?%)\s+(increase|decrease|rise|fall|drop|decline|growth|reduction|higher|lower|more|less)/gi, type: 'statistic' },
  { pattern: /\b(increase|decrease|rise|fall|drop|decline|grow|reduce)\s+by\s+(\d+(?:\.\d+)?)/gi, type: 'statistic' },
  { pattern: /\b(\d+(?:\.\d+)?)\s+times\s+(more|less|greater|smaller|higher|lower)/gi, type: 'statistic' },
  { pattern: /\baverage\s+of\s+(\d+(?:\.\d+)?)/gi, type: 'statistic' },
  { pattern: /\b(\d+(?:\.\d+)?)\s+out\s+of\s+(\d+(?:\.\d+)?)/gi, type: 'statistic' },
  
  // Findings
  { pattern: /\b(studies|research|experiments|surveys|papers)\s+(show|demonstrate|reveal|indicate|suggest|prove|confirm|found)/gi, type: 'finding' },
  { pattern: /\b(found|shown|demonstrated|revealed|indicated|suggested)\s+(that|in|by)/gi, type: 'finding' },
  { pattern: /\bprevious\s+(research|study|work|paper|investigation)/gi, type: 'finding' },
  { pattern: /\bprior\s+(research|study|work|paper)/gi, type: 'finding' },
  
  // Methods/Claims
  { pattern: /\b(according to|as stated by|as proposed by|as described by)\s+([A-Z][a-z]+)/gi, type: 'method' },
  { pattern: /\b(proposed|introduced|developed|created|designed|presented)\s+by\s+([A-Z][a-z]+)/gi, type: 'method' },
  { pattern: /\b([A-Z][a-z]+(?:\s+et\s+al\.?)?)\s+(proposed|introduced|developed|created|suggested|presented)/gi, type: 'method' },
  
  // Claims without attribution
  { pattern: /\bit\s+is\s+(known|believed|accepted|established|understood)/gi, type: 'claim' },
  { pattern: /\b(the|this|these)\s+(finding|result|conclusion|evidence)\s+(suggests|indicates|shows)/gi, type: 'claim' },
  { pattern: /\b(researchers|scientists|scholars|experts)\s+(have|have\s+been)/gi, type: 'finding' },
  
  // General claims
  { pattern: /\b(significant|important|crucial|critical|essential|key)\s+(factor|element|aspect|component)/gi, type: 'claim' },
  { pattern: /\b(evidence|data|proof)\s+(shows|suggests|indicates|supports)/gi, type: 'finding' },
];

// Semantic Scholar API endpoint
export const SEMANTIC_SCHOLAR_API = 'https://api.semanticscholar.org/graph/v1/paper/search';

// Crossref API endpoint
export const CROSSREF_API = 'https://api.crossref.org/works';
