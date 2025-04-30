# 🛒 Voice of the Shopper

A full-stack feedback assistant powered by AI, allowing users to submit conversational feedback and giving admins tools to view, categorize, and analyze sentiment across all submissions.

---

## 🚀 Getting Started

Follow these steps to set up the project locally on your machine.

---

## 🧱 Project Structure

voice_of_the_shopper/ │ ├── backend/ # FastAPI server + SQLite + Ollama integration │ ├── main.py │ ├── feedback.db │ └── requirements.txt │ ├── frontend/ # React + SCSS UI │ ├── public/ │ ├── src/ │ └── package.json │ └── README.md

yaml
Copy
Edit

---

## 🔧 Prerequisites

You need the following installed:

- **Python 3.9+**
- **Node.js 18+** (includes npm)
- **Ollama** (for local LLM inference)
  - 👉 Download from: https://ollama.com/download

---

## 🐍 Ollama Setup

1. Start Ollama (in a separate terminal if needed)
ollama serve

2. Pull the Mistral model
ollama pull mistral

## Frontend Setup (React)
1. Navigate to frontend
cd ../frontend

2. Install dependencies
npm install

3. Start the React development server
npm start


## 🐍 Backend Setup (FastAPI + SQLite + Transformers)

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the FastAPI server
uvicorn main:app --reload
