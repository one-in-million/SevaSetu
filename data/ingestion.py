import os
import pandas as pd
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
load_dotenv()
print("QDRANT_URL =", os.getenv("QDRANT_URL"))
print("QDRANT_API_KEY =", os.getenv("QDRANT_API_KEY"))
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION_NAME = os.getenv("QDRANT_COLLECTION_NAME", "sevasetu_schemes")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")

def run_ingestion():
    # 2. Initialize Qdrant Client (Cloud)
    print("☁️ Connecting to Qdrant Cloud...")
    client = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
        timeout=60 # Extended timeout for cloud uploads
    )

    # 3. Initialize the Local Embedding Model
    print(f"🧠 Loading embedding model: {EMBEDDING_MODEL_NAME}...")
    model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    
    # all-MiniLM-L6-v2 outputs a 384-dimensional vector
    VECTOR_SIZE = model.get_sentence_embedding_dimension() 

    # 4. Setup the Qdrant Collection
    print(f"📂 Setting up collection: '{QDRANT_COLLECTION_NAME}'...")
    if client.collection_exists(collection_name=QDRANT_COLLECTION_NAME):
        print("⚠️ Collection already exists. Deleting to start fresh...")
        client.delete_collection(collection_name=QDRANT_COLLECTION_NAME)

    client.create_collection(
        collection_name=QDRANT_COLLECTION_NAME,
        vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
    )
         # ... after client.create_collection(...) 

    # Add these lines to create the necessary indexes for filtering
    from qdrant_client.http.models import PayloadSchemaType

    print("🏷️ Creating payload indexes for 'state' and 'level'...")
    client.create_payload_index(
        collection_name=QDRANT_COLLECTION_NAME,
        field_name="state",
        field_schema=PayloadSchemaType.KEYWORD,
)
    client.create_payload_index(
        collection_name=QDRANT_COLLECTION_NAME,
        field_name="level",
        field_schema=PayloadSchemaType.KEYWORD,
)

    # 5. Load the Prepared Data
    print("📄 Loading CSV dataset...")
    # Assuming this script is in the same folder as the CSV, adjust path if needed
    csv_path = "sevasetu_prepared_data.csv" 
    df = pd.read_csv(csv_path)
    df = df.fillna('') # Safety net for any blank cells

    # 6. Process and Upload in Batches
    BATCH_SIZE = 100
    points = []

    print(f"🚀 Starting ingestion of {len(df)} schemes into Qdrant...")
    
    # tqdm gives us a nice progress bar in the terminal
    for i, row in tqdm(df.iterrows(), total=len(df)):
        # The text we want to convert into a vector (The "Primary Key")
        search_text = str(row['search_context'])
        
        # Generate the vector embedding (a list of 384 numbers)
        vector = model.encode(search_text).tolist()
        
        # The payload: The actual data the Agentic Bot will read
        payload = {
            "scheme_name": str(row['scheme_name']),
            "state": str(row['state']),
            "level": str(row['level']),
            "category": str(row['schemeCategory']),
            "details": str(row['details']),
            "benefits": str(row['benefits']),
            "eligibility": str(row['eligibility']), # The AI Auditor reads this
            "application": str(row['application']), # The Clerk reads this
            "documents": str(row['documents'])      # The Clerk reads this
        }
        
        # Create a Qdrant Point using the dataframe index as the unique ID
        point = PointStruct(
            id=i,  
            vector=vector,
            payload=payload
        )
        points.append(point)
        
        # Upload chunk to cloud when batch is full
        if len(points) >= BATCH_SIZE:
            client.upsert(
                collection_name=QDRANT_COLLECTION_NAME,
                points=points
            )
            points = [] # Clear the batch list

    # Upload any remaining points in the final batch
    if points:
        client.upsert(
            collection_name=QDRANT_COLLECTION_NAME,
            points=points
        )

    print("✅ Ingestion Complete! All schemes are live in your Qdrant Cloud database.")

if __name__ == "__main__":
    run_ingestion()