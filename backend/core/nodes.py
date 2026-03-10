import json
import time
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from core.state import AgentState
from services.llm import get_llm
from services.retriever import search_schemes

llm = get_llm()

# --- UTILITY: API PROTECTION ---
def safe_llm_call(messages, retries=3, delay=1):
    """Prevents 429 errors and 'Slow Backend' hangs by retrying busy requests."""
    for attempt in range(retries):
        try:
            return llm.invoke(messages)
        except Exception as e:
            if "429" in str(e):
                print(f"⏳ [Cerebras API] Busy... Retrying in {delay}s...")
                time.sleep(delay)
                continue
            raise e
# --- QUERY EXPANSION HELPER ---
def expand_search_query(user_message: str):
    """
    Expands vague user queries into richer semantic search queries.
    Improves vector retrieval accuracy.
    """
    expansion_prompt = f"""
    Expand the following user request into a better semantic search query
    for finding government schemes.

    USER QUERY:
    "{user_message}"

    RULES:
    - Add related keywords if useful
    - Keep it under 20 words
    - Do not explain anything
    - Return ONLY the improved query

    Example:
    Input: farmer scheme
    Output: government agriculture subsidy schemes for farmers India
    """

    response = safe_llm_call([
        SystemMessage(content=expansion_prompt)
    ])

    return response.content.strip()
# --- NODE 1: THE PROFILE MANAGER ---
def profile_manager_node(state: AgentState):
    """
    JOB: Syncs user data into a JSON profile.
    Updates 'state', 'age', 'income', 'caste', 'gender', 'name', 'occupation'.
    """
    print("🤖 [Node: Profile Manager] Syncing User Profile...")

    current_profile = state.get("user_profile", {})
    last_message = state["messages"][-1].content

    # The Extraction Prompt: Strictly JSON, explicit overwrite rules
    extraction_prompt = f"""
    You are a high-precision Data Extraction Agent. 
    Update the User Profile JSON based ONLY on the NEW INPUT.

    CURRENT PROFILE:
    {json.dumps(current_profile, indent=2)}

    NEW INPUT:
    "{last_message}"

    STRICT RULES:
    1. Update these fields: 'name', 'age', 'state', 'income', 'caste', 'gender', 'occupation'.
    2. If NEW input contradicts OLD input (e.g., different state), OVERWRITE the old value immediately.
    3. If info is missing from NEW input, keep the OLD value from CURRENT PROFILE.
    4. If a field is totally unknown, it MUST be null.
    5. Return ONLY a valid JSON object. No markdown backticks, no text.
    """

    response = safe_llm_call([
    SystemMessage(content=extraction_prompt),
    HumanMessage(content=last_message)
])
    
    try:
        # Clean potential markdown residue
        clean_json = response.content.replace("```json", "").replace("```", "").strip()
        updated_profile = json.loads(clean_json)
    except Exception as e:
        print(f"⚠️ [Profile Manager] JSON Parse Error: {e}. Keeping current.")
        updated_profile = current_profile

    # Audit the profile for Case 2 (Personal Audit)
    required_keys = ["age", "state", "income", "caste", "gender","occupation"]
    missing = [k for k in required_keys if not updated_profile.get(k)]

    return {
       
        "user_profile": updated_profile,
        "missing_fields": missing,
        "is_profile_complete": len(missing) == 0
    }

# --- NODE 2: THE INTENT ROUTER ---
def intent_router_node(state: AgentState):
    print("🤖 [Node: Intent Router] Determining Path & Mode...")

    last_message = state["messages"][-1].content

    router_prompt = f"""
    Analyze the user's intent: "{last_message}"

    CATEGORIES:
    1. 'eligibility_audit': User wants scheme recommendations based on their own profile
       (e.g. "What schemes am I eligible for?", "What do I qualify for?").
    2. 'direct_info': User mentions a SPECIFIC scheme name and wants it explained
       (e.g. "Explain PM-Kisan", "Tell me about Ayushman Bharat").
    3. 'state_search': User asks for schemes available in a specific state without naming a scheme
       (e.g. "Schemes in Karnataka", "List Karnataka schemes").

    RESPONSE_MODE rules (strict):
    - eligibility_audit  → response_mode = 'list_only'
    - direct_info        → response_mode = 'full_detail'
    - state_search       → response_mode = 'summary'

    Respond with ONLY a valid JSON object, no markdown:
    {{
      "intent": "eligibility_audit" | "direct_info" | "state_search",
      "response_mode": "list_only" | "full_detail" | "summary",
      "selected_scheme": "Exact scheme name if direct_info, else null",
      "target_state": "State name if state_search, else null"
    }}
    """

    response = safe_llm_call([SystemMessage(content=router_prompt)])

    try:
        clean = response.content.strip().replace("```json", "").replace("```", "")
        data = json.loads(clean)
    except:
        data = {"intent": "eligibility_audit", "response_mode": "list_only", "selected_scheme": None, "target_state": None}

    print(f"   -> Path: {data['intent'].upper()} | Mode: {data['response_mode']}")

    current_profile = state.get("user_profile", {})
    if data.get("target_state"):
        current_profile["state"] = data["target_state"]

    return {
        "intent": data["intent"],
        "response_mode": data["response_mode"],
        "selected_scheme": data.get("selected_scheme"),
        "user_profile": current_profile
    }
def solicitor_node(state: AgentState):
    print("🤖 [Node: The Solicitor] Analyzing request context...")
    
    last_msg = state["messages"][-1].content
    profile = state.get("user_profile", {})
    user_state = profile.get("state")

    # Use the LLM to categorize the input dynamically
    analysis_prompt = f"""
    Analyze this government scheme request: "{last_msg}"
    
    Classify the user's input into one of these categories:
    1. 'STATE_ONLY': User named a state or union territory (e.g., Karnataka, Delhi) but no specific scheme.
    2. 'SPECIFIC': User named a specific program (e.g., PM-Kisan, Garuda, Gruha Jyothi).
    3. 'AMBIGUOUS': User named a general category (e.g., Farmer scheme, Pension, Scholarship) without a state.

    Respond with ONLY the category name.
    """
    
    category = safe_llm_call([SystemMessage(content=analysis_prompt)]).content.strip().upper()

    # LOGIC 1: If it's a general category and we DON'T know the state, ask for it.
    if "AMBIGUOUS" in category and not user_state:
        return {
            "messages": [AIMessage(content="I can help with that! Which state are you from? These types of schemes are usually managed at the state level.")]
        }

    # LOGIC 2: If it's a specific scheme or just a state name, proceed to the Fetcher.
    # No action needed here, the graph edge will handle the transition.
    return {}
def interviewer_node(state: AgentState):
    """
    NODE 4: The Friendly Guide (Case 2 only).
    Gathers missing profile details two at a time with situational awareness.
    """
    print("🤖 [Node: The Interviewer] Conducting profile check...")

    profile = state.get("user_profile", {})
    last_user_msg = state["messages"][-1].content
    
    # --- 1. DEFINE MANDATORY FIELDS ---
    mandatory = ["age", "state", "income", "caste", "gender"]
    
    # --- 2. CALCULATE MISSING FIELDS DYNAMICALLY ---
    missing = [field for field in mandatory if not profile.get(field)]
    
    # --- 3. CHECK FOR COMPLETION ---
    if not missing:
        print(" ✅ Profile Complete! Signalling Graph to Fetch.")
        return {"is_profile_complete": True, "missing_fields": []}

    # --- 4. PREPARE THE PROMPT (YOUR ORIGINAL PROMPT) ---
    interviewer_prompt = f"""
    You are a friendly, helpful assistant for 'SevaSetu'. 
    Your goal is to collect missing profile details for a scheme eligibility audit.

    USER PROFILE CURRENTLY: {profile}
    MISSING FIELDS: {missing}
    USER'S LAST MESSAGE: "{last_user_msg}"

    STRICT INSTRUCTIONS:

    1. TONE: Be professional, warm, and friendly. Not over-the-top, but welcoming.
    2. QUANTITY: Ask for exactly TWO missing details from the list (if at least two are missing).
    3. SITUATIONAL AWARENESS: Do NOT suggest or list any specific schemes yet. Simply acknowledge the information provided and explain that you are gathering details to perform a high-precision eligibility audit. Only ask for the missing fields.
    4. DO NOT suggest, name, or guess any government schemes yet.
    5. Acknowledge the info the user just gave (e.g., "Got it, you're from Karnataka").
    6. State clearly that you need the remaining details to perform an accurate eligibility audit.
    7. Ask for the MISSING FIELDS: {missing}.
    8. NO HALLUCINATION: Do not make up facts about the user.
    9. NO REPETITION: If they just provided a piece of info, don't ask for it again.

    Respond with a natural, conversational message.
    """

    # --- 5. EXECUTE & RETURN ---
    response = safe_llm_call([SystemMessage(content=interviewer_prompt)])
    content = response.content.strip()

    print(f"   -> Interviewer Question: {content[:50]}...")
    
    # We return the message, the updated missing list, and keep complete as False
    return {
        "messages": [AIMessage(content=content)],
        "missing_fields": missing,
        "is_profile_complete": False
    }





# 1. Specialist: Direct & State Search (Case B & C)
def direct_fetcher_node(state: AgentState):
    print("🤖 [Node: Direct Fetcher] Handling Case B/C...")

    mode = state.get("response_mode")
    profile = state.get("user_profile", {})
    user_state = profile.get("state") or ""

    try:
        if mode == "summary":  # Case C: State-wise discovery — top 3
            last_msg = state["messages"][-1].content
            # Use the user's actual message (contains their topic: agriculture, pension, etc.)
            # expand_search_query enriches vague terms into better semantic search keywords
            expanded_query = expand_search_query(last_msg)
            query = f"{expanded_query} in {user_state}" if user_state else expanded_query
            print(f"   🏛️ State Search — Query: '{query}'")
            results = search_schemes(query, user_state=user_state, top_k=5)
            results = results[:3]

        else:  # Case B: Full detail on one specific scheme
            last_msg = state["messages"][-1].content
            # Use the scheme name already extracted by IntentRouter if available
            scheme_name = state.get("selected_scheme") or last_msg
            name_prompt = (
                f"Extract only the government scheme name from this text: '{scheme_name}'. "
                f"Return ONLY the scheme name, nothing else. If none found, return 'NONE'."
            )
            extracted_name = safe_llm_call([SystemMessage(content=name_prompt)]).content.strip()
            query = f"{extracted_name} scheme details benefits eligibility"
            print(f"   🔍 Deep Dive search for: {extracted_name}")
            results = search_schemes(query, user_state=user_state, top_k=3)
            results = results[:1]

        print(f"   ✅ Found {len(results)} schemes.")
        return {"matched_schemes": results}

    except Exception as e:
        print(f"❌ Direct Fetcher Error: {e}")
        return {"matched_schemes": []}

# 2. Specialist: Profile Audit (Case A)
def audit_fetcher_node(state: AgentState):
    print("🤖 [Node: Audit Fetcher] Finding personal matches (Case A)...")
    profile = state.get("user_profile", {})

    # --- Extract the user's TOPIC from their first message ---
    # e.g. "scholarship", "pension", "farming subsidy", etc.
    messages = state.get("messages", [])
    user_messages = [m.content for m in messages if hasattr(m, 'type') and m.type == 'human']
    if not user_messages:
        # fallback: try duck-typing
        from langchain_core.messages import HumanMessage
        user_messages = [m.content for m in messages if isinstance(m, HumanMessage)]
    first_user_msg = user_messages[0] if user_messages else ""

    # Expand the user's original ask into better semantic keywords
    topic_query = expand_search_query(first_user_msg) if first_user_msg else ""
    print(f"   🔎 Topic query expanded: '{topic_query}'")

    # Build profile token string (age, caste, state, income, occupation)
    profile_tokens = " ".join(filter(None, [
        str(profile.get('age', '')),
        profile.get('gender', ''),
        profile.get('caste', ''),
        profile.get('state', ''),
        f"income {profile.get('income', '')}",
        profile.get('occupation', 'citizen')
    ]))

    # Combine topic + profile for a rich, targeted query
    audit_query = f"{topic_query} {profile_tokens}".strip()
    print(f"   🔎 Final audit query: '{audit_query}'")

    try:
        results = search_schemes(audit_query, user_state=profile.get("state"))
        return {"matched_schemes": results[:5]}
    except Exception as e:
        print(f"❌ Audit Fetcher Error: {e}")
        return {"matched_schemes": []}

# 3. THE MAIN ENTRY POINT (Graph Entry)
def fetcher_node(state: AgentState):
    intent = state.get("intent")
    
    # Logic: Case B (Direct) and Case C (State) go to Direct Fetcher
    # Case A (Eligibility) goes to Audit Fetcher
    if intent in ["direct_info", "state_search"]:
        return direct_fetcher_node(state)
    else:
        return audit_fetcher_node(state)
     
def strict_auditor_node(state: AgentState):
    # Pass-through for Cases B & C
    if state.get("intent") != "eligibility_audit":
        return {"matched_schemes": state["matched_schemes"]}

    print("⚖️ [Node: Strict Auditor] Verifying eligibility match...")
    profile = state.get("user_profile", {})
    matched_schemes = state.get("matched_schemes", [])

    if not matched_schemes:
        return {"matched_schemes": []}

    audit_prompt = f"""
    You are a government scheme eligibility checker.

    USER PROFILE:
    {json.dumps(profile, indent=2)}

    CANDIDATE SCHEMES:
    {json.dumps(matched_schemes, indent=2)}

    TASK:
    Review each scheme and return the indices of schemes the user is LIKELY eligible for.

    REJECTION RULES (apply strictly):
    1. Scheme is explicitly for a different caste category that excludes the user's caste.
    2. User's income clearly EXCEEDS the scheme's income limit.
    3. Scheme is explicitly women-only and user is male (or vice versa).
    4. Scheme is for a different state and is NOT a Central/national scheme.

    IMPORTANT:
    - If eligibility criteria are unclear or not stated, INCLUDE the scheme (give benefit of doubt).
    - Scholarship and education schemes for SC/ST students should generally be included for SC users.
    - Prefer to INCLUDE rather than REJECT when in doubt.
    - Return ONLY a JSON list of passing indices, e.g. [0, 1, 2]. If truly none pass, return [0, 1] (top 2 as fallback).
    """

    response = safe_llm_call([SystemMessage(content=audit_prompt)])

    try:
        clean = response.content.strip().replace("```json", "").replace("```", "")
        eligible_indices = json.loads(clean)
        # Safety: if LLM returns empty, fall back to top 2
        if not eligible_indices:
            eligible_indices = list(range(min(2, len(matched_schemes))))
        final_schemes = [matched_schemes[i] for i in eligible_indices if i < len(matched_schemes)]
    except:
        final_schemes = matched_schemes[:2]

    print(f"   -> Audit complete. {len(final_schemes)} schemes verified.")
    return {"matched_schemes": final_schemes}

   

def response_clerk_node(state: AgentState):
    mode = state.get("response_mode", "list_only")
    print(f"🎨 [Node: Response Clerk] Mode: {mode}")

    schemes = state.get("matched_schemes", [])

    if not schemes or not isinstance(schemes, list):
        profile = state.get("user_profile", {})
        state_name = profile.get("state", "your state")
        caste = profile.get("caste", "")
        occupation = profile.get("occupation", "")
        no_results_msg = f"""## SCHEME_DETAIL

# No Matching Schemes Found

### 🎯 Objective
I wasn't able to find government schemes that precisely match your current profile in our database.

### 💰 Financial Benefits
This doesn't mean schemes don't exist — it may mean our database doesn't yet have enough coverage for your specific combination of criteria ({caste} {occupation} in {state_name}).

### 📋 Required Documents
- Visit the official MyScheme portal: https://www.myscheme.gov.in
- Try the National Scholarship Portal: https://scholarships.gov.in
- Contact your nearest Seva Kendra or Common Service Centre (CSC)

### 🚀 Application Process
1. Go to myscheme.gov.in and use their eligibility filter
2. Select your state: {state_name}
3. Fill in your profile details to get a curated list
4. Alternatively, ask me to search for a specific scheme by name"""
        return {"final_response": no_results_msg}

    # ── CASE A: Profile Audit — name + financial benefit only ──────────────────
    if mode == "list_only":
        data_to_pass = schemes[:5]
        clerk_prompt = f"""
You are SevaSetu. A user has undergone a profile eligibility audit.
Format the results using EXACTLY this structure:

## ELIGIBLE_SCHEMES

1. [Scheme Name]
   Financial Benefit: [One line describing the monetary/material benefit]

2. [Scheme Name]
   Financial Benefit: [One line describing the monetary/material benefit]

(and so on for all schemes)

STRICT RULES:
- Begin the response with the exact line: ## ELIGIBLE_SCHEMES
- Number each scheme starting from 1.
- Show ONLY scheme name and financial benefit. Nothing else.
- Do NOT add eligibility criteria, documents, application steps, or any other info.
- Do NOT add any intro or conclusion text.
- Use the data: {json.dumps(data_to_pass)}
"""

    # ── CASE B: Direct Explanation — full scheme detail ─────────────────────────
    elif mode == "full_detail":
        data_to_pass = schemes[:1]
        clerk_prompt = f"""
You are SevaSetu. A user asked for full details about a specific scheme.
Format the response using EXACTLY this structure:

## SCHEME_DETAIL

# [Scheme Name]

### 🎯 Objective
[2-3 sentences describing the scheme's purpose]

### 💰 Financial Benefits
[Describe the exact monetary or material benefits]

### 📋 Required Documents
- [Document 1]
- [Document 2]
- [Document 3]
(list all documents)

### 🚀 Application Process
1. [Step one]
2. [Step two]
3. [Step three]
(list all steps)

STRICT RULES:
- Begin with the exact line: ## SCHEME_DETAIL
- Use the exact section headers shown above.
- Do NOT skip any section.
- Do NOT add intro or conclusion text outside the structure.
- Use the data: {json.dumps(data_to_pass)}
"""

    # ── CASE C: State Discovery — name + eligibility + financial benefit ─────────
    else:  # summary
        data_to_pass = schemes[:3]
        clerk_prompt = f"""
You are SevaSetu. A user asked for top schemes in a state.
Format the results using EXACTLY this structure:

## STATE_SCHEMES

1. [Scheme Name]
   Eligibility: [One line — who qualifies]
   Financial Benefit: [One line — what benefit they get]

2. [Scheme Name]
   Eligibility: [One line — who qualifies]
   Financial Benefit: [One line — what benefit they get]

3. [Scheme Name]
   Eligibility: [One line — who qualifies]
   Financial Benefit: [One line — what benefit they get]

STRICT RULES:
- Begin with the exact line: ## STATE_SCHEMES
- Show ONLY scheme name, eligibility, and financial benefit.
- Number exactly 3 schemes.
- Do NOT add application steps, documents, or any other sections.
- Do NOT add intro or conclusion text.
- Use the data: {json.dumps(data_to_pass)}
"""

    response = safe_llm_call([SystemMessage(content=clerk_prompt)])
    return {"final_response": response.content.strip()}