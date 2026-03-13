import { useState, useEffect } from 'react';
import TextInput from './components/TextInput';
import CitationCard from './components/CitationCard';
import LoadingState from './components/LoadingState';
import EmptyState from './components/EmptyState';
import Settings from './components/Settings';
import { analyzeText } from './utils/analyzer';
import { fetchCitationsEnhanced, getConfig } from './utils/citation';

function App() {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [config, setConfig] = useState(null);
  const [activeProvider, setActiveProvider] = useState('minimax');

  // Load config on mount
  useEffect(() => {
    const cfg = getConfig();
    setConfig(cfg);
    setActiveProvider(cfg.llmProvider);
  }, []);

  const handleAnalyze = async (text) => {
    setIsLoading(true);
    setHasAnalyzed(true);
    
    try {
      // Get current config
      const cfg = getConfig();
      setConfig(cfg);
      
      // Analyze text to find sentences needing citations
      const analysisResults = analyzeText(text);
      
      if (analysisResults.length === 0) {
        setResults([]);
        setIsLoading(false);
        return;
      }
      
      // For each sentence needing citation, fetch from enhanced API
      const enrichedResults = [];
      
      for (const item of analysisResults) {
        // Use enhanced citation fetching with LLM query generation
        const paper = await fetchCitationsEnhanced(item.sentence, cfg);
        
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

  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
    // Reload config after closing settings
    const cfg = getConfig();
    setConfig(cfg);
    setActiveProvider(cfg.llmProvider);
  };

  const providerLabels = {
    minimax: 'MiniMax',
    openai: 'OpenAI',
    gemini: 'Gemini'
  };

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="bg-primary text-white py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">CiteFinder</h1>
            <p className="text-blue-200 text-sm mt-1">
              Detect citations in your paper and fetch real BibTeX entries
            </p>
          </div>
          <button
            onClick={handleOpenSettings}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>
      </header>

      {/* Status Bar */}
      {config && (
        <div className="bg-gray-100 border-b border-gray-200 py-2 px-6">
          <div className="max-w-7xl mx-auto flex items-center gap-6 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${config.llmProvider === activeProvider ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              LLM: {providerLabels[config.llmProvider]}
            </span>
            {config.serpapiApiKey && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                SerpAPI: ✓
              </span>
            )}
            {config.tavilyApiKey && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Tavily: ✓
              </span>
            )}
            {!config.serpapiApiKey && !config.tavilyApiKey && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Search APIs: Fallback mode (Semantic Scholar)
              </span>
            )}
          </div>
        </div>
      )}

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
        <p>Powered by LLM-enhanced search + Crossref APIs</p>
      </footer>

      {/* Settings Modal */}
      <Settings isOpen={settingsOpen} onClose={handleCloseSettings} />
    </div>
  );
}

export default App;
