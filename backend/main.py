from fastapi import FastAPI
from fastapi import Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from transformers import pipeline
import sqlite3
import requests
from typing import Optional
from uuid import uuid4

app = FastAPI()

# === CORS SETUP ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === DATABASE SETUP ===
conn = sqlite3.connect("feedback.db", check_same_thread=False)

conn.execute('''
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY,
    session_id TEXT,
    role TEXT,
    text TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)
''')

conn.execute('''
CREATE TABLE IF NOT EXISTS feedback_summary (
    id INTEGER PRIMARY KEY,
    session_id TEXT,
    summary TEXT,
    department TEXT,
    sentiment TEXT,
    seen INTEGER DEFAULT 0,
    user_name TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)
''')

# Add columns if they don’t exist
try:
    conn.execute("ALTER TABLE feedback_summary ADD COLUMN sentiment TEXT")
except sqlite3.OperationalError:
    pass

try:
    conn.execute("ALTER TABLE feedback_summary ADD COLUMN seen INTEGER DEFAULT 0")
except sqlite3.OperationalError:
    pass

try:
    conn.execute("ALTER TABLE feedback_summary ADD COLUMN user_name TEXT")
except sqlite3.OperationalError:
    pass

conn.execute("UPDATE feedback_summary SET sentiment = 'Unknown' WHERE sentiment IS NULL")
conn.commit()

sentiment_pipeline = pipeline("sentiment-analysis")

class Feedback(BaseModel):
    message: Optional[str] = None
    session_id: Optional[str] = None
    category: Optional[str] = None
    user_name: Optional[str] = None


@app.post("/submit-feedback")
def submit_feedback(feedback: Feedback):
    try:
        session_id = feedback.session_id if feedback.session_id else str(uuid4())

        conn.execute(
            "INSERT INTO chat_messages (session_id, role, text) VALUES (?, ?, ?)",
            (session_id, "user", feedback.message)
        )
        conn.commit()

        bot_reply = generate_bot_reply(session_id, feedback.message)

        conn.execute(
            "INSERT INTO chat_messages (session_id, role, text) VALUES (?, ?, ?)",
            (session_id, "assistant", bot_reply)
        )
        conn.commit()

        return {"status": "ok", "bot_reply": bot_reply, "session_id": session_id}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

def generate_bot_reply(session_id, user_message):
    payload = {
        "model": "mistral",
        "messages": [
            {"role": "system", "content": "You are an intelligent feedback assistant. Respond concisely in 1-2 sentences maximum. Ask short, polite follow-up questions."},
            {"role": "user", "content": user_message}
        ]
    }

    try:
        response = requests.post("http://localhost:11434/v1/chat/completions", json=payload)
        response.raise_for_status()
        data = response.json()
        return data['choices'][0]['message']['content']
    except Exception as e:
        print(f"Error talking to Ollama: {e}")
        return "🤖 Sorry, I'm having trouble responding right now."

@app.get("/summarize/{session_id}")
def summarize_conversation(session_id: str):
    cursor = conn.execute(
        "SELECT role, text FROM chat_messages WHERE session_id = ? ORDER BY timestamp",
        (session_id,)
    )
    conversation = cursor.fetchall()

    full_text = ""
    for role, text in conversation:
        prefix = "User:" if role == "user" else "Assistant:"
        full_text += f"{prefix} {text}\n"

    response = requests.post("http://localhost:11434/v1/chat/completions", json={
        "model": "mistral",
        "messages": [
            {"role": "system", "content": "You summarize customer conversations into 1 sentence. If the customer's complaint is straightforward, then you can let them know where it will be directed and end the conversation. You are unable to correct the customer's technical requests, but can let them know that the request will be delivered to the right department."},
            {"role": "user", "content": f"Summarize this conversation:\n{full_text}"}
        ]
    })

    summary = response.json()['choices'][0]['message']['content']
    return {"summary": summary}

@app.post("/finalize-summary/{session_id}")
def finalize_summary(session_id: str, feedback: Feedback):
    user_name = feedback.user_name
    result = summarize_conversation(session_id)
    summary = result['summary']
    department = classify_department(summary)

    # Run sentiment analysis
    user_texts = conn.execute(
        "SELECT text FROM chat_messages WHERE session_id = ? AND role = 'user'",
        (session_id,)
    ).fetchall()
    user_combined = " ".join([row[0] for row in user_texts])
    sentiment_result = sentiment_pipeline(user_combined)[0]
    sentiment = sentiment_result['label']

    conn.execute(
        "INSERT OR REPLACE INTO feedback_summary (session_id, summary, department, sentiment, seen, user_name) VALUES (?, ?, ?, ?, ?, ?)",
        (session_id, summary, department, sentiment, 0, feedback.user_name)
    )
    conn.commit()

    return {"summary": summary, "department": department, "sentiment": sentiment}

@app.get("/get-summaries")
def get_summaries():
    cursor = conn.execute(
        "SELECT session_id, summary, department, sentiment, seen, user_name FROM feedback_summary ORDER BY timestamp DESC"
    )
    results = []
    for row in cursor.fetchall():
        session_id, summary, department, sentiment, seen, user_name = row
        results.append({
            "session_id": session_id,
            "summary": summary,
            "department": department,
            "sentiment": sentiment or "Unknown",
            "seen": bool(seen),
            "user_name": user_name or "Anonymous"
        })
    return results

@app.post("/mark-seen/{category}")
def mark_seen(category: str = Path(..., title="Category name")):
    try:
        conn.execute(
            "UPDATE feedback_summary SET seen = 1 WHERE department = ?",
            (category,)
        )
        conn.commit()
        return {"status": "updated"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.delete("/delete-summary/{session_id}")
def delete_summary(session_id: str):
    conn.execute("DELETE FROM feedback_summary WHERE session_id = ?", (session_id,))
    conn.commit()
    return {"status": "deleted"}

def classify_department(summary_text):
    text = summary_text.lower()
    if "taste" in text:
        return "Taste"
    elif "packaging" in text:
        return "Packaging"
    elif "price" in text:
        return "Price"
    elif "availability" in text:
        return "Availability"
    elif "store" in text or "experience" in text:
        return "Store Experience"
    elif "promotion" in text or "deal" in text:
        return "Promotions"
    elif any(word in text for word in ["sustainability", "sustainable", "eco", "environment"]):
        return "Sustainability"
    elif "family" in text or "kids" in text:
        return "Family-Friendliness"
    else:
        return "Uncategorized"
