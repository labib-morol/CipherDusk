# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**CipherDusk** — a Socratic decision-intelligence web app. The user describes a decision; the AI challenges their assumptions across multiple rounds and delivers a blunt verdict with supporting analysis. Built for hackathon use.

## Running the App

```bash
# Install dependencies (one-time)
pip install -r requirements.txt

# Start the server (serves everything on http://localhost:8000)
uvicorn server:app --reload
```

`GROQ_API_KEY` must be set in a `.env` file or the environment before starting.

## Verifying AI Output

```
GET http://localhost:8000/test
```

Returns a JSON object with `ok: true` when the LLM response is correctly structured. Run this before demos.

```
GET http://localhost:8000/health
```

Checks that `index.html` exists and `GROQ_API_KEY` is set.

## Architecture

Three files do all the work:

| File | Role |
|---|---|
| `server.py` | FastAPI backend — serves static files, proxies streaming SSE from Groq, handles file upload |
| `prompts.py` | All LLM prompts — one function per conversation mode |
| `app.js` | All frontend logic — state machine, streaming, rendering, TTS, voice input |
| `index.html` | Shell + all CSS (large file, inline styles) |

### Conversation flow (state machine in `app.js`)

```
stage 0  →  submitDecision  →  mode "cd1"   (Round 1 question)
stage 1  →  submitAnswer    →  mode "cd2"   (Round 2 or verdict if conf ≥ 80)
stage 2  →  submitAnswer    →  mode "cd2"   (continues until conf ≥ 80 or round 4)
                             →  mode "cd_final" (forced verdict at round 4)
stage 99 →  renderVerdict   (verdict displayed)
stage 4  →  enterDeepDive   →  modes "deep1" / "deep2" / "deep3"
                             →  mode "deep_summary" (synthesized deep verdict)
```

### Backend `/run` endpoint

`POST /run` accepts `{mode, decision, history, answer, context}` and streams SSE tokens (`data: {"token": "..."}`) back to the client. The mode string maps directly to a prompt function in `prompts.py`.

### Prompt contract

Every prompt function returns a string with a strict output format the frontend parses with regex in `parseResponse()`. Key fields: `CONFIDENCE`, `INSIGHT`, `QUESTION`, `OPTIONS` (A–D), `VERDICT`, `WHY`, `RISKS`, `BEST CASE`, `WORST CASE`, `TIMELINE`, `PSYCHOLOGICAL PATTERN`. Changing field names in prompts **will break** the frontend parser.

### File upload

`POST /upload` accepts a `.txt` or `.pdf` file, returns `{text: string}` (first 3000 chars). The extracted text is passed as `context` in subsequent `/run` calls.

## Model

Groq `llama-3.3-70b-versatile`, `max_tokens: 1200`, `temperature: 0.7`. Change `MODEL` in `server.py` to swap.
