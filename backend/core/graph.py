from langgraph.graph import StateGraph, END, START
from core.state import AgentState
from langchain_core.messages import AIMessage
from core.nodes import (
    profile_manager_node,
    intent_router_node,
    solicitor_node,
    interviewer_node,
    direct_fetcher_node,
    fetcher_node,
    strict_auditor_node,
    response_clerk_node
)

# 1. INITIALIZE THE ONE AND ONLY WORKFLOW
workflow = StateGraph(AgentState)

# 2. ADD ALL NODES (Ensure names match the edge logic below)
workflow.add_node("ProfileManager", profile_manager_node)
workflow.add_node("IntentRouter", intent_router_node)
workflow.add_node("Solicitor", solicitor_node)
workflow.add_node("Interviewer", interviewer_node)
workflow.add_node("DirectFetcher", direct_fetcher_node)
workflow.add_node("Fetcher", fetcher_node)
workflow.add_node("Auditor", strict_auditor_node)
workflow.add_node("Clerk", response_clerk_node)

# 3. DEFINE ROUTING FUNCTIONS

def route_intent(state: AgentState):
    intent = state.get("intent")
    print(f"DEBUG: Intent detected -> {intent}")
    
    # Case A: Profile Audit needs the Interviewer
    if intent == "eligibility_audit":
        return "audit_path"
    
    # Case B (Direct Info) AND Case C (State Search) go to Solicitor/DirectFetcher
    return "direct_path"


def check_solicitor_status(state: AgentState):
    """CASE 1: Stop if Solicitor asked a question, otherwise go to Direct Fetcher."""
    messages = state.get("messages", [])
    if messages and isinstance(messages[-1], AIMessage):
        print("DEBUG: Solicitor waiting for user input.")
        return "wait"
    return "fetch"

def check_interviewer_status(state: AgentState):
    """CASE 2: Stop if Interviewer needs more data, otherwise go to Auditor Fetcher."""
    # We check the 'is_profile_complete' flag
    is_complete = state.get("is_profile_complete", False)
    
    # CRITICAL: Also check if the Interviewer JUST added an AIMessage.
    # If the last message is an AIMessage, it means the bot ASKED A QUESTION.
    # If the last message is a HumanMessage and is_complete is True, it means we MOVE ON.
    messages = state.get("messages", [])
    last_msg_is_ai = isinstance(messages[-1], AIMessage) if messages else False

    if is_complete:
        print("✅ DEBUG: Profile verified COMPLETE. Moving to Fetcher.")
        return "fetch"
    
    print("❌ DEBUG: Profile still INCOMPLETE or Question Asked. Stopping.")
    return "wait"

def route_after_fetch(state: AgentState):
    """
    If it's Case A (Audit), go through the Auditor.
    If it's Case B or C, go straight to the Clerk.
    """
    if state.get("intent") == "eligibility_audit":
        return "audit"
    return "clerk"

# 4. DEFINE THE FLOW (EDGES)

# --- 4. DEFINE THE FLOW (EDGES) ---

# Entry Point
workflow.add_edge(START, "ProfileManager")
workflow.add_edge("ProfileManager", "IntentRouter")

# 🚦 ROUTE 1: The First Split
workflow.add_conditional_edges(
    "IntentRouter",
    route_intent,
    {
        "audit_path": "Interviewer", # Case A
        "direct_path": "Solicitor"   # Case B & C
    }
)

# 🏢 BRANCH: Solicitor (Case B & C)
workflow.add_conditional_edges(
    "Solicitor",
    check_solicitor_status,
    {
        "fetch": "DirectFetcher",
        "wait": END
    }
)
workflow.add_edge("DirectFetcher", "Clerk")

# 🎤 BRANCH: Interviewer (Case A)
workflow.add_conditional_edges(
    "Interviewer",
    check_interviewer_status,
    {
        "fetch": "Fetcher",
        "wait": END
    }
)

# ⚖️ FINAL JUNCTION: To Audit or Not to Audit?
workflow.add_conditional_edges(
    "Fetcher",
    route_after_fetch,
    {
        "audit": "Auditor",
        "clerk": "Clerk"
    }
)

# Finish Line
workflow.add_edge("Auditor", "Clerk")
workflow.add_edge("Clerk", END)

# 5. COMPILE
app_graph = workflow.compile()