import os
import json
import re
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="CiteFinder")

# Mount static files
BASE_DIR = Path(__file__).parent
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Config
def get_config():
    return {
        "llmProvider": os.getenv("LLM_PROVIDER", "minimax"),
        "minimaxApiKey": os.getenv("MINIMAX_API_KEY", ""),
        "minimaxBaseUrl": os.getenv("MINIMAX_BASE_URL", "https://api.minimax.chat/v1"),
        "openaiApiKey": os.getenv("OPENAI_API_KEY", ""),
        "geminiApiKey": os.getenv("GEMINI_API_KEY", ""),
        "serpapiApiKey": os.getenv("SERPAPI_API_KEY", ""),
        "tavilyApiKey": os.getenv("TAVILY_API_KEY", ""),
    }

# Models
class AnalyzeRequest(BaseModel):
    text: str
    config: Optional[dict] = None

class CitationResult(BaseModel):
    sentence: str
    reason: str
    paper: Optional[dict] = None

# ============ LLM Functions ============

async def call_llm(prompt: str, config: dict) -> str:
    """Call LLM with prompt"""
    provider = config.get("llmProvider", "minimax")
    
    if provider == "openai":
        return await call_openai(config.get("openaiApiKey", ""), prompt)
    elif provider == "gemini":
        return await call_gemini(config.get("geminiApiKey", ""), prompt)
    else:  # minimax
        return await call_minimax(
            config.get("minimaxApiKey", ""),
            config.get("minimaxBaseUrl", "https://api.minimax.chat/v1"),
            prompt
        )

async def call_minimax(api_key: str, base_url: str, prompt: str) -> str:
    if not api_key:
        raise Exception("MiniMax API key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{base_url}/text/chatcompletion_v2",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            json={
                "model": "abab6.5s-chat",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1000,
                "temperature": 0.3
            }
        )
        if response.status_code != 200:
            raise Exception(f"MiniMax API error: {response.status_code}")
        data = response.json()
        return data.get("choices", [{}])[0].get("message", {}).get("content", "")

async def call_openai(api_key: str, prompt: str) -> str:
    if not api_key:
        raise Exception("OpenAI API key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            json={
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1000,
                "temperature": 0.3
            }
        )
        if response.status_code != 200:
            raise Exception(f"OpenAI API error: {response.status_code}")
        data = response.json()
        return data.get("choices", [{}])[0].get("message", {}).get("content", "")

async def call_gemini(api_key: str, prompt: str) -> str:
    if not api_key:
        raise Exception("Gemini API key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"maxOutputTokens": 1000, "temperature": 0.3}
            }
        )
        if response.status_code != 200:
            raise Exception(f"Gemini API error: {response.status_code}")
        data = response.json()
        return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")

# ============ Text Analysis ============

def split_into_sentences(text: str) -> List[str]:
    """Split text into sentences"""
    sentence_regex = r'(?<![A-Z][a-z]?)\.(?=\s+[A-Z])|[!?](?=\s+[A-Z])'
    sentences = re.split(sentence_regex, text)
    
    cleaned = []
    current = ''
    
    for sent in sentences:
        current += (current + '. ') + sent if current else sent
        if re.match(r'[.!?]$', current) or sent == sentences[-1]:
            if current.strip():
                cleaned.append(current.strip())
            current = ''
    
    if current.strip():
        cleaned.append(current.strip())
    
    return cleaned if cleaned else [text]

async def analyze_text_with_llm(text: str, config: dict) -> List[dict]:
    """Use LLM to identify sentences needing citations"""
    sentences = split_into_sentences(text)
    
    prompt = f"""Given the following text, analyze each sentence and identify which ones need academic citations.

Text:
{text}

For each sentence that needs a citation, respond with JSON in this format:
[
  {{"sentence": "exact sentence text", "reason": "why citation is needed"}}
]

A sentence needs a citation if it makes any of these claims:
1. Statistics/numbers: percentages, data, metrics
2. Research findings: studies show, experiments demonstrate
3. External claims: claims about what other papers stated
4. Strong factual statements: assertions presented as facts

Ignore sentences that:
- Already have citations like (Smith, 2020) or [1]
- Are the author's own methodology descriptions
- Are purely transitional sentences

Return ONLY valid JSON array, nothing else."""

    try:
        response = await call_llm(prompt, config)
        # Clean response
        response = response.replace("```json", "").replace("```", "").strip()
        results = json.loads(response)
        
        return [
            {
                "id": i,
                "sentence": item["sentence"],
                "reason": item.get("reason", "claim"),
                "keywords": [],
                "matchedText": ""
            }
            for i, item in enumerate(results)
        ]
    except Exception as e:
        print(f"LLM analysis error: {e}")
        # Fallback to regex
        return analyze_text_fallback(text)

def analyze_text_fallback(text: str) -> List[dict]:
    """Fallback regex-based analysis"""
    sentences = split_into_sentences(text)
    results = []
    
    patterns = [
        (r'\b(\d+(?:\.\d+)?%)\s+(increase|decrease|rise|fall|drop|decline)', 'statistic'),
        (r'\b(studies|research|experiments)\s+(show|demonstrate|reveal)', 'finding'),
        (r'\baccording to\s+([A-Z][a-z]+)', 'method'),
    ]
    
    for i, sentence in enumerate(sentences):
        if len(sentence) < 15:
            continue
        # Skip if already has citation
        if re.search(r'\([A-Za-z\s&]+,\s*\d{4}\)', sentence) or re.search(r'\[\d+\]', sentence):
            continue
        
        for pattern, ptype in patterns:
            if re.search(pattern, sentence, re.IGNORECASE):
                results.append({
                    "id": i,
                    "sentence": sentence,
                    "reason": ptype,
                    "keywords": [],
                    "matchedText": ""
                })
                break
    
    return results

# ============ Search Functions ============

async def generate_search_query(sentence: str, config: dict) -> str:
    """Use LLM to generate search query from sentence"""
    prompt = f"""Given this sentence that needs a citation, extract key concepts and generate an optimal academic paper search query.

Sentence: "{sentence}"

Generate a concise search query (2-5 key terms). Return ONLY the query."""

    try:
        return await call_llm(prompt, config)
    except Exception as e:
        print(f"Query generation error: {e}")
        # Fallback
        words = re.findall(r'\b[A-Z][a-z]{{3,}}\b', sentence)
        return ' '.join(words[:4]) if words else sentence[:50]

async def search_with_serpapi(query: str, api_key: str) -> List[dict]:
    """Search via SerpAPI"""
    if not api_key:
        raise Exception("SerpAPI key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://serpapi.com/search",
            params={
                "q": query,
                "engine": "google_scholar",
                "num": 5,
                "api_key": api_key
            }
        )
        if response.status_code != 200:
            raise Exception(f"SerpAPI error: {response.status_code}")
        
        data = response.json()
        results = data.get("organic_results", [])
        
        return [
            {
                "title": r.get("title", "Unknown"),
                "link": r.get("link", ""),
                "snippet": r.get("snippet", ""),
                "source": "SerpAPI"
            }
            for r in results
        ]

async def search_with_tavily(query: str, api_key: str) -> List[dict]:
    """Search via Tavily"""
    if not api_key:
        raise Exception("Tavily key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.tavily.com/search",
            json={
                "query": query,
                "max_results": 5,
                "include_answer": False,
                "include_raw_content": False
            }
        )
        if response.status_code != 200:
            raise Exception(f"Tavily error: {response.status_code}")
        
        data = response.json()
        results = data.get("results", [])
        
        return [
            {
                "title": r.get("title", "Unknown"),
                "link": r.get("url", ""),
                "snippet": r.get("content", ""),
                "source": "Tavily"
            }
            for r in results
        ]

async def search_with_fallback(query: str, config: dict) -> tuple:
    """Try SerpAPI first, then Tavily"""
    serpapi_key = config.get("serpapiApiKey", "")
    tavily_key = config.get("tavilyApiKey", "")
    
    # Try SerpAPI
    if serpapi_key:
        try:
            results = await search_with_serpapi(query, serpapi_key)
            if results:
                return results, "SerpAPI"
        except Exception as e:
            print(f"SerpAPI failed: {e}")
    
    # Try Tavily
    if tavily_key:
        try:
            results = await search_with_tavily(query, tavily_key)
            if results:
                return results, "Tavily"
        except Exception as e:
            print(f"Tavily failed: {e}")
    
    return [], None

def extract_doi(result: dict) -> Optional[str]:
    """Extract DOI from search result"""
    link = result.get("link", "")
    title = result.get("title", "")
    
    patterns = [
        r'doi\.org/(10\.\d{4,}/[^\s]+)',
        r'doi:(10\.\d{4,}/[^\s,;]+)',
        r'(10\.\d{4,}/[^\s,;]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, link + title, re.IGNORECASE)
        if match:
            return match.group(1).rstrip('.,;')
    
    return None

async def fetch_paper_from_crossref(doi: str) -> Optional[dict]:
    """Fetch paper metadata from Crossref"""
    if not doi:
        return None
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"https://api.crossref.org/works/{doi}",
                headers={"Accept": "application/json"}
            )
            if response.status_code != 200:
                return None
            
            data = response.json()
            item = data.get("message", {})
            
            authors = item.get("author", [])
            author_str = ", ".join(
                f"{a.get('given', '')} {a.get('family', '')}".strip()
                for a in authors
            ) or "Unknown Authors"
            
            return {
                "title": item.get("title", ["Unknown"])[0],
                "authors": author_str,
                "year": item.get("published", {}).get("date-parts", [[None]])[0][0] or "n.d.",
                "venue": item.get("container-title", [""])[0],
                "doi": doi,
                "url": item.get("URL", f"https://doi.org/{doi}"),
                "abstract": item.get("abstract", ""),
                "source": "Crossref"
            }
        except Exception as e:
            print(f"Crossref fetch error: {e}")
            return None

async def rank_results_by_relevance(results: List[dict], sentence: str, config: dict) -> List[dict]:
    """Use LLM to rank search results by relevance"""
    if not results or len(results) == 1:
        return results
    
    prompt = f"""Given this sentence that needs a citation:
"{sentence}"

Rate these papers by relevance (most relevant first). Consider if the paper's title matches key concepts in the sentence.

{chr(10).join([f"{i}: {r['title']}" for i, r in enumerate(results)])}

Return a JSON array of indices in order of relevance (0 = most relevant):"""

    try:
        response = await call_llm(prompt, config)
        response = response.replace("```json", "").replace("```", "").strip()
        indices = json.loads(response)
        
        return [results[i] for i in indices if i < len(results)]
    except Exception as e:
        print(f"Ranking error: {e}")
        return results

async def fetch_citations_enhanced(sentence: str, config: dict) -> Optional[dict]:
    """Main function to fetch citation for a sentence"""
    # Generate search query
    search_query = await generate_search_query(sentence, config)
    
    # Try search APIs
    results, source = await search_with_fallback(search_query, config)
    
    if results:
        # Try to get DOI from first result
        doi = extract_doi(results[0])
        
        if doi:
            paper = await fetch_paper_from_crossref(doi)
            if paper:
                paper["searchQuery"] = search_query
                paper["searchSource"] = source
                return paper
        
        # Rank results and try each
        ranked = await rank_results_by_relevance(results, sentence, config)
        
        for result in ranked:
            doi = extract_doi(result)
            if doi:
                paper = await fetch_paper_from_crossref(doi)
                if paper:
                    paper["searchQuery"] = search_query
                    paper["searchSource"] = source
                    return paper
    
    # Fallback: try Semantic Scholar
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params={"query": search_query, "limit": 3, "fields": "title,authors,year,venue,doi,url"}
            )
            if response.status_code == 200:
                data = response.json()
                papers = data.get("data", [])
                if papers:
                    paper = papers[0]
                    return {
                        "title": paper.get("title", "Unknown"),
                        "authors": ", ".join(a.get("name", "") for a in paper.get("authors", [])),
                        "year": paper.get("year", "n.d."),
                        "venue": paper.get("venue", ""),
                        "doi": paper.get("doi", ""),
                        "url": paper.get("url", ""),
                        "source": "Semantic Scholar"
                    }
    except Exception as e:
        print(f"Semantic Scholar error: {e}")
    
    return None

# ============ Routes ============

@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    """Analyze text and find citations"""
    config = request.config or get_config()
    text = request.text
    
    if not text or not text.strip():
        return {"results": []}
    
    # Analyze which sentences need citations
    analysis_results = await analyze_text_with_llm(text, config)
    
    if not analysis_results:
        return {"results": []}
    
    # For each sentence, fetch citation
    enriched_results = []
    
    for item in analysis_results:
        paper = await fetch_citations_enhanced(item["sentence"], config)
        
        enriched_results.append({
            **item,
            "paper": paper
        })
    
    return {"results": enriched_results}

@app.get("/api/config")
async def get_config_endpoint():
    """Get current config (without keys)"""
    cfg = get_config()
    # Return only provider info, not actual keys
    return {
        "llmProvider": cfg["llmProvider"],
        "hasMinimax": bool(cfg["minimaxApiKey"]),
        "hasOpenAI": bool(cfg["openaiApiKey"]),
        "hasGemini": bool(cfg["geminiApiKey"]),
        "hasSerpAPI": bool(cfg["serpapiApiKey"]),
        "hasTavily": bool(cfg["tavilyApiKey"]),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
