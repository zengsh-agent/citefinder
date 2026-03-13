import { useState, useEffect } from 'react';
import { getConfig, saveConfig } from '../utils/citation';

export default function Settings({ isOpen, onClose }) {
  const [config, setConfig] = useState({
    llmProvider: 'minimax',
    minimaxApiKey: '',
    minimaxBaseUrl: 'https://api.minimax.chat/v1',
    openaiApiKey: '',
    geminiApiKey: '',
    serpapiApiKey: '',
    tavilyApiKey: '',
  });
  const [saved, setSaved] = useState(false);
  const [showKeys, setShowKeys] = useState({});

  useEffect(() => {
    if (isOpen) {
      const cfg = getConfig();
      setConfig(cfg);
      setSaved(false);
    }
  }, [isOpen]);

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const defaultConfig = {
      llmProvider: 'minimax',
      minimaxApiKey: '',
      minimaxBaseUrl: 'https://api.minimax.chat/v1',
      openaiApiKey: '',
      geminiApiKey: '',
      serpapiApiKey: '',
      tavilyApiKey: '',
    };
    setConfig(defaultConfig);
    saveConfig(defaultConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleShowKey = (field) => {
    setShowKeys(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (!isOpen) return null;

  const providerLabels = {
    minimax: 'MiniMax (default for China)',
    openai: 'OpenAI (GPT)',
    gemini: 'Google Gemini'
  };

  const providerFields = {
    minimax: ['minimaxApiKey', 'minimaxBaseUrl'],
    openai: ['openaiApiKey'],
    gemini: ['geminiApiKey']
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-primary">Settings</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-primary transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* LLM Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              LLM Provider
            </label>
            <select
              value={config.llmProvider}
              onChange={(e) => handleChange('llmProvider', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="minimax">MiniMax (default for China)</option>
              <option value="openai">OpenAI (GPT-3.5)</option>
              <option value="gemini">Google Gemini</option>
            </select>
            <p className="text-xs text-text-secondary mt-1">
              Current: {providerLabels[config.llmProvider]}
            </p>
          </div>

          {/* API Keys */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-primary border-b border-border pb-2">
              API Keys
            </h3>

            {/* MiniMax */}
            {config.llmProvider === 'minimax' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    MiniMax API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={showKeys.minimaxApiKey ? 'text' : 'password'}
                      value={config.minimaxApiKey}
                      onChange={(e) => handleChange('minimaxApiKey', e.target.value)}
                      placeholder="Enter your MiniMax API key"
                      className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey('minimaxApiKey')}
                      className="px-3 py-2 text-text-secondary hover:text-primary border border-border rounded-lg"
                    >
                      {showKeys.minimaxApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    MiniMax Base URL
                  </label>
                  <input
                    type="text"
                    value={config.minimaxBaseUrl}
                    onChange={(e) => handleChange('minimaxBaseUrl', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>
              </>
            )}

            {/* OpenAI */}
            {config.llmProvider === 'openai' && (
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  OpenAI API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type={showKeys.openaiApiKey ? 'text' : 'password'}
                    value={config.openaiApiKey}
                    onChange={(e) => handleChange('openaiApiKey', e.target.value)}
                    placeholder="sk-..."
                    className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('openaiApiKey')}
                    className="px-3 py-2 text-text-secondary hover:text-primary border border-border rounded-lg"
                  >
                    {showKeys.openaiApiKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            {/* Gemini */}
            {config.llmProvider === 'gemini' && (
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Gemini API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type={showKeys.geminiApiKey ? 'text' : 'password'}
                    value={config.geminiApiKey}
                    onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                    placeholder="Enter your Gemini API key"
                    className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('geminiApiKey')}
                    className="px-3 py-2 text-text-secondary hover:text-primary border border-border rounded-lg"
                  >
                    {showKeys.geminiApiKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search APIs */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-primary border-b border-border pb-2">
              Search APIs (with fallback)
            </h3>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                SerpAPI Key
                <span className="text-xs font-normal text-text-secondary ml-2">
                  (Google Scholar search)
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type={showKeys.serpapiApiKey ? 'text' : 'password'}
                  value={config.serpapiApiKey}
                  onChange={(e) => handleChange('serpapiApiKey', e.target.value)}
                  placeholder="Enter your SerpAPI key"
                  className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('serpapiApiKey')}
                  className="px-3 py-2 text-text-secondary hover:text-primary border border-border rounded-lg"
                >
                  {showKeys.serpapiApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Free tier: 100 searches/month. Get key at serpapi.com
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Tavily API Key
                <span className="text-xs font-normal text-text-secondary ml-2">
                  (AI-powered search)
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type={showKeys.tavilyApiKey ? 'text' : 'password'}
                  value={config.tavilyApiKey}
                  onChange={(e) => handleChange('tavilyApiKey', e.target.value)}
                  placeholder="Enter your Tavily API key"
                  className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('tavilyApiKey')}
                  className="px-3 py-2 text-text-secondary hover:text-primary border border-border rounded-lg"
                >
                  {showKeys.tavilyApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Free tier: 1000 searches/month. Get key at tavily.com
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">
              ℹ️ How it works
            </h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• LLM generates optimal search query from your sentence</li>
              <li>• Search APIs (SerpAPI/Tavily) find relevant papers</li>
              <li>• LLM ranks results by relevance to your sentence</li>
              <li>• BibTeX fetched from Crossref using DOI</li>
              <li>• Fallback to Semantic Scholar/ Crossref if no search API keys</li>
            </ul>
          </div>

          {/* Environment Variables Note */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">
              🔧 Environment Variables (optional)
            </h4>
            <p className="text-xs text-gray-600 mb-2">
              You can also configure via environment variables:
            </p>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
{`VITE_MINIMAX_API_KEY
VITE_MINIMAX_BASE_URL
VITE_OPENAI_API_KEY
VITE_GEMINI_API_KEY
VITE_SERPAPI_API_KEY
VITE_TAVILY_API_KEY`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-gray-50">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Reset to Defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-primary border border-border rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                saved
                  ? 'bg-green-600'
                  : 'bg-primary hover:bg-opacity-90'
              }`}
            >
              {saved ? '✓ Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
