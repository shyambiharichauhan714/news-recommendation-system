# NewsMind AI — Project Overview

A news recommender that models the *order* people read in. A GRU network turns
each reader's recent sequence into a preference vector, then ranks every unread
article against it — and explains why.

| | |
|---|---|
| Live dashboard | https://newsmind-web.vercel.app |
| API docs | https://newsmind-api.vercel.app/docs |
| Source | https://github.com/shyambiharichauhan714/news-recommendation-system |

---

## 1. How it works

Most recommenders treat your history as a bag of topics. This one treats it as a
path. Reading *Machine Learning → LLM Research → Generative AI* says something
that the same three articles in any other order does not, and a GRU is built to
carry exactly that kind of state forward.

```
News catalog            93 articles, 8 categories
      │
      ▼
Sentence-Transformers   all-MiniLM-L6-v2 → 384-dim embeddings (frozen)
      │
      ▼
Sequence builder        sliding window: last 5 reads → next read
      │
      ▼
GRU network             Linear 384→128 → ReLU → GRU 2×128 → Dropout → Dense 128→384
      │
      ▼
Ranking                 cosine similarity, already-read excluded
      │
      ▼
Top-N + reason          match score 0–100 with a written explanation
```

---

## 2. The stack

| Layer | Built with | Notes |
|---|---|---|
| **Frontend** (43 TS/TSX files) | Next.js 14 App Router, TypeScript, Tailwind CSS | Recharts for charts, Framer Motion for transitions, Lucide icons. Nine routes: dashboard, For You, Discover, History, Analytics, Model Insights, Profile, login, register. |
| **Backend** (57 Python files) | FastAPI, Pydantic, SQLAlchemy, Uvicorn | Routers for news, users, interactions, recommendations, analytics and model control. JWT auth via python-jose, bcrypt password hashing. |
| **Machine learning** | PyTorch, Sentence-Transformers, scikit-learn, NumPy | GRU trained on CPU. TF-IDF + SVD is a built-in fallback when transformers are unavailable, and doubles as the evaluation baseline. |
| **Database** | SQLite via SQLAlchemy | One env var swaps it for PostgreSQL. Five tables. |
| **Deployment** | Vercel × 2 (Next.js + Python serverless) | Frontend proxies `/api/*` to the API project, so the browser only talks to its own origin and there is no CORS to configure. |
| **Quality** | pytest, Vitest, GitHub Actions | 73 tests. CI on Python 3.11 and 3.13, plus frontend typecheck, lint, test and build. |

**Model configuration** — embedding dim 384, hidden dim 128, 2 GRU layers,
dropout 0.3, sequence length 5, 40 epochs, 296,960 parameters.

---

## 3. Does the model actually work?

Measured on 1,314 held-out validation samples against a TF-IDF
content-similarity baseline. That is the honest comparison: it uses the same
embeddings but ignores order, so if sequence modelling were not earning its
place the two would be level.

| Metric @5 | GRU | TF-IDF baseline | Lift |
|---|---:|---:|---:|
| Precision | 0.090 | 0.060 | +50% |
| Recall | 0.452 | 0.302 | +50% |
| NDCG | 0.326 | 0.196 | **+66%** |
| Hit rate | 0.452 | 0.302 | +50% |
| MRR | 0.303 | — | — |

Final train loss 0.143, validation loss 0.179.

---

## 4. The data

Everything is generated from a fixed seed, so a re-seed reproduces the exact
dataset a model was trained on. Ten named personas exist to make the dashboard
legible; the 400-reader cohort exists to make the model trainable.

| Table | Rows | What it holds |
|---|---:|---|
| `news` | 93 | Articles across 8 categories and ~32 topics |
| `users` | 410 | 10 demo personas + 400 anonymous training readers |
| `user_interactions` | 10,711 | Timestamped reads and bookmarks — the sequences the GRU learns from |
| `user_preferences` | 410 | Preferred categories and topics per reader |
| `model_metrics` | 4 | Stored evaluation runs |

---

## 5. What changed, in order

The scaffold already existed — pages, routers, the GRU class, a dataset
generator. What follows is the work of getting it to actually run, train,
connect and ship.

1. **Got it running.** Set up a Python 3.13 environment. The pinned dependencies
   had no wheels for 3.13, so versions were relaxed and PyTorch installed
   CPU-only. `email-validator` was missing from requirements entirely — the API
   could not import without it.

2. **Made the dataset trainable.** Seeding produced 44 interactions, which at a
   sequence length of 5 yields *one* training sample and a crash. Added a
   400-reader cohort whose sequences follow topic-sticky random walks:
   10,711 interactions, 8,754 training samples.

3. **Trained and evaluated.** 40 epochs on CPU. Installed Sentence-Transformers
   so embeddings came from all-MiniLM-L6-v2 rather than the TF-IDF fallback,
   lifting the embedding dimension from 92 to 384.

4. **Connected the interface to the model.** The dashboard had working-looking
   controls that did nothing. Added persisted reads and bookmarks, an article
   reader, a real search, notifications and persona switching — then moved
   search, the reader and the persona list off the bundled demo data onto the
   live API.

5. **Rebuilt the visual layer.** Light gradient hero with an inline-SVG globe,
   KPI cards with sparklines drawn from real series, gradient navigation, a
   working `⌘K` shortcut. Replaced an unreachable image host with Unsplash plus
   a generated-SVG fallback.

6. **Made it deployable.** Training needs PyTorch; serving does not. A GRU
   forward pass is a few matrix multiplications, so the weights export to a
   1.4 MB bundle and inference reruns in NumPy — taking the runtime from ~2 GB
   to ~20 MB, which is the difference between fitting in a serverless function
   and not.

7. **Added tests and CI.** 73 tests. The one that matters most asserts NumPy and
   PyTorch agree to 1e-5: without it the deployed site could rank differently
   from every published metric, silently.

---

## 6. Bugs worth knowing about

Each of these was found by running the thing, not by reading the code.

**Demo personas were silently corrupted.** Clicking "Read Article" while testing
the interface POSTed real interactions into the seeded histories. One persona
drifted from 9 reads to 21, and its recommendations moved from AI/ML to
Business — which looked exactly like a model failure. Fixed by re-seeding; a
test now asserts each persona's top recommendation sits inside their stated
interests.

**Personas had exhausted their own categories.** Recommendations exclude
already-read articles. With only 9–18 articles per category and personas reading
20+, there was nothing on-topic left to suggest — so the model was pushed
off-persona by the data, not by the maths. Fixed by shortening the seeded
histories so unread candidates always remain.

**Every deployed route returned 404.** Routing all traffic to one serverless
function needs a catch-all rewrite, and that rewrite replaces the path — FastAPI
saw `/api/index` whatever was requested. No header carries the original path,
but the query string survives, so the path is smuggled through the query and
restored by ASGI middleware before routing.

**Hydration errors in production only.** The greeting reads the local clock. The
server rendered it in UTC and the browser in the reader's timezone, so React
treated the mismatch as a hydration failure and discarded the server-rendered
tree. Marked `suppressHydrationWarning`, which is what that attribute exists for.

**The evaluation baseline never ran.** `evaluate_tfidf_baseline` built a fresh
vectorizer and called `transform` on it without fitting — so the comparison this
report depends on crashed with `NotFittedError`. The vectorizer now fits on
first use.

---

## 7. What runs where

**Live on Vercel**

- All nine frontend routes
- Recommendations from the trained GRU, via NumPy
- News, users, analytics and model endpoints
- Reads and bookmarks, kept in browser storage

**Local only, by design**

- Training and evaluation — needs PyTorch
- JWT auth — needs writable state
- SQLite writes — serverless disk is ephemeral
- The `/model/train` control endpoints

The deployed API is read-only on purpose. Interactions are accepted and
acknowledged but not persisted, because a serverless function has no durable
disk — the browser is the source of truth for live activity.

Retraining happens locally:

```bash
cd backend
python -m data.seed_db
python -m ml.train
python -m ml.evaluate
python -m ml.export_for_serving   # rebuilds serving_bundle/
```

Commit the rebuilt bundle and Vercel redeploys automatically.
