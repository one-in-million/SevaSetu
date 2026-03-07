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
    required_keys = ["age", "state", "income", "caste", "gender"]
    missing = [k for k in required_keys if not updated_profile.get(k)]

    return {
       
        "user_profile": updated_profile,
        "missing_fields": missing,
        "is_profile_complete": len(missing) == 0
    }

# --- NODE 2: THE INTENT ROUTER ---
def intent_router_node(state: AgentState):
    print("🤖 [Node: Intent Router] Determining Path...")

    last_message = state["messages"][-1].content
    
    router_prompt = f"""
    Analyze the user's intent based ONLY on their last message.

    USER MESSAGE: "{last_message}"

    CATEGORIES:
    1. 'direct_info': Use this if the user names a SPECIFIC scheme (e.g., 'PM-Kisan', 'Scholarship') 
       or asks "What is [Scheme Name]?" or "Tell me about [Scheme Name]".
    
    2. 'eligibility_audit': Use this ONLY if the user is asking for recommendations for THEMSELVES 
       (e.g., "What do I qualify for?", "Show me schemes for a student", "Check my eligibility").

    RULE: If a specific scheme name is mentioned, it is ALWAYS 'direct_info'.

    Respond with ONLY one word: 'direct_info' or 'eligibility_audit'.
    """

    response = safe_llm_call([SystemMessage(content=router_prompt)])
    decision = response.content.strip().lower()

    path = "direct_info" if "direct_info" in decision else "eligibility_audit"
    print(f"   -> Corrected Path: {path.upper()}")
    return {"messages": state["messages"],"intent": path}

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
    mandatory = ["age", "state", "income", "caste"]
    
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
    3. SITUATIONAL AWARENESS: 
        - If the user just gave information you didn't ask for (e.g., you asked for age, they gave state), 
          acknowledge it politely: "I've noted your [field], but I still need your [original field] to proceed."
        - If they just introduced themselves, greet them by name.
    4. NO HALLUCINATION: Do not make up facts about the user.
    5. NO REPETITION: If they just provided a piece of info, don't ask for it again.

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



# 1. Specialist: Direct Search (Case 1)
def direct_fetcher_node(state: AgentState):
    print("🤖 [Node: Direct Fetcher] Performing merged dynamic search...")
    
    messages = state.get("messages", [])
    if not messages: return {"matched_schemes": []}
    
    last_msg = messages[-1].content
    profile = state.get("user_profile", {})
    # Get the state, but default to an empty string if it's None
    user_state = profile.get("state") or ""

    # 1. Determine Search Depth
    # Only treat as state-only search if last_msg is short AND matches the stored state
    is_state_only = False
    if user_state and len(last_msg.split()) < 3:
        if user_state.lower() in last_msg.lower():
            is_state_only = True
    
    search_limit = 5 if is_state_only else 1

    # 2. Extract Scheme Name
    if not is_state_only:
        name_prompt = f"Extract only the scheme name from: '{last_msg}'. Return only the name (e.g., 'PM-Kisan'). If no specific name exists, return 'NONE'."
        extracted_name = safe_llm_call([SystemMessage(content=name_prompt)]).content.strip()
        print(f"   🧠 Extracted name: {extracted_name}")
    else:
        extracted_name = "NONE"

    try:
        # 3. Clean Query Construction (Fixes the "None" problem)
        if extracted_name != "NONE" and len(extracted_name) > 2:
            # Only add state if it's not empty
            query = f"{extracted_name} {user_state}".strip()
            print(f"   🔍 Searching by Name: '{query}'")
        else:
            query = f"{last_msg} {user_state}".strip()
            print(f"   🔍 Searching raw: '{query}'")

        # 4. Execute Search (Fixes the 'limit' error)
        # Check if your search_schemes function actually supports 'limit'. 
        # If it doesn't, remove 'limit=search_limit' below.
        results = search_schemes(query) 
        
        # If your function doesn't support limit, manually slice the results here:
        results = results[:search_limit]

        if not results:
            print("   ⚠️ No results found. Trying broad semantic search...")
            results = search_schemes(last_msg)[:search_limit]

        print(f"   ✅ Found {len(results)} schemes.")
        return {"matched_schemes": results}
        
    except Exception as e:
        print(f"❌ Direct Fetcher Error: {e}")
        return {"matched_schemes": []}
# 2. Specialist: Audit Search (Case 2)
def audit_fetcher_node(state: AgentState):
    print("🤖 [Node: Audit Fetcher] Finding personal matches...")
    profile = state.get("user_profile", {})
    
    # Construct search query from JSON
    audit_query = f"{profile.get('age')} {profile.get('gender')} {profile.get('caste')} {profile.get('state')} income {profile.get('income')}"

    try:
        results = search_schemes(audit_query)
        if not results: return {"matched_schemes": []}
        return {"messages": state["messages"],"matched_schemes": results[:3]} # Top 3 matches
    except Exception as e:
        print(f"❌ Audit Fetcher Error: {e}")
        return {"matched_schemes": []}

# 3. THE MAIN ENTRY POINT (This is what graph.py calls)
def fetcher_node(state: AgentState):
    """
    This is the node registered in the graph. 
    It routes to the specialists defined above.
    """
    intent = state.get("intent")
    
    if intent == "direct_info":
        return direct_fetcher_node(state)
    else:
        return audit_fetcher_node(state)
     
def strict_auditor_node(state: AgentState):
    """
    NODE 6: The Judge.
    Performs a hard cross-reference between the user profile and the fetched schemes.
    """
    print("⚖️ [Node: Strict Auditor] Verifying 100% eligibility match...")

    profile = state.get("user_profile", {})
    matched_schemes = state.get("matched_schemes", [])
    
    if not matched_schemes:
        return {"audited_schemes": [], "audit_status": "No matches found"}

    # We ask the LLM to act as a strict logic gate
    audit_prompt = f"""
    You are a Strict Government Auditor. 
    Compare the USER PROFILE against the PROVIDED SCHEMES.

    USER PROFILE:
    {json.dumps(profile, indent=2)}

    SCHEMES TO AUDIT:
    {matched_schemes}

    STRICT AUDIT RULES:
    1. INCOME: If user income > scheme limit, REJECT.
    2. AGE: If user age is outside scheme range, REJECT.
    3. GENDER/CASTE/STATE: If any of these do not match the scheme requirements, REJECT.
    4. VERDICT: You must be 100% sure. If a detail is missing in the scheme text, assume it's okay, but if it CONTRADICTS the profile, REJECT.

    OUTPUT FORMAT:
    Return a list of ONLY the schemes that passed 100%. 
    For each, add a short "Audit Note" explaining why they qualify.
    """

    response = safe_llm_call([SystemMessage(content=audit_prompt)])
    
    # We let the Clerk handle the final beauty, but the Auditor decides the 'Truth'
    print(f"   -> Audit complete. Status: Strict logic applied.")
    
    # This node passes the 'Verified' schemes to the Clerk
    return {"matched_schemes": response.content} # Passes filtered content

def response_clerk_node(state: AgentState):
    print("🎨 [Node: Response Clerk] Formatting final output...")
    
    # 1. Grab the search results from the state
    schemes = state.get("matched_schemes", [])
    
    # 2. Safety Check: If the list is empty, explain why
    if not schemes:
        print("   ⚠️ Clerk found NO schemes in state.")
        return {"final_response": "I searched our database but couldn't find a matching scheme for your specific request. Could you try giving me the exact name?"}

    # 3. Use the TOP result from your Vector Search
    top_scheme = schemes[0]
    
    # 4. Create a prompt that FORCES the LLM to use this specific data
    clerk_prompt = f"""
    You are the SevaSetu Assistant. Your goal is to present the following government scheme to the user in a beautiful, structured format.

    DATA TO USE:
    Scheme Name: {top_scheme.get('scheme_name')}
    State: {top_scheme.get('state')}
    Description: {top_scheme.get('details')}
    Benefits: {top_scheme.get('benefits')}
    Documents: {top_scheme.get('documents')}
    Steps: {top_scheme.get('application')}

    FORMATTING RULES:
    - Use '### 🌟 Objective' for the description.
    - Use '### 💰 Financial Benefits' for the benefits (This triggers the GREEN card).
    - Use '### 📋 Required Documents' for the docs (This triggers the ORANGE card).
    - Use '### 🚀 Application Process' for the steps. Format as '1. **Step Name**: Details'.
    - DO NOT add any intro text like "I found this...". Start with the first header.
    """

    response = safe_llm_call([SystemMessage(content=clerk_prompt)])
    
    return {"final_response": response.content}