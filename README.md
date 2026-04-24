# CipherDusk — Decision Intelligence System

An AI system that challenges weak thinking and forces better decisions through cognitive friction.

## Setup

1. Clone the repo
2. Create a virtual environment:
   ```
   python -m venv venv
   ```
3. Activate it:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
5. Copy `.env.example` to `.env` and add your Groq API key:
   ```
   GROQ_API_KEY=your_key_here
   ```
6. Run:
   ```
   uvicorn server:app --reload
   ```
7. Open `http://localhost:8000`

## Built for Noverse Hackathon 2025
