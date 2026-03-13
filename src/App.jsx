import { useState } from 'react';
import TextInput from './components/TextInput';
import CitationCard from './components/CitationCard';
import LoadingState from './components/LoadingState';
import EmptyState from './components/EmptyState';
import { analyzeText, extractSearchTerms } from './utils/analyzer';
import { fetchCitations } from './utils/citation';

function App() {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyze = async (text) => {
    setIsLoading(true);
    setHasAnalyzed(true);
    
    try {
      // Analyze text to find sentences needing citations
      const analysisResults = analyzeText(text);
      
      if (analysisResults.length === 0) {
        setResults([]);
        setIsLoading(false);
        return;
      }
      
      // For each sentence needing citation, fetch from API
      const enrichedResults = [];
      
      for (const item of analysisResults) {
        // Extract search terms from the sentence
        const searchTerms = extractSearchTerms(item.sentence);
        
        // Try to find a citation for each search term
        let paper = null;
        for (const term of searchTerms) {
          const papers = await fetchCitations(term);
          if (papers && papers.length > 0) {
            paper = papers[0];
            break;
          }
        }
        
        enrichedResults.push({
          ...item,
          paper: paper
        });
      }
      
      setResults(enrichedResults);
    } catch (error) {
      console.error('Analysis error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="bg-primary text-white py-6">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-2xl font-bold">CiteFinder</h1>
          <p className="text-blue-200 text-sm mt-1">
            Detect citations in your paper and fetch real BibTeX entries
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Input */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-primary mb-4">
              Input Text
            </h2>
            <TextInput onAnalyze={handleAnalyze} isLoading={isLoading} />
          </div>

          {/* Right: Results */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-primary mb-4">
              Citations Found
              {results.length > 0 && (
                <span className="ml-2 text-sm font-normal text-text-secondary">
                  ({results.length})
                </span>
              )}
            </h2>
            
            {isLoading ? (
              <LoadingState />
            ) : !hasAnalyzed ? (
              <EmptyState />
            ) : results.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-secondary text-sm">
                  {hasAnalyzed 
                    ? 'No citations needed detected in your text. Great job!'
                    : 'Enter some text and click Analyze to find citations.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {results.map((result) => (
                  <CitationCard 
                    key={result.id} 
                    item={result} 
                    paper={result.paper} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-6 text-center text-text-secondary text-sm">
        <p>Powered by Semantic Scholar & Crossref APIs</p>
      </footer>
    </div>
  );
}

export default App;
