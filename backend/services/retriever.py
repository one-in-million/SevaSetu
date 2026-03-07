# backend/services/retriever.py
import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http.models import Filter, FieldCondition, MatchValue
from sentence_transformers import SentenceTransformer

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION_NAME = os.getenv("QDRANT_COLLECTION_NAME", "sevasetu_schemes")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")

# Initialize Qdrant Client
client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY,timeout=120,          # Increase to 2 minutes for cloud stability
    prefer_grpc=False,
    # FORCE REST instead of gRPC
    
    # Add this to ensure the connection isn't dropped by Windows 
    # during long handshakes
    https=True    # Force HTTP/REST to avoid firewall/socket issues on Windows
  )


# Initialize the Local Embedding Model
model = SentenceTransformer(EMBEDDING_MODEL_NAME)


def search_schemes(query_text: str, user_state: str = None, top_k: int = 3):
    """
    Converts query to a vector, searches Qdrant, and optionally filters by state.
    """
    print(f"🔍 [Retriever] Searching Qdrant for: '{query_text}'")
    
    # 1. Convert text to vector
    query_vector = model.encode(query_text).tolist()
    
    # 2. Setup hard filters (e.g., matching the user's state or Central schemes)
    query_filter = None
    if user_state:
        query_filter = Filter(
            should=[
                FieldCondition(key="state", match=MatchValue(value=user_state)),
                FieldCondition(key="level", match=MatchValue(value="Central"))
            ]
        )
        
    # 3. Perform the semantic search
    search_results = client.search(
        collection_name=QDRANT_COLLECTION_NAME,
        query_vector=query_vector,
        query_filter=query_filter,
        limit=top_k
    )
    
    # 4. Extract and return the payloads
    schemes = [hit.payload for hit in search_results]
    return schemes