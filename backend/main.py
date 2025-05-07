from fastapi import FastAPI, Path, Body, HTTPException, Query
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
from datetime import datetime, timedelta
from collections import defaultdict

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

try:
    conn.execute("ALTER TABLE chat_messages ADD COLUMN location TEXT DEFAULT NULL")
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
            "INSERT INTO chat_messages (session_id, role, text, location) VALUES (?, ?, ?, ?)",
            (session_id, "user", feedback.message, location)
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
        import traceback
        print("❌ submit-feedback error:", e)
        traceback.print_exc()
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
    try:
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
    except Exception as e:
        print("❌ get-summaries failed:", e)
        raise HTTPException(status_code=500, detail=str(e))

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

@app.get("/sentiment-breakdown")
def sentiment_breakdown(days: int = Query(30, description="Number of days to look back")):
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")

    query = """
    SELECT department, sentiment, COUNT(*) as count
    FROM feedback_summary
    WHERE timestamp >= ?
    GROUP BY department, sentiment
    """
    rows = conn.execute(query, (cutoff,)).fetchall()

    result = {}
    for dept, sentiment, count in rows:
        if dept not in result:
            result[dept] = {"positive": 0, "neutral": 0, "negative": 0}
        result[dept][sentiment.lower()] += count

    return result

@app.get("/sentiment-trend")
def sentiment_trend(category: str = Query("View All"), group_by: str = Query("day")):
    cutoff = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d %H:%M:%S")
    query = """
    SELECT timestamp, sentiment FROM feedback_summary
    WHERE timestamp >= ?
    """
    params = [cutoff]

    if category != "View All":
        query += " AND department = ?"
        params.append(category)

    rows = conn.execute(query, params).fetchall()

    grouped = defaultdict(lambda: {"positive": 0, "neutral": 0, "negative": 0})

    for timestamp, sentiment in rows:
        dt = datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S")
        if group_by == "week":
            key = dt.strftime("%Y-W%U")
        else:
            key = dt.strftime("%Y-%m-%d")
        grouped[key][sentiment.lower()] += 1

    result = [
        {"date": k, **v} for k, v in sorted(grouped.items())
    ]
    return result

@app.get("/top-themes")
def top_themes(category: str = Query(...)):
    query = "SELECT summary FROM feedback_summary WHERE department = ?"
    rows = conn.execute(query, (category,)).fetchall()
    from collections import Counter
    import re

    all_words = []
    for (summary,) in rows:
        words = re.findall(r"\b\w{5,}\b", summary.lower())
        all_words.extend(words)

    counter = Counter(all_words)
    most_common = counter.most_common(10)
    return [{"term": term, "count": count} for term, count in most_common]

@app.get("/top-quotes")
def top_quotes(category: str = Query(...)):
    query = "SELECT summary, sentiment FROM feedback_summary WHERE department = ?"
    rows = conn.execute(query, (category,)).fetchall()

    positive = [text for text, s in rows if s.lower() == "positive"][:5]
    negative = [text for text, s in rows if s.lower() == "negative"][:5]

    return {"positive": positive, "negative": negative}

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
