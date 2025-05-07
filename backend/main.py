from fastapi import FastAPI, Path, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from transformers import pipeline
import sqlite3
import requests
from typing import Optional
from uuid import uuid4
import ast
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

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
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    location TEXT DEFAULT NULL
)
''')
try:
    conn.execute("ALTER TABLE feedback_summary ADD COLUMN sentiment TEXT")
except sqlite3.OperationalError:
    pass

conn.execute('''
CREATE TABLE IF NOT EXISTS feedback_summary (
    id INTEGER PRIMARY KEY,
    session_id TEXT,
    summary TEXT,
    department TEXT,
    sentiment TEXT,
    seen INTEGER DEFAULT 0,
    user_name TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT DEFAULT NULL
)
''')

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

try:
    conn.execute("ALTER TABLE feedback_summary ADD COLUMN location TEXT")
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
    location: Optional[str] = None

@app.post("/submit-feedback")
def submit_feedback(feedback: Feedback):
    try:
        session_id = feedback.session_id if feedback.session_id else str(uuid4())
        location = feedback.location if feedback.location else "Unknown"

        conn.execute(
            "INSERT INTO chat_messages (session_id, role, text,location) VALUES (?, ?, ?,?)",
            (session_id, "user", feedback.message,location)
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

class FinalizePayload(BaseModel):
    user_name: str
    category: str = None
    

@app.post("/finalize-summary/{session_id}")
def finalize_summary(session_id: str, payload: FinalizePayload):
    result = summarize_conversation(session_id)
    summary = result['summary']

    department = payload.category or classify_department(summary)

    user_texts = conn.execute(
        "SELECT text FROM chat_messages WHERE session_id = ? AND role = 'user'",
        (session_id,)
    ).fetchall()
    user_combined = " ".join([row[0] for row in user_texts])
    sentiment_result = sentiment_pipeline(user_combined)[0]
    sentiment = sentiment_result['label']

    conn.execute(
        "INSERT OR REPLACE INTO feedback_summary (session_id, summary, department, sentiment, seen, user_name) VALUES (?, ?, ?, ?, ?, ?)",
        (session_id, summary, department, sentiment, 0, payload.user_name)
    )
    conn.commit()

    return {"summary": summary, "department": department, "sentiment": sentiment}

@app.patch("/update-user-name/{session_id}")
def update_user_name(session_id: str, payload: dict = Body(...)):
    new_name = payload.get("user_name", "").strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty.")

    try:
        conn.execute(
            "UPDATE feedback_summary SET user_name = ? WHERE session_id = ?",
            (new_name, session_id)
        )
        conn.commit()
        return {"status": "updated", "user_name": new_name}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/get-summaries")
def get_summaries():
    cursor = conn.execute(
        "SELECT session_id, summary, department, sentiment, seen, user_name, timestamp FROM feedback_summary ORDER BY timestamp DESC"
    )
    results = []
    for row in cursor.fetchall():
        session_id, summary, department, sentiment, seen, user_name, timestamp = row
        results.append({
            "session_id": session_id,
            "summary": summary,
            "department": department,
            "sentiment": sentiment or "Unknown",
            "seen": bool(seen),
            "user_name": user_name or "Anonymous",
            "timestamp": timestamp
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

@app.get("/conversation/{session_id}")
def get_conversation(session_id: str):
    cursor = conn.execute(
        "SELECT role, text FROM chat_messages WHERE session_id = ? ORDER BY timestamp",
        (session_id,)
    )
    return [{"role": row[0], "text": row[1]} for row in cursor.fetchall()]

@app.delete("/delete-summary/{session_id}")
def delete_summary(session_id: str):
    conn.execute("DELETE FROM feedback_summary WHERE session_id = ?", (session_id,))
    conn.commit()
    return {"status": "deleted"}

@app.get("/generate-action-plan/{session_id}")
def generate_action_plan(session_id: str):
    cursor = conn.execute(
        "SELECT role, text FROM chat_messages WHERE session_id = ? ORDER BY timestamp",
        (session_id,)
    )
    conversation = cursor.fetchall()

    full_text = ""
    for role, text in conversation:
        prefix = "User:" if role == "user" else "Assistant:"
        full_text += f"{prefix} {text}\n"

    prompt = (
        "You are an operations analyst. Read the following user feedback conversation "
        "and generate a concise action plan that either resolves the issue or improves "
        "future customer satisfaction. Be specific and practical:\n\n"
        f"{full_text}\n\nAction Plan:"
    )

    response = requests.post("http://localhost:11434/v1/chat/completions", json={
        "model": "mistral",
        "messages": [{"role": "user", "content": prompt}]
    })

    return {"action_plan": response.json()['choices'][0]['message']['content']}

@app.post("/generate-category-action-plan")
def generate_category_action_plan(payload: dict = Body(...)):
    category = payload.get("category", "")
    cursor = conn.execute(
        "SELECT summary FROM feedback_summary WHERE department = ?" if category != "View All" else "SELECT summary FROM feedback_summary",
        (category,) if category != "View All" else ()
    )
    summaries = cursor.fetchall()
    combined = "\n".join(summary[0] for summary in summaries)

    prompt = (
        f"You are an operations analyst. Given the following user feedback summaries from the '{category}' category, generate a high-impact action plan "
        "to improve satisfaction or business performance. Be specific, practical, and concise.\n\n"
        f"Summaries:\n{combined}\n\nAction Plan:"
    )

    response = requests.post("http://localhost:11434/v1/chat/completions", json={
        "model": "mistral",
        "messages": [{"role": "user", "content": prompt}]
    })

    return { "action_plan": response.json()['choices'][0]['message']['content'] }

@app.post("/assess-impact-effort")
def assess_impact_effort(payload: dict = Body(...)):
    step = payload.get("action_plan", "")

    prompt = (
        f"Review the following customer action step and estimate:\n"
        f"- How impactful this step is for improving customer satisfaction or business results\n"
        f"- How much effort it would likely take to implement\n\n"
        f"Step: {step}\n\n"
        "Respond in Python dictionary format like this:\n"
        "{ 'impact': 'High', 'effort': 'Moderate' }"
    )

    try:
        response = requests.post("http://localhost:11434/v1/chat/completions", json={
            "model": "mistral",
            "messages": [{"role": "user", "content": prompt}]
        })
        response.raise_for_status()
        raw = response.json()['choices'][0]['message']['content']
        print("🧠 Raw Response:", raw)

        parsed = ast.literal_eval(raw)
        return parsed

    except Exception as e:
        print("❌ Error in assessment:", e)
        return { "impact": "", "effort": "" }

@app.post("/assess-impact")
def assess_impact(payload: dict = Body(...)):
    step = payload.get("action_plan", "")

    prompt = (
        f"How impactful is the following customer action step for improving customer satisfaction or business results?\n"
        f"Step: {step}\n\n"
        "Respond with just one word: High, Medium, or Low."
    )

    try:
        response = requests.post("http://localhost:11434/v1/chat/completions", json={
            "model": "mistral",
            "messages": [{"role": "user", "content": prompt}]
        })
        response.raise_for_status()
        impact = response.json()['choices'][0]['message']['content'].strip()
        return {"impact": impact}

    except Exception as e:
        print("❌ Error in impact assessment:", e)
        return {"impact": ""}

@app.post("/assess-effort")
def assess_effort(payload: dict = Body(...)):
    step = payload.get("action_plan", "")

    prompt = (
        f"How much effort would it likely take to implement the following customer action step?\n"
        f"Step: {step}\n\n"
        "Respond with just one word: Easy, Moderate, or Complex."
    )

    try:
        response = requests.post("http://localhost:11434/v1/chat/completions", json={
            "model": "mistral",
            "messages": [{"role": "user", "content": prompt}]
        })
        response.raise_for_status()
        effort = response.json()['choices'][0]['message']['content'].strip()
        return {"effort": effort}

    except Exception as e:
        print("❌ Error in effort assessment:", e)
        return {"effort": ""}

model = SentenceTransformer("all-MiniLM-L6-v2")

@app.post("/find-duplicates")
def find_duplicates(payload: dict = Body(...)):
    category = payload.get("category", "View All")

    # Fetch summaries
    cursor = conn.execute(
        "SELECT session_id, summary, department FROM feedback_summary WHERE department = ?" if category != "View All" else
        "SELECT session_id, summary, department FROM feedback_summary",
        (category,) if category != "View All" else ()
    )
    records = cursor.fetchall()

    summaries = [{"session_id": sid, "summary": text, "department": dept} for sid, text, dept in records]
    texts = [s["summary"] for s in summaries]

    if len(texts) < 2:
        return {"groups": []}  # Not enough to compare

    embeddings = model.encode(texts, convert_to_tensor=True).cpu().numpy()
    similarity_matrix = cosine_similarity(embeddings)

    visited = set()
    groups = []

    threshold = 0.80  # You can tune this

    for i in range(len(texts)):
        if i in visited:
            continue

        group = [summaries[i]]
        visited.add(i)

        for j in range(i + 1, len(texts)):
            if j not in visited and similarity_matrix[i][j] >= threshold:
                group.append(summaries[j])
                visited.add(j)

        if len(group) > 1:
            groups.append(group)

    return {"groups": groups}

@app.get("/get-locationCount")
def get_summaries():
    cursor = conn.execute(
        "SELECT location, COUNT(*) AS count FROM feedback_summary GROUP BY location"
    )
    results = []
    for row in cursor.fetchall():
        location, count = row
        results.append({
            "location": location,
            "count": count
        })
    return results
