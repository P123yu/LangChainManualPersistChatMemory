import os
import json
from typing import List, Optional
from typing_extensions import Annotated
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage
from fastapi.middleware.cors import CORSMiddleware
import psycopg

# Load environment variables
load_dotenv()

# --- 0. DATABASE SETUP ---

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/langchain-manual")
# Convert SQLAlchemy-style URL to psycopg-compatible (remove +psycopg suffix if present)
PSYCOPG_URL = DB_URL.replace("postgresql+psycopg://", "postgresql://")

def init_db():
    """Create the message_store table if it doesn't exist."""
    with psycopg.connect(PSYCOPG_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS message_store (
                    id SERIAL PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_message_store_session 
                    ON message_store(session_id);
            """)
            conn.commit()

def save_message(session_id: str, role: str, content: str):
    """Save a single message to the database."""
    with psycopg.connect(PSYCOPG_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO message_store (session_id, role, content) VALUES (%s, %s, %s)",
                (session_id, role, content)
            )
            conn.commit()

def get_messages(session_id: str) -> List[dict]:
    """Retrieve all messages for a session from the database."""
    with psycopg.connect(PSYCOPG_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT role, content FROM message_store WHERE session_id = %s ORDER BY id ASC",
                (session_id,)
            )
            rows = cur.fetchall()
            return [{"role": row[0], "content": row[1]} for row in rows]

def convert_to_langchain_messages(messages: List[dict]) -> List[BaseMessage]:
    """Convert DB messages to LangChain message objects."""
    lc_messages = []
    for msg in messages:
        if msg["role"] == "system":
            lc_messages.append(SystemMessage(content=msg["content"]))
        elif msg["role"] == "user":
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            lc_messages.append(AIMessage(content=msg["content"]))
    return lc_messages

# Initialize the DB on startup
init_db()
print("[OK] Database connected & message_store table ready!")

# --- 1. TOOLS DEFINITION ---

def get_weather(city: str) -> str:
    """Get current weather for a specific city. Input should be a city name."""
    weather_data = {
        "mumbai": "32°C, Sunny",
        "bangalore": "24°C, Pleasant",
        "delhi": "38°C, Hot",
        "new york": "15°C, Rainy"
    }
    return weather_data.get(city.lower(), f"Weather data for {city} is currently unavailable.")

def get_balance(user_id: str) -> str:
    """Fetch the account balance for a user. Input should be a numeric user ID (e.g., '123')."""
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

# --- 2. AGENT LOGIC ---

llm = ChatOpenAI(
    model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    openai_api_key=os.getenv("GEMINI_API_KEY"),
    base_url=os.getenv("GEMINI_BASE_URL"),
    temperature=0
).bind_tools(tools_metadata)

async def run_agent_loop(messages: List[BaseMessage]):
    current_messages = list(messages)
    
    for _ in range(5):
        response = llm.invoke(current_messages)
        current_messages.append(response)
        
        if not response.tool_calls:
            return response.content
        
        for tool_call in response.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            
            if tool_name in available_tools:
                tool_func = available_tools[tool_name]
                tool_result = tool_func(**tool_args)
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

app = FastAPI(title="Gemini Chatbot with Persistent Memory")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    session_id: str

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # 1. Get existing history from DB
        db_messages = get_messages(request.session_id)

        # 2. If new session, save system message first
        if len(db_messages) == 0:
            save_message(request.session_id, "system",
                         "You are a helpful AI assistant with persistent memory. "
                         "You CAN remember previous messages in this conversation. "
                         "The messages before the current one are your conversation history - use them to answer follow-up questions. "
                         "Use tools when necessary to provide accurate info.")
        
        # 3. Save user message to DB
        save_message(request.session_id, "user", request.message)

        # 4. Reload full history (now includes the new user message)
        db_messages = get_messages(request.session_id)

        # 5. Convert to LangChain message objects
        lc_messages = convert_to_langchain_messages(db_messages)

        # 6. Run Agent Loop
        final_content = await run_agent_loop(lc_messages)
        
        # 7. Save assistant response to DB
        save_message(request.session_id, "assistant", final_content)
        
        return {"response": final_content}
    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history/{session_id}")
async def get_history(session_id: str):
    """Fetch chat history for a session (excludes system messages from UI)."""
    try:
        db_messages = get_messages(session_id)
        # Filter out system messages for the frontend
        ui_messages = [m for m in db_messages if m["role"] != "system"]
        return {"history": ui_messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
