from fastapi import FastAPI, Request, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import requests, json, os

from prompts import cd_round1_prompt, cd_round2_prompt, cd_deep_prompt, cd_final_prompt, cd_deep_summary_prompt

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

API_URL   = "https://api.groq.com/openai/v1/chat/completions"
GROQ_KEY  = os.environ.get("GROQ_API_KEY", "")
MODEL     = "llama-3.3-70b-versatile"

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH = os.path.join(BASE_DIR, "index.html")


def hf_stream(prompt: str):
    headers = {"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1200,
        "stream": True,
        "temperature": 0.7,
    }
    try:
        with requests.post(API_URL, headers=headers, json=payload, stream=True, timeout=60) as r:
            if r.status_code != 200:
                yield f"data: {json.dumps({'token': f'API Error {r.status_code}: {r.text[:200]}'})}\n\n"
                return
            for raw in r.iter_lines():
                if not raw: continue
                line = raw.decode("utf-8") if isinstance(raw, bytes) else raw
                if not line.startswith("data: "): continue
                chunk = line[6:]
                if chunk.strip() == "[DONE]": break
                try:
                    token = json.loads(chunk)["choices"][0]["delta"].get("content", "")
                    if token:
                        yield f"data: {json.dumps({'token': token})}\n\n"
                except: continue
    except Exception as e:
        yield f"data: {json.dumps({'token': f'Error: {str(e)}'})}\n\n"


@app.get("/")
def root():
    if not os.path.exists(INDEX_PATH):
        return JSONResponse({"error": f"index.html not found at {INDEX_PATH}"}, status_code=500)
    return FileResponse(INDEX_PATH)


@app.post("/run")
async def run(req: Request):
    try:
        body = await req.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    mode    = body.get("mode", "")
    context = body.get("context", "")

    if   mode == "cd1":
        prompt = cd_round1_prompt(body.get("decision",""), context)
    elif mode == "cd2":
        prompt = cd_round2_prompt(body.get("decision",""), body.get("history",""), body.get("answer",""), context)
    elif mode in ("deep1","deep2","deep3"):
        prompt = cd_deep_prompt(body.get("decision",""), body.get("history",""), context, int(mode[-1]))
    elif mode == "cd_final":
        prompt = cd_final_prompt(body.get("decision",""), body.get("history",""), context)
    elif mode == "deep_summary":
        prompt = cd_deep_summary_prompt(body.get("decision",""), body.get("history",""), context)
    else:
        def unknown():
            yield f"data: {json.dumps({'token': f'Unknown mode: {mode}'})}\n\n"
        return StreamingResponse(unknown(), media_type="text/event-stream")

    return StreamingResponse(hf_stream(prompt), media_type="text/event-stream")


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    try:
        content = await file.read()
        try:    text = content.decode("utf-8")
        except: text = content.decode("latin-1")
        return {"text": text[:3000]}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/health")
def health():
    return {"status": "ok", "index_html": os.path.exists(INDEX_PATH), "groq_key_set": bool(GROQ_KEY), "model": MODEL}


@app.get("/test")
def test_ai():
    """Quick check that AI returns structured output — run this before your demo."""
    test_prompt = cd_round1_prompt("I want to quit my job and start a startup", "")
    result = ""
    for chunk in hf_stream(test_prompt):
        if chunk.startswith("data: "):
            try:
                result += json.loads(chunk[6:]).get("token", "")
            except:
                pass
    return {
        "raw_response": result,
        "length": len(result),
        "has_assumption": "ASSUMPTION:" in result,
        "has_question": "QUESTION:" in result,
        "has_options": "OPTIONS:" in result,
        "ok": "ASSUMPTION:" in result and "OPTIONS:" in result,
        "model": MODEL,
    }
