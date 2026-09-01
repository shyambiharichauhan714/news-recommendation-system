# How to use NewsMind AI

Three ways in, depending on what you need:

| I want to… | Go to |
|---|---|
| Just look at it working | [Part 1 — Use the live site](#part-1--use-the-live-site) |
| Run it on my own machine | [Part 2 — Run it locally](#part-2--run-it-locally) |
| Retrain or redeploy | [Part 3 — Change something](#part-3--change-something) |

---

## Part 1 — Use the live site

Nothing to install. Open **https://newsmind-web.vercel.app**

### Step 1 — Look at the dashboard

The home page opens as **Shyam Chauhan**, a worked example with a ready-made
reading history.

- **Total News Read / Recommendation Score / Top Category / AI Confidence** —
  computed from that history
- **Recommended For You** — four articles the GRU predicts he reads next. Each
  shows a **% match** and a line explaining *why* it was picked
- **Interest Trends** — his reading, by category, over 14 days
- **Trending Topics** — most-read topics across all 410 readers

### Step 2 — Read an article

Click **Read Article** on any card. The full article opens; you can **Save for
later**. Closing it:

- bumps **Total News Read**
- adds it to **Recently Read**
- marks the card **Read**

Your reads are stored in your browser, not on the server.

### Step 3 — Search

Click the search box (or press **Ctrl K** / **⌘K**). Try:

| Type | Example | What it finds |
|---|---|---|
| One word | `robot` | the Robotics topic + 3 articles |
| Several words | `ai robotics` | articles matching **both** |
| An author | `Lucy Grant` | all 13 of her articles |
| Body text | `pivotal moment` | matches inside the article text |

Results are grouped into **Categories**, **Topics** and **Articles**. Arrow keys
move through them, Enter opens.

### Step 4 — Make it yours

Go to **Profile & Preferences → Create your own profile**.

1. Type your name
2. Tap at least one **interest** (a `+` turns into a `✓`)
3. Press **Create profile**

You are switched to it immediately. It starts with no history, so the first
recommendations come from your chosen categories. **Then read a few articles** —
each read goes through the same GRU model, and the recommendations sharpen.

> Your profile lives in this browser only. Clearing site data or using another
> device starts fresh — the deployed API is read-only and stores nothing.

### Step 5 — See how the model works

**AI Model Insights** shows:

- **User Behavior Sequence → Prediction** — your last four reads and what the
  model predicts next, with its match score
- **Evaluation metrics** — Precision, Recall, NDCG, Hit Rate at 5
- **Training vs Validation Loss** over 40 epochs
- **GRU vs TF-IDF baseline** — the comparison that shows sequence modelling is
  earning its place

Other pages: **For You** (12 recommendations, filterable), **Discover** (all 93
articles, search and filter), **Reading History** (activity, read, bookmarked),
**Analytics** (reading behaviour).

---

## Part 2 — Run it locally

### What you need

- **Python 3.10+** — 3.13 works, use `requirements-py313.txt`
- **Node.js 18+**
- ~2 GB disk for PyTorch (training only)

### Step 1 — Get the code

```bash
git clone https://github.com/shyambiharichauhan714/news-recommendation-system.git
cd news-recommendation-system
```

### Step 2 — Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate

pip install -r requirements-py313.txt
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install sentence-transformers   # optional; TF-IDF is used without it

copy .env.example .env             # macOS/Linux: cp .env.example .env
```

**Why the CPU index for torch?** The default wheel pulls ~2 GB of CUDA
libraries this project never uses.

### Step 3 — Build the data and model

Run these in order:

```bash
python -m data.seed_db            # 93 articles, 410 readers, 10,711 interactions
python -m ml.train                # ~4 minutes on CPU, 40 epochs
python -m ml.evaluate             # prints metrics vs the TF-IDF baseline
python -m ml.export_for_serving   # writes serving_bundle/ (1.4 MB)
```

The repo already contains a trained `serving_bundle/`, so you can skip
straight to step 4 if you only want to run the app.

### Step 4 — Start the API

```bash
python -m uvicorn serving.app:app --reload --port 8000
```

Check http://localhost:8000/docs — the interactive API reference.

> `serving.app` is what gets deployed: NumPy inference, no database, and it
> serves the route browser-created profiles need. Use it unless you are working
> on the database.
>
> `app.main` is the full backend — database, auth, training endpoints. It has
> no `/api/recommendations/for-history`, so a profile you create in the browser
> falls back to a filtered list instead of live model output, and the console
> shows `405 Method Not Allowed`. Everything else works the same.

### Step 5 — Start the frontend

In a **second terminal**:

```bash
cd frontend
npm install
copy .env.local.example .env.local   # macOS/Linux: cp .env.local.example .env.local
npm run dev
```

Open the URL it prints (usually **http://localhost:3000**).

### If the backend isn't running

The frontend falls back to a bundled demo dataset, so the site still renders.
You will see failed `/api/*` requests in the console — that is the fallback
working, not a crash.

### Run the tests

```bash
cd backend && python -m pytest      # 59 tests
cd frontend && npm test             # 34 tests
```

---

## Part 3 — Change something

### Retrain the model

```bash
cd backend
python -m data.seed_db
python -m ml.train
python -m ml.evaluate
python -m ml.export_for_serving     # ← don't skip: this is what gets served
git add -A && git commit -m "Retrain model" && git push
```

Vercel redeploys on push. Without the export step the site keeps serving the
old weights.

### Change the articles or personas

Edit `backend/data/topic_bank.py` (articles) or `backend/data/generate_dataset.py`
(personas, cohort), then re-run the four commands above. Generation is
deterministic — the same seed always produces the same dataset.

### Tune the model

Hyperparameters live in `backend/.env`:

```
SEQUENCE_LENGTH=5      # reads used to predict the next one
GRU_HIDDEN_DIM=128
GRU_NUM_LAYERS=2
GRU_DROPOUT=0.3
EPOCHS=40
```

Retrain and re-export after changing them.

### Deploy

Two Vercel projects, both from this repo:

| Project | Root Directory | Preset |
|---|---|---|
| `newsmind-api` | *(repo root)* | Other |
| `newsmind-web` | `frontend` | Next.js — set `BACKEND_ORIGIN` to the API URL |

A push to `main` redeploys both.

---

## Troubleshooting

**The page loads but everything shows demo data**
The API is unreachable. Check http://localhost:8000/api/health and that
`BACKEND_ORIGIN` in `frontend/.env.local` matches.

**`ModuleNotFoundError` on `python -m ml.train`**
Run it from inside `backend/`, with the virtualenv activated.

**"Not enough training samples"**
`data.seed_db` did not run, or ran against an empty generator. Re-run it — you
should see 10,711 interactions.

**Recommendations look wrong for a persona**
Reading interactions were probably written into the seeded history. Re-run
`python -m data.seed_db` then `python -m ml.export_for_serving`.

**Next.js errors about a missing module after switching branches**
Stale build cache:

```bash
cd frontend && rm -rf .next && npm run dev
```
