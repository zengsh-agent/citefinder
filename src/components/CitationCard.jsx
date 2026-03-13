import { useState } from 'react';
import { generateBibTeX, formatAuthors } from '../utils/citation';

export default function CitationCard({ item, paper }) {
  const [copied, setCopied] = useState(false);
  const [showBibtex, setShowBibtex] = useState(false);

  if (!paper) {
    return (
      <div className="bg-white border border-border rounded-lg p-4 shadow-sm">
        <div className="text-sm text-warning mb-2">
          Could not find citation for: {item.sentence.substring(0, 50)}...
        </div>
        <p className="text-text-secondary text-sm">{item.sentence}</p>
      </div>
    );
  }

  const bibtex = generateBibTeX(paper);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bibtex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const typeColors = {
    statistic: 'bg-amber-100 text-amber-800',
    finding: 'bg-blue-100 text-blue-800',
    method: 'bg-purple-100 text-purple-800',
    claim: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="bg-white border border-border rounded-lg p-4 shadow-sm">
      {/* Sentence */}
      <p className="text-text-primary text-sm mb-3 leading-relaxed">
        "{item.sentence}"
      </p>
      
      {/* Type badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[item.type] || typeColors.claim}`}>
          {item.type || 'citation needed'}
        </span>
        {item.matchedText && (
          <span className="text-xs text-text-secondary">
            Matched: "{item.matchedText}"
          </span>
        )}
      </div>
      
      {/* Paper info */}
      <div className="border-t border-border pt-3">
        <h4 className="font-semibold text-primary text-sm mb-1">
          {paper.title}
        </h4>
        <p className="text-text-secondary text-xs mb-2">
          {formatAuthors(paper.authors)} ({paper.year})
          {paper.venue && ` • ${paper.venue}`}
        </p>
        
        {/* Links */}
        <div className="flex items-center gap-3 mb-3">
          {paper.url && (
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent text-xs hover:underline"
            >
              View Paper →
            </a>
          )}
          {paper.doi && (
            <span className="text-text-secondary text-xs">
              DOI: {paper.doi}
            </span>
          )}
        </div>
        
        {/* Search Info */}
        {(paper.searchQuery || paper.searchSource) && (
          <div className="mb-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
            {paper.searchQuery && (
              <span className="block">
                <span className="font-medium">Query:</span> "{paper.searchQuery}"
              </span>
            )}
            {paper.searchSource && (
              <span>
                <span className="font-medium">Source:</span> {paper.searchSource}
              </span>
            )}
          </div>
        )}
        
        {/* BibTeX toggle and copy */}
        <div>
          <button
            onClick={() => setShowBibtex(!showBibtex)}
            className="text-xs text-primary hover:text-accent font-medium"
          >
            {showBibtex ? '▼ Hide BibTeX' : '▶ Show BibTeX'}
          </button>
          
          {showBibtex && (
            <div className="mt-2 relative">
              <pre className="bg-secondary border border-border rounded p-3 text-xs font-mono text-text-primary overflow-x-auto whitespace-pre-wrap">
                {bibtex}
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 px-2 py-1 bg-primary text-white text-xs rounded hover:bg-opacity-90 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
