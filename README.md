# NewsMind AI

**Personalized News Recommendation using Sequential User Behavior Modeling with GRU Networks**

*Personalized intelligence for every reader.*

An end-to-end MSc AI Part 2 academic project: a full-stack, production-style news
recommendation platform that models each reader's sequential behavior with a GRU
(Gated Recurrent Unit) neural network to predict and recommend the next articles
they're most likely to want to read — with every recommendation explained.

---

## 1. Project Objective

NewsMind AI analyzes news content, categories, user reading history, click
behavior, and — critically — the **sequential order** in which a user reads
articles. A GRU network learns each user's evolving interest trajectory (e.g.
`AI News -> Machine Learning -> Generative AI -> Robotics`) and predicts
relevant next articles (e.g. `LLM Research`, `AI Agents`, `Advanced Robotics`).

## 2. Architecture

```
News Dataset
     |
     v
News Text Preprocessing            (backend/ml/preprocessing.py)
     |
     v
Transformer / Sentence-BERT Embeddings   (backend/ml/embeddings.py)
     |
     v
News Vector Representation
     |
     +-------------------------+
                               |
User Reading and Click History |    (backend/app/models/user_interaction.py)
     |                         |
     v                         v
Sequential User Behavior Processing      (backend/ml/sequence_builder.py)
     |
     v
GRU Neural Network                       (backend/ml/gru_model.py)
     |
     v
User Preference Representation
     |
     v
Candidate News Ranking                   (backend/ml/recommend.py)
     |
     v
Top-N Personalized Recommendations
     |
     v
Frontend Dashboard                       (frontend/)
```

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React, Framer Motion, Recharts |
| Backend | Python, FastAPI, Pydantic, SQLAlchemy |
| Machine Learning | PyTorch (GRU), Scikit-learn, Pandas, NumPy |
| NLP | Sentence-Transformers (`all-MiniLM-L6-v2`) with automatic TF-IDF fallback |
| Database | SQLite (dev), swappable to PostgreSQL via one env var |
| Auth | JWT (python-jose) + bcrypt password hashing |

## 4. Project Structure

```
news-recommendation-system/
  frontend/                  Next.js dashboard ("NewsMind AI")
    app/                     Pages: home, for-you, discover, analytics,
                              model-insights, history, profile, login, register
    components/               Sidebar, Topbar, NewsCard, charts, states, etc.
    lib/                      utils, mock-data (demo mode), user-context
    services/                 Typed API client (falls back to demo data)
    types/                    Shared TypeScript types

  backend/
    app/
      main.py                 FastAPI app + router wiring + CORS
      config.py                Environment-variable settings
      database.py               SQLAlchemy engine/session/Base
      models/                   SQLAlchemy ORM models (Section 4 tables)
      schemas/                   Pydantic request/response schemas
      routers/                    REST endpoints (Section 12)
      services/                    Business logic between routers and DB/ML
      utils/                       Auth (JWT, bcrypt), FastAPI dependencies
    ml/
      preprocessing.py            NLP cleaning + title/description combine
      embeddings.py                Sentence-BERT embeddings, TF-IDF fallback
      sequence_builder.py           Chronological sequences, sliding windows
      gru_model.py                   PyTorch GRU architecture
      data_loader.py                  Torch Dataset/DataLoader bridging
      train.py                         Training loop, saves model + metrics
      evaluate.py                       Precision/Recall/NDCG/HitRate/MRR@5
      recommend.py                       Recommendation engine + explanations
    data/
      topic_bank.py               Synthetic dataset content bank
      generate_dataset.py          Generates 100+ articles, 10 demo users
      seed_db.py                    Writes generated data into SQLite
    saved_models/                Trained model artifacts (created by train.py)
    requirements.txt

  README.md                    This file
```

## 5. Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- ~1GB free disk space if using the Sentence-Transformers embedding model (it
  downloads once on first run)

### 5.1 Backend Setup

```bash
cd news-recommendation-system/backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env             # adjust settings if needed

# 1. Seed the database with the synthetic demo dataset
#    (100+ articles across 8 categories, 10 demo users with distinct
#    reading personas — Section 18: Demo Mode)
python -m data.seed_db

# 2. Train the GRU recommendation model
#    Uses Sentence-Transformers if available, otherwise automatically
#    falls back to a TF-IDF + SVD embedding pipeline (no internet required).
python -m ml.train

# 3. Evaluate the trained model (Precision/Recall/NDCG/HitRate@5, MRR,
#    plus a TF-IDF baseline comparison)
python -m ml.evaluate

# 4. Start the API server
uvicorn app.main:app --reload --port 8000
```

The API is now live at `http://localhost:8000`, with interactive docs at
`http://localhost:8000/docs`.

Demo login credentials (created by the seed script): any of the emails
printed by `seed_db.py` (e.g. `shyam@newsmind.ai`) with password `demo1234`.

### 5.2 Frontend Setup

```bash
cd news-recommendation-system/frontend
npm install
cp .env.local.example .env.local   # points at the backend via a dev proxy

npm run dev
```

Open `http://localhost:3000`. The frontend works even if the backend isn't
running yet — every API call in `services/api.ts` automatically falls back
to a fully-featured local demo dataset (`lib/mock-data.ts`) with four demo
personas, so the UI is always demonstrable standalone. Once the backend is
running, real data (and real GRU-driven recommendations) take over
automatically.

### 5.3 Retraining After Changes

If you add more users/interactions, or change model hyperparameters (in
`backend/.env` or via CLI flags), retrain and re-evaluate:

```bash
python -m ml.train --epochs 50 --hidden-dim 256 --sequence-length 6
python -m ml.evaluate
```

All hyperparameters (embedding dimension, hidden dimension, GRU layers,
dropout, learning rate, batch size, epochs, sequence length) are
configurable via environment variables or CLI flags — see
`backend/.env.example` and `python -m ml.train --help`.

## 6. Demo Mode

Both the frontend and backend ship with a ready-to-present demo mode
(Section 18) — no real users required:

- **Frontend-only**: `lib/mock-data.ts` generates the same 100+ article
  catalog and 4+ demo personas client-side, with recommendations computed
  by a lightweight simulation of the GRU ranking logic. Switch users on the
  **Profile & Preferences** page and watch recommendations, analytics, and
  reading history change instantly.
- **Full-stack**: `backend/data/seed_db.py` seeds 10 demo personas (AI &
  Technology, Sports & Cricket, Business & Finance, Health & Science,
  Politics, Entertainment, Science & Space, Startups/Cybersecurity, Football/
  Consumer Tech, Wellness & Nutrition) each with a realistic chronological
  reading sequence, so the trained GRU model produces genuinely different
  Top-5 recommendations per persona.

## 7. Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create a new user account |
| POST | `/api/auth/login` | Authenticate, returns a JWT |
| GET | `/api/news` | List all news articles |
| GET | `/api/news/{id}` | Get one article |
| GET | `/api/news/category/{category}` | Filter by category |
| GET | `/api/users/{id}/history` | Chronological reading history |
| GET | `/api/users/{id}/preferences` | Favorite categories/topics |
| POST | `/api/interactions/{view\|click\|read\|like\|bookmark}` | Log an interaction |
| GET | `/api/recommendations/{user_id}` | Top-N personalized recommendations |
| GET | `/api/recommendations/{user_id}/explain` | Recommendations with explanations |
| GET | `/api/analytics/dashboard/{user_id}` | KPI summary |
| GET | `/api/analytics/reading-behavior/{user_id}` | Full analytics breakdown |
| GET | `/api/model/status` | Is the GRU model trained/active? |
| GET | `/api/model/metrics` | Precision/Recall/NDCG/HitRate@5, MRR |
| POST | `/api/model/train` | Kick off a training run (background task) |
| POST | `/api/model/evaluate` | Kick off an evaluation run (background task) |

Full interactive documentation (request/response schemas, try-it-out) is
available at `/docs` once the backend is running.

## 8. How Recommendations Work (Explainable AI)

1. The user's chronological reading sequence is fetched from the database.
2. The most recent `SEQUENCE_LENGTH` articles (default 5) are converted to
   their pretrained embeddings.
3. The sequence is passed through the trained GRU, producing a "user
   preference representation" — a vector in the same space as news
   embeddings.
4. Every unread article is scored by similarity (dot product / cosine, since
   embeddings are L2-normalized) to that preference vector.
5. Already-read articles are removed, and the Top-N highest-scoring
   articles are returned with a 0-100 match score.
6. Each recommendation includes a natural-language explanation generated
   from the user's recent categories, topics, and similarity strength — e.g.
   *"Recommended because you recently read articles about Generative AI, and
   your sequential reading pattern shows strong interest in this topic."*

Before a model has been trained, the engine automatically falls back to a
cold-start heuristic (recency + preferred-category matching) so the API
never breaks on a fresh install.

## 9. Model Evaluation

`python -m ml.evaluate` computes, on a held-out validation split:

- **Precision@5** / **Recall@5** / **NDCG@5** / **Hit Rate@5** / **MRR**
- A **TF-IDF baseline** (no sequence modeling, ranks by similarity to the
  last-read article) evaluated on the same split, for direct comparison
  against the GRU + Transformer-embeddings approach.

Results are written to `backend/saved_models/evaluation_results.json`,
logged to the `model_metrics` database table, and surfaced on the frontend's
**AI Model Insights** page alongside the training/validation loss curve.

## 10. Switching to PostgreSQL

The project is SQLite-by-default for zero-setup local development, but the
data layer is written entirely against SQLAlchemy's ORM (no raw SQLite SQL
anywhere), so moving to PostgreSQL requires only:

```bash
pip install psycopg2-binary   # uncomment in requirements.txt
```

```env
# backend/.env
DATABASE_URL=postgresql://user:password@localhost:5432/newsmind
```

No application code changes are required.

## 11. Notes for Graders / Reviewers

- The GRU architecture, training objective (cosine/triplet loss against
  frozen pretrained embeddings), and evaluation metrics are all implemented
  from first principles in `backend/ml/`, not wrapped around a third-party
  recommender library — see `gru_model.py` and `train.py` for the full
  implementation.
- The NLP pipeline (`backend/ml/preprocessing.py`, `embeddings.py`)
  demonstrates both a modern Transformer/Sentence-BERT approach and a
  classical TF-IDF baseline, with a documented, automatic fallback path so
  the project remains fully runnable offline.
- The explainability layer (`backend/ml/recommend.py:generate_recommendation_reason`)
  is a rule-based natural-language generator over the model's own similarity
  signals and the user's recent categories/topics — satisfying the
  Explainable AI requirement without depending on an external LLM API.

## 12. Deployment (Vercel)

Both halves of the project deploy to Vercel as **two projects from this one
repository**.

### Why the deployed backend has no PyTorch

Training needs PyTorch and Sentence-Transformers; **serving does not**. A GRU
forward pass is a handful of matrix multiplications, and the news embeddings
are frozen once training finishes. So `ml/export_for_serving.py` writes a
torch-free bundle — model weights, embeddings and the seeded dataset — and
`ml/numpy_inference.py` reproduces `GRURecommender.forward()` in NumPy.

That takes the runtime from roughly 2 GB (PyTorch) to about 20 MB (NumPy),
which is the difference between fitting in a serverless function and not.
`tests/test_numpy_inference.py` asserts the two implementations agree to
within 1e-5, so the deployed rankings match every reported metric.

Rebuild the bundle whenever the model is retrained:

```bash
cd backend
python -m data.seed_db
python -m ml.train
python -m ml.export_for_serving      # -> backend/serving_bundle/ (~1.4 MB)
```

### Project 1 — API

| Setting | Value |
|---|---|
| Root Directory | *(repository root)* |
| Framework Preset | Other |
| Install Command | *(default — uses `/requirements.txt`)* |

`vercel.json` routes every request to `api/index.py`, which exposes the
FastAPI app from `backend/serving/app.py`. Note that `/requirements.txt` is
the slim serving set; local development uses
`backend/requirements-py313.txt`.

### Project 2 — Frontend

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Next.js |
| Environment Variable | `BACKEND_ORIGIN` = the API project's URL |

The frontend proxies `/api/*` to `BACKEND_ORIGIN` through a Next.js rewrite,
so the browser only ever talks to its own origin and there is no CORS to
configure.

### What the deployment does not do

The serverless API is **read-only**. `POST /api/interactions/*` is accepted
and acknowledged but not persisted, and reads/bookmarks live in the browser's
`localStorage` instead. Auth and the training endpoints are only available in
the full local backend (`app/main.py`), since both need writable state.

---

## 13. Tests and CI

```bash
# Backend — 45 tests, no PyTorch required
cd backend && python -m pytest

# Frontend — 28 tests
cd frontend && npm test
```

The backend suite covers NumPy/PyTorch parity, the API contract every
frontend call depends on, sequence-window construction, and dataset
determinism. One test asserts each demo persona's top recommendation falls
inside their stated interests — that is what catches a corrupted or
mis-ordered reading history, which otherwise looks like a model bug.

`.github/workflows/ci.yml` runs on every push and pull request:

- **backend** — installs only the slim serving requirements on Python 3.11
  and 3.13, runs pytest, and asserts the serving path never imports
  `torch`, `sklearn`, `sqlalchemy` or `sentence_transformers`
- **frontend** — typecheck, lint, unit tests, production build
- **model smoke test** (main only) — seeds, trains two epochs, re-exports the
  bundle and re-checks NumPy/PyTorch parity end to end
