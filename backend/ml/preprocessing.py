"""
NLP preprocessing pipeline (Section 6: NLP Pipeline).

Steps implemented here:
  1. Load news data            -> load_news_dataframe()
  2. Handle missing values     -> clean_dataframe()
  3. Clean unnecessary text    -> clean_text()
  4. Combine title+description -> build_combined_text()
  5-7. (embeddings/normalization/storage live in embeddings.py)

Kept dependency-light (pandas + stdlib `re` only) so this module works even
in constrained environments — embeddings.py is where the heavier optional
dependency (sentence-transformers) lives, with a TF-IDF fallback.
"""

from __future__ import annotations

import re

import pandas as pd

# Basic English stopwords — small, curated list (avoids requiring nltk/spacy
# downloads for a from-scratch academic environment). Sufficient for the
# TF-IDF baseline; transformer embeddings don't need stopword removal since
# they model context directly.
STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "if", "then", "of", "to", "in", "on",
    "for", "with", "as", "by", "at", "from", "is", "are", "was", "were", "be",
    "been", "being", "this", "that", "these", "those", "it", "its", "into",
    "about", "over", "after", "before", "than", "so", "such", "not", "no",
}

_WHITESPACE_RE = re.compile(r"\s+")
_NON_ALNUM_RE = re.compile(r"[^a-zA-Z0-9\s]")
_HTML_TAG_RE = re.compile(r"<[^>]+>")


def clean_text(text: str | None) -> str:
    """Lowercase, strip HTML/punctuation, collapse whitespace. Used for both
    the TF-IDF baseline and as light cleanup before transformer embedding
    (transformers are more robust to punctuation, but consistent input
    still helps reproducibility)."""
    if not text:
        return ""
    text = _HTML_TAG_RE.sub(" ", text)
    text = text.lower()
    text = _NON_ALNUM_RE.sub(" ", text)
    text = _WHITESPACE_RE.sub(" ", text).strip()
    return text


def remove_stopwords(text: str) -> str:
    """Used only for the TF-IDF baseline (Section 6: TF-IDF comparison)."""
    return " ".join(w for w in text.split() if w not in STOPWORDS)


def build_combined_text(title: str, description: str) -> str:
    """Combines title + description into one string for embedding, with the
    title repeated to weight it more heavily (a common trick in news
    recommendation NLP pipelines, since titles are denser signal)."""
    title = (title or "").strip()
    description = (description or "").strip()
    return f"{title}. {title}. {description}".strip()


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Handles missing values (Section 6, step 2) and drops fully-empty rows."""
    df = df.copy()
    for col in ["title", "description", "content", "category", "subcategory", "author"]:
        if col in df.columns:
            df[col] = df[col].fillna("")
    df = df[df["title"].str.strip() != ""].reset_index(drop=True)
    return df


def preprocess_news_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Full pipeline: clean -> combine text -> add cleaned/combined columns.

    Adds two new columns to the input dataframe:
      - `combined_text`: title + description, used as embedding input
      - `clean_text_tfidf`: lowercased, stopword-stripped version for TF-IDF
    """
    df = clean_dataframe(df)
    df["combined_text"] = df.apply(
        lambda row: build_combined_text(row["title"], row.get("description", "")), axis=1
    )
    df["clean_text_tfidf"] = df["combined_text"].apply(clean_text).apply(remove_stopwords)
    return df


def load_news_dataframe(news_records: list) -> pd.DataFrame:
    """Converts a list of NewsRecord (or dict-likes with the same fields)
    into a pandas DataFrame ready for preprocess_news_dataframe()."""
    rows = []
    for r in news_records:
        if hasattr(r, "__dict__"):
            rows.append(
                {
                    "news_id": r.news_id,
                    "title": r.title,
                    "description": r.description,
                    "content": r.content,
                    "category": r.category,
                    "subcategory": r.subcategory,
                }
            )
        else:
            rows.append(r)
    return pd.DataFrame(rows)
