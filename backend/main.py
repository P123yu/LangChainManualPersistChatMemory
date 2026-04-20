import os
from typing import List, Union
from typing_extensions import Annotated
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

# --- 1. TOOLS DEFINITION ---

def get_weather(city: str) -> str:
    """Get current weather for a specific city. Input should be a city name."""
    # Mock data for demonstration
    weather_data = {
        "mumbai": "32°C, Sunny",
        "bangalore": "24°C, Pleasant",
        "delhi": "38°C, Hot",
        "new york": "15°C, Rainy"
    }
    return weather_data.get(city.lower(), f"Weather data for {city} is currently unavailable.")

def get_balance(user_id: str) -> str:
    """Fetch the account balance for a user. Input should be a numeric user ID (e.g., '123')."""
    # Mock data for demonstration
    balances = {
        "123": "₹10,500.25",
        "456": "₹2,000.00",
        "789": "₹50,000.00"
    }
    return balances.get(user_id, "User ID not found in system.")

# Tool metadata for LangChain
tools_metadata = [
    {
        "name": "get_weather",
        "description": "Get current weather for a specific city. Input should be a city name.",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string"}
            },
            "required": ["city"]
        }
    },
    {
        "name": "get_balance",
        "description": "Fetch the account balance for a user. Input should be a numeric user ID (e.g., '123').",
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string"}
            },
            "required": ["user_id"]
        }
    }
]

# Map names to functions
available_tools = {
    "get_weather": get_weather,
    "get_balance": get_balance
}

# --- 2. AGENT LOGIC (MANUAL LOOP for Python 3.8 Compatibility) ---

# Initialize LLM with Gemini settings
llm = ChatOpenAI(
    model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    openai_api_key=os.getenv("GEMINI_API_KEY"),
    base_url=os.getenv("GEMINI_BASE_URL"),
    temperature=0
).bind_tools(tools_metadata)

async def run_agent_loop(messages: List[BaseMessage]):
    current_messages = list(messages)
    
    # Maximum 5 iterations to prevent infinite loops
    for _ in range(5):
        response = llm.invoke(current_messages)
        current_messages.append(response)
        
        if not response.tool_calls:
            return response.content
        
        # Handle tool calls
        for tool_call in response.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            
            if tool_name in available_tools:
                tool_func = available_tools[tool_name]
                tool_result = tool_func(**tool_args)
                
                # Add tool message to history
                current_messages.append(ToolMessage(
                    tool_call_id=tool_call["id"],
                    content=str(tool_result)
                ))
            else:
                current_messages.append(ToolMessage(
                    tool_call_id=tool_call["id"],
                    content=f"Tool {tool_name} not found."
                ))
    
    return current_messages[-1].content

# --- 3. FASTAPI APPLICATION ---

app = FastAPI(title="Gemini LangChain Chatbot (Compatible)")

# CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # Convert history dicts to LangChain messages
        messages = []
        for msg in request.history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))
        
        # Add current user message
        messages.append(HumanMessage(content=request.message))
        
        # Add system instruction
        system_msg = SystemMessage(content="You are a helpful AI assistant. Use tools when necessary to provide accurate info.")
        input_messages = [system_msg] + messages

        # Run Manual Agent Loop
        final_content = await run_agent_loop(input_messages)
        
        return {"response": final_content}
    
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)




# @app.post("/chat")
# async def chat_endpoint(request: ChatRequest):

#     # STEP A: Receive JSON from frontend
#     # {role, content}

#     messages = []

#     # STEP B: Convert JSON → LangChain objects
#     for msg in request.history:
#         if msg["role"] == "user":
#             messages.append(HumanMessage(content=msg["content"]))
#         elif msg["role"] == "assistant":
#             messages.append(AIMessage(content=msg["content"]))
    
#     # STEP C: Add latest user message
#     messages.append(HumanMessage(content=request.message))
    
#     # STEP D: Add system message
#     system_msg = SystemMessage(content="You are a helpful AI assistant...")
#     input_messages = [system_msg] + messages

#     # STEP E: Run agent loop (main brain)
#     final_content = await run_agent_loop(input_messages)
    
#     # STEP F: Return response → frontend (object → JSON)
#     return {"response": final_content}



# # --- 2. AGENT LOGIC (MANUAL LOOP for Python 3.8 Compatibility) ---

# async def run_agent_loop(messages: List[BaseMessage]):

#     # STEP 1: Initial messages received (objects: SystemMessage, HumanMessage)
#     current_messages = list(messages)
    
#     # Maximum 5 iterations to prevent infinite loops
#     for _ in range(5):

#         # STEP 2: Send messages to LLM (LangChain converts objects → JSON internally)
#         response = llm.invoke(current_messages)

#         # STEP 3: LLM response (JSON → converted back to AIMessage object)
#         current_messages.append(response)
        
#         # STEP 4: Check → does LLM want to call a tool?
#         if not response.tool_calls:
#             # STEP 9: No tool → FINAL ANSWER → exit loop
#             return response.content
        
#         # STEP 5: LLM requested tool execution
#         for tool_call in response.tool_calls:

#             tool_name = tool_call["name"]
#             tool_args = tool_call["args"]
            
#             # STEP 6: Backend finds and executes tool
#             if tool_name in available_tools:
#                 tool_func = available_tools[tool_name]
#                 tool_result = tool_func(**tool_args)
                
#                 # STEP 7: Add ToolMessage (tool result) to messages
#                 current_messages.append(ToolMessage(
#                     tool_call_id=tool_call["id"],
#                     content=str(tool_result)
#                 ))
#             else:
#                 current_messages.append(ToolMessage(
#                     tool_call_id=tool_call["id"],
#                     content=f"Tool {tool_name} not found."
#                 ))

#         # STEP 8: Loop continues → updated messages sent again to LLM

#     # Safety fallback
#     return current_messages[-1].content
