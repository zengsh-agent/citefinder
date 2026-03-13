import { useState } from 'react';

export default function TextInput({ onAnalyze, isLoading }) {
  const [text, setText] = useState('');

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onAnalyze(text);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your paper draft here...

Example: Recent studies show that machine learning algorithms can achieve 95% accuracy in medical diagnosis. According to Smith et al., this represents a significant improvement over traditional methods. The data suggests that deep learning models are more effective than conventional approaches."
          className="flex-1 w-full p-4 text-text-primary bg-white border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-sans text-base leading-relaxed"
          disabled={isLoading}
        />
        
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-text-secondary">
            <span>{wordCount} words</span>
            <span className="mx-2">•</span>
            <span>{charCount} characters</span>
          </div>
          
          <button
            type="submit"
            disabled={!text.trim() || isLoading}
            className={`px-6 py-2.5 rounded-lg font-medium text-white transition-all duration-200 ${
              text.trim() && !isLoading
                ? 'bg-primary hover:bg-opacity-90 cursor-pointer'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </form>
    </div>
  );
}
