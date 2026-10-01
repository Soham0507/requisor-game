# Don't Jeopardize This!

A Jeopardy-style trivia game show prototype. React + TypeScript + Tailwind CSS frontend, FastAPI backend.

## Backend

```bash
cd backend
python -m venv venv
./venv/Scripts/pip install -r requirements.txt
./venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

API runs at http://localhost:8000. Endpoints:

- `GET /api/v1/game/board` — categories and question tiles (no answers included)
- `POST /api/v1/game/verify` — `{ question_id, selected_option }` → `{ is_correct, correct_answer, prize_value }`

## Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at http://localhost:5173 and expects the backend on http://localhost:8000 (override with `VITE_API_BASE_URL`).

## Gameplay

- Start with a $2,000 balance.
- Pick a tile from any of the 5 categories to open a question with a 20-second timer, tracked by the host avatar's expression.
- Correct answers add the tile value; incorrect answers or a timeout subtract it.
- Answering all 25 tiles ends the game and shows the final balance.
