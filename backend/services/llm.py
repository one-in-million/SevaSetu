# backend/services/llm.py
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
CEREBRAS_MODEL = os.getenv("CEREBRAS_MODEL", "gpt-oss-120b")

# We use ChatOpenAI because Cerebras provides an OpenAI-compatible API
# This gives us access to LangChain's powerful prompting tools
llm = ChatOpenAI(
    api_key=CEREBRAS_API_KEY,
    base_url="https://api.cerebras.ai/v1", # Cerebras API Endpoint
    model=CEREBRAS_MODEL,
    temperature=0.1,
    timeout=60, # Give Cerebras a full minute to respond
    max_retries=2, # Low temperature for factual, strict agent logic
    max_tokens=1024
)

def get_llm():
    """Returns the configured Cerebras LLM instance."""
    return llm