# backend/core/state.py
from typing import TypedDict, List, Dict, Any, Optional
from typing import Annotated, TypedDict, List, Dict, Any, Optional
from langchain_core.messages import BaseMessage
import operator

class AgentState(TypedDict):
    # 1. Conversation History
    messages: Annotated[List[BaseMessage], operator.add]
    
    # 2. User Profile (Fetched from PostgreSQL Node)
    user_profile: Dict[str, Any]
    
    # 3. Router Intent
    # "direct_info" (Case 1) or "eligibility_audit" (Case 2)
    intent: Optional[str] 
    
    # 4. Retrieval Context
    # The schemes pulled from Qdrant Cloud
    matched_schemes: List[Dict[str, Any]]
    
    # 5. Missing Data Tracking
    # Fields the Solicitor or Interviewer needs to ask the user for
    missing_fields: List[str]
    
    # 6. Final Output
    # The final response formatted by the Clerk
    final_response: Optional[str]
    is_profile_complete: Optional[bool]