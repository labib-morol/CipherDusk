# CipherDusk — Decision Intelligence System

> *Every AI tool tries to make decisions easier. CipherDusk makes them harder — on purpose. Because the best decisions come from pressure, not reassurance.*

---

## The Position

Most AI tools validate you. They summarize, suggest, and smooth things over.

CipherDusk does the opposite.

It interrogates your decision. It names your cognitive biases. It calls out contradictions between what you said in round one and what you're saying now. It refuses to give a verdict until it has enough to work with.

**Friction is not a bug. Friction is the product.**

---

## What Happens When You Use It

You bring a decision. CipherDusk treats it as a suspect.

```
You enter a decision
        ↓
Round 1 — Surface Interrogation
The AI identifies your likely hidden motivation.
Asks the question you'd rather not answer.
        ↓
Round 2 — Contradiction Detection
Your answer is audited against Round 1.
Contradictions are named. Biases are called out directly.
        ↓
Verdict — when confidence is earned, not before
A DIRECTIVE: one short command specific to your decision.
"Quit the job. Build it." or "Don't do this yet."
        ↓
Deep Mode (optional)
3 more rounds of extended interrogation.
Full psychological synthesis at the end.
```

It does not ask generic questions.
It does not say "you may want to consider."
It does not tell you what you want to hear.

---

## Why This Interprets Friction Correctly

Friction in decision-making is not a UX problem to solve — it is a thinking tool being discarded.

The best decisions in your life probably came after resistance, doubt, or a conversation that made you uncomfortable. CipherDusk is that conversation, automated.

We did not build friction *around* the product. We built friction *as* the product.

---

## Features

- **Adversarial AI** — challenges weak reasoning, does not validate it
- **Contradiction memory** — tracks what you said across rounds and calls out inconsistencies
- **Cognitive bias detection** — names the bias specifically, does not hint at it
- **DIRECTIVE** — one-line command verdict specific to your decision
- **Decision Type classifier** — labels your decision (Escape Decision, Fear-Based Hold, etc.)
- **Early verdict** — fires when confidence is high, skips unnecessary rounds
- **Deep Mode** — 3-round extended interrogation with full psychological synthesis
- **Confidence scoring** — AI confidence synced to UI, increases with each round
- **File upload** — attach PDF or TXT for extra context
- **Voice input + TTS** — speak your answer, hear the verdict
- **Streaming responses** — real-time AI output, no waiting for full response
- **Decision history** — past decisions saved locally

---

## Built With

- **Frontend** — Vanilla HTML / CSS / JS
- **Backend** — FastAPI (Python)
- **AI Model** — Llama 3.3 70B via Groq API
- **Streaming** — Server-Sent Events (SSE)
- **Animation** — Canvas API (robot fight)

---

## Run Locally

```bash
git clone https://github.com/labib-morol/CipherDusk.git
cd CipherDusk

python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# Open .env and add your Groq API key (free at console.groq.com)

uvicorn server:app --reload
```

Open `http://localhost:8000`

---

## Live Demo

[web-production-1c39e.up.railway.app](https://web-production-1c39e.up.railway.app/)

---

*Built for Noverse Friction Hackathon 2026.*
*The theme asked us to take a stance. This is ours: friction is not the enemy of good decisions. It is the mechanism.*