# CipherDusk — Decision Intelligence System

> *Stop deciding fast. Start deciding right.*

CipherDusk is an adversarial AI that challenges your decisions instead of validating them. Most tools tell you what you want to hear. CipherDusk tells you what you need to hear.

---

## What It Does

You bring a decision. CipherDusk interrogates it.

Through 2–3 rounds of escalating questions, it surfaces the real motivation behind your choice — the one you haven't admitted to yourself yet. It detects cognitive biases, calls out contradictions, and delivers a verdict based on your actual reasoning, not your stated reasoning.

**It is not a chatbot. It is an opponent.**

---

## How It Works

```
You enter a decision
        ↓
Round 1 — Surface Analysis
CipherDusk identifies your likely hidden motivation
and asks the question you'd rather not answer.
        ↓
Round 2 — Bias Detection
Your answer is audited against Round 1.
Contradictions are called out. Biases are named.
        ↓
Round 3 — Pre-Verdict Pressure
The hardest question. If clarity exists, verdict fires early.
        ↓
Final Verdict
Clear. Decisive. Worth following.
        ↓
Deep Mode (optional)
3 more rounds of extended interrogation
+ a full psychological synthesis at the end.
```

---

## Who It's For

- Anyone making a decision they keep second-guessing
- People who want honest analysis, not reassurance
- Anyone who suspects they already know the answer but won't admit it

---

## Features

- **Adversarial AI** — challenges weak reasoning directly
- **Cognitive bias detection** — names the bias, doesn't hint at it
- **Contradiction memory** — tracks what you said across rounds
- **Early verdict** — fires when confidence is high, no unnecessary questions
- **Decision Type classifier** — labels your decision (e.g. "Escape Decision", "Fear-Based Hold")
- **Deep Mode** — extended 3-round interrogation with full psychological summary
- **File upload** — attach a PDF or TXT for extra context
- **Streaming responses** — real-time AI output
- **Decision history** — past decisions saved locally

---

## Built With

- **Frontend** — Vanilla HTML/CSS/JS
- **Backend** — FastAPI (Python)
- **AI** — Llama 3.3 70B via Groq API
- **Streaming** — Server-Sent Events (SSE)

---

## Setup (Local)

1. Clone the repo
   ```bash
   git clone https://github.com/labib-morol/CipherDusk.git
   cd CipherDusk
   ```

2. Create and activate a virtual environment
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate
   ```

3. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

4. Add your Groq API key — get one free at [console.groq.com](https://console.groq.com)
   ```bash
   cp .env.example .env
   # then open .env and paste your key
   ```

5. Run
   ```bash
   uvicorn server:app --reload
   ```

6. Open `http://localhost:8000`

---

## Live Demo

[cipherdusk.up.railway.app](https://web-production-1c39e.up.railway.app/)

---

*Built for Noverse Friction Hackathon 2026 — Cognitive friction by design.*
