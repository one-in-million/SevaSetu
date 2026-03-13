# 🏛️ SevaSetu: Your Bridge to Government Benefits

**SevaSetu** is an AI-powered agentic system designed to help Indian citizens navigate the complex landscape of 3,400+ government schemes. It uses a **multi-agent LangGraph architecture** to audit user profiles, perform semantic searches, and deliver structured, eligibility-verified results.


---

## 🚀 Key Features

* **🎯 Triple-Intent Routing**:
    * **Case A (Eligibility Audit)**: A multi-turn interview process that builds a user profile and filters schemes against strict income, age, and caste criteria.
    * **Case B (Direct Deep-Dive)**: Instant, detailed breakdowns (Objectives, Benefits, Steps) for specific schemes like *PM-Kisan*.
    * **Case C (State Discovery)**: Browse the most popular welfare programs for any specific Indian state.
* **⚖️ Strict Logic Auditor**: A specialized node that cross-references fetched data against the user's "General/SC/ST" category and income levels to prevent mismatching.
* **🟢 Smart UI (Green Cards)**: A custom Next.js frontend that renders markdown "cards" with interactive "Click to Explain" functionality.
* **🔄 Automated Sync Pipeline**: A weekly ETL script that uses Tavily Search and LLMs to fetch, deduplicate, and ingest new 2025 schemes into Qdrant.

---

## 🏗️ Technical Architecture

SevaSetu follows an **Agentic State Machine** pattern:

1.  **Intent Router**: Analyzes the query to set the `response_mode` and `intent`.
2.  **Interviewer**: If mandatory data (like Caste or Gender) is missing, it pauses the search to ask the user.
3.  **Direct/Audit Fetcher**: Performs semantic vector search via Qdrant and expands queries via Tavily.
4.  **Strict Auditor**: Acts as a binary filter to ensure 100% eligibility compliance.
5.  **Response Clerk**: Transforms raw data into user-friendly Markdown blocks styled for the Next.js frontend.

---

## 🛠️ Tech Stack at a Glance

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **LLM** | Cerebras (Llama 3.1-70B) | Ultra-low latency intent detection, profile extraction, and response generation |
| **LLM Framework** | LangChain (`langchain_openai`, `langchain_core`) | Standardized prompting and message formatting |
| **Orchestration** | LangGraph (`StateGraph`) | Multi-node agentic workflow routing and state management |
| **Vector DB** | Qdrant Cloud | High-performance semantic search for 3,400+ government schemes |
| **Embedding Model** | `all-MiniLM-L6-v2` | Local embedding generation (384-dim vectors) |
| **Relational DB** | PostgreSQL (via SQLAlchemy) | Persists user profiles and chat history |
| **API Server** | FastAPI + Uvicorn | High-performance REST API backend |
| **Frontend** | Next.js 14 + Framer Motion | Modern Chat UI and Landing Page |

---

## 📂 Project Structure

```text
├── backend/
│   ├── core/
│   │   ├── graph.py          # StateGraph definition & edge logic
│   │   ├── nodes.py          # Node functions (Router, Auditor, Clerk, etc.)
│   │   └── state.py          # AgentState Pydantic models
│   ├── services/
│   │   ├── llm.py            # Cerebras/LLM configuration
│   │   ├── retriever.py      # Qdrant search & search_schemes logic
│   │   └── sync_schemes.py   # Weekly ETL / Tavily sync script
│   ├── .env                  # Backend environment variables
│   ├── main.py               # FastAPI entry point & routes
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── layout.tsx        # Global fonts & metadata
│   │   ├── page.tsx          # Main Chat UI & Card Rendering logic
│   │   └── globals.css       # Tailwind & custom styling
│   ├── components/           # Reusable UI components
│   ├── public/               # Static assets & icons
│   ├── package.json          # Node dependencies
│   └── tailwind.config.ts    # Custom theme & green-card styling
├── data/
│   └── sevasetu_prepared_data.csv    # Master knowledge base
└── README.md                 # Project documentation
```

## 🚦 Getting Started

### Prerequisites
* [uv](https://docs.astral.sh/uv/) (Python Project Manager)
* [pnpm](https://pnpm.io/) (Node Package Manager)
* PostgreSQL & Qdrant Cloud Account

### 1. Clone & Install
```bash
git clone https://github.com/your-username/sevasetu.git
cd sevasetu
```
### 2. Setup Backend
Create a `.env` file in the `backend/` directory and add your credentials:

```env
CEREBRAS_API_KEY=your_key
TAVILY_API_KEY=your_key
QDRANT_URL=your_url
QDRANT_API_KEY=your_key
```



### 2.1. Backend Setup (using uv)
Navigate to the backend directory. `uv` will automatically handle the virtual environment and Python 3.12 compatibility.


```bash
cd backend
uv sync
uv run python main.py                  
```

### 3. Setup frontend
In a separate terminal, install the dependencies and start the development server:

```bash
cd frontend
# Install dependencies
pnpm install

# Start the development server
pnpm dev
```
## 📝 Example Prompts

| Intent | Prompt |
| :--- | :--- |
| **Audit** | "I am a 25-year-old farmer from Karnataka, income 1.5L. What do I qualify for?" |
| **Deep-Dive** | "How do I apply for the PM-Kisan scheme?" |
| **State Search** | "Show me the top welfare schemes in Rajasthan." |

---

## 🔮 Future Roadmap
- [ ] **Vernacular Support**: Chatting in Hindi, Kannada, and Telugu.
- [ ] **Document OCR**: Upload an Aadhaar card to auto-fill the profile.
- [ ] **Direct Application**: One-click redirect to official `.gov.in` portals.
