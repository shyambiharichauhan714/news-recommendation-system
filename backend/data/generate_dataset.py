"""
Synthetic demo dataset generator (Section 5: News Dataset).

Generates:
  - 100+ news articles across 8 categories (news_id, title, description,
    content, category, subcategory, image_url, author, published_at)
  - 10+ demo users with distinct personas and sequential reading behavior
    (Section 18: Demo Mode), so switching users produces visibly different
    recommendations.

This module is pure data generation (no DB/ORM dependency) so it can be
imported by both the DB seed script (seed_db.py) and the ML pipeline's
standalone scripts/notebooks without pulling in SQLAlchemy.

Uses a deterministic PRNG (Python's `random` with a fixed seed) so the
dataset is reproducible across runs — important for reproducible GRU
training results in the academic report.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from data.topic_bank import AUTHORS, CATEGORIES, TOPIC_BANK

RANDOM_SEED = 42
NOW = datetime(2026, 8, 28, 9, 0, 0, tzinfo=timezone.utc)


@dataclass
class NewsRecord:
    news_id: str
    title: str
    description: str
    content: str
    category: str
    subcategory: str
    image_url: str
    author: str
    published_at: datetime
    read_time_minutes: int


@dataclass
class UserRecord:
    user_id: str
    name: str
    email: str
    profile_image: str
    preferred_language: str
    persona: str
    preferred_categories: list[str]
    preferred_topics: list[str]
    read_sequence: list[str] = field(default_factory=list)  # chronological news_ids


def _make_description(title: str, topic: str, category: str) -> str:
    return (
        f"A closer look at {topic.lower()} developments in {category.lower()}: "
        f"{title.lower()}. Industry analysts weigh in on what this means for the months ahead."
    )


def _make_content(title: str, topic: str, category: str, author: str) -> str:
    return (
        f"{title}\n\nBy {author}\n\n"
        f"Recent developments in {topic.lower()} are drawing attention across the "
        f"{category.lower()} sector. Experts note that the pace of change has accelerated "
        f"over the past year, driven in part by advances in AI-assisted analysis and "
        f"broader adoption across the industry.\n\n"
        f'"This is a pivotal moment for how organizations think about {topic.lower()}," '
        f"said one analyst familiar with the matter. Stakeholders are now weighing "
        f"near-term implementation costs against long-term strategic value.\n\n"
        f"Looking ahead, observers expect continued investment in this area, with "
        f"several major announcements anticipated in the coming quarters. The story is "
        f"developing and NewsMind AI will continue to track related coverage across {category}."
    )


def generate_news() -> list[NewsRecord]:
    """Generates the full synthetic news catalog (~100+ articles)."""
    rng = random.Random(RANDOM_SEED)
    articles: list[NewsRecord] = []
    counter = 1

    for category in CATEGORIES:
        for entry in TOPIC_BANK[category]:
            topic = entry["topic"]
            for idx, title in enumerate(entry["titles"]):
                news_id = f"N{counter:03d}"
                author = rng.choice(AUTHORS)
                days_ago = rng.randint(0, 29)
                published_at = NOW - timedelta(days=days_ago, hours=idx)
                image_seed = counter * 37 + idx
                articles.append(
                    NewsRecord(
                        news_id=news_id,
                        title=title,
                        description=_make_description(title, topic, category),
                        content=_make_content(title, topic, category, author),
                        category=category,
                        subcategory=topic,
                        image_url=f"https://picsum.photos/seed/newsmind-{image_seed}/600/400",
                        author=author,
                        published_at=published_at,
                        read_time_minutes=rng.randint(3, 8),
                    )
                )
                counter += 1
    return articles


def _find_by_topic(articles: list[NewsRecord], category: str, topic: str, limit: int = 99) -> list[str]:
    return [
        a.news_id
        for a in articles
        if a.category == category and a.subcategory == topic
    ][:limit]


# --- Demo user persona definitions (Section 18: Demo Mode) ---
# Each persona reads a sequence concentrated in specific categories/topics so
# the GRU model learns clearly distinguishable per-user behavior.
_PERSONA_DEFS = [
    {
        "user_id": "U001",
        "name": "Shyam Chauhan",
        "email": "shyam@newsmind.ai",
        "persona": "AI & Technology enthusiast",
        "preferred_categories": ["AI & Machine Learning", "Technology", "Science"],
        "preferred_topics": ["Large Language Models", "Generative AI", "AI Agents", "Robotics"],
        "sequence_spec": [
            ("AI & Machine Learning", "Machine Learning", 1),
            ("AI & Machine Learning", "LLM Research", 1),
            ("AI & Machine Learning", "Generative AI", 2),
            ("AI & Machine Learning", "Robotics", 1),
            ("Technology", "Semiconductors", 1),
        ],
    },
    {
        "user_id": "U002",
        "name": "Ananya Rao",
        "email": "ananya@newsmind.ai",
        "persona": "Sports & Cricket follower",
        "preferred_categories": ["Sports", "Entertainment"],
        "preferred_topics": ["Cricket", "Football", "Olympics"],
        "sequence_spec": [
            ("Sports", "Cricket", 2),
            ("Sports", "Football", 1),
            ("Sports", "Cricket", 1),  # will dedupe/skip already-used via offset logic
            ("Sports", "Olympics", 1),
        ],
    },
    {
        "user_id": "U003",
        "name": "Karan Mehta",
        "email": "karan@newsmind.ai",
        "persona": "Business & Finance reader",
        "preferred_categories": ["Business", "Politics"],
        "preferred_topics": ["Markets", "Finance", "Startups", "Corporate Strategy"],
        "sequence_spec": [
            ("Business", "Markets", 1),
            ("Business", "Finance", 2),
            ("Business", "Startups", 1),
            ("Business", "Corporate Strategy", 1),
        ],
    },
    {
        "user_id": "U004",
        "name": "Leah Fischer",
        "email": "leah@newsmind.ai",
        "persona": "Health & Science reader",
        "preferred_categories": ["Health", "Science"],
        "preferred_topics": ["Digital Health", "Genomics", "Climate Science"],
        "sequence_spec": [
            ("Health", "Digital Health", 2),
            ("Science", "Genomics", 1),
            ("Health", "Mental Health", 1),
        ],
    },
    {
        "user_id": "U005",
        "name": "Noah Bennett",
        "email": "noah@newsmind.ai",
        "persona": "Politics & World Affairs reader",
        "preferred_categories": ["Politics", "Business"],
        "preferred_topics": ["AI Policy", "Elections", "International Relations"],
        "sequence_spec": [
            ("Politics", "AI Policy", 1),
            ("Politics", "Elections", 1),
            ("Politics", "International Relations", 1),
            ("Business", "Markets", 1),
        ],
    },
    {
        "user_id": "U006",
        "name": "Wei Zhang",
        "email": "wei@newsmind.ai",
        "persona": "Entertainment & Streaming fan",
        "preferred_categories": ["Entertainment", "Technology"],
        "preferred_topics": ["Streaming", "Film Industry", "Music"],
        "sequence_spec": [
            ("Entertainment", "Streaming", 2),
            ("Entertainment", "Film Industry", 1),
            ("Entertainment", "Music", 1),
        ],
    },
    {
        "user_id": "U007",
        "name": "Isabella Moreau",
        "email": "isabella@newsmind.ai",
        "persona": "Science & Space enthusiast",
        "preferred_categories": ["Science", "Technology"],
        "preferred_topics": ["Space Exploration", "Physics", "Climate Science"],
        "sequence_spec": [
            ("Science", "Space Exploration", 2),
            ("Science", "Physics", 1),
            ("Science", "Climate Science", 1),
        ],
    },
    {
        "user_id": "U008",
        "name": "Arjun Patel",
        "email": "arjun@newsmind.ai",
        "persona": "Startup founder / Cybersecurity reader",
        "preferred_categories": ["Business", "Technology"],
        "preferred_topics": ["Startups", "Cybersecurity", "Cloud Computing"],
        "sequence_spec": [
            ("Business", "Startups", 2),
            ("Technology", "Cybersecurity", 1),
            ("Technology", "Cloud Computing", 1),
        ],
    },
    {
        "user_id": "U009",
        "name": "Grace Kim",
        "email": "grace@newsmind.ai",
        "persona": "Football fan / Consumer tech buyer",
        "preferred_categories": ["Sports", "Technology"],
        "preferred_topics": ["Football", "Consumer Tech"],
        "sequence_spec": [
            ("Sports", "Football", 2),
            ("Technology", "Consumer Tech", 2),
        ],
    },
    {
        "user_id": "U010",
        "name": "Miguel Santos",
        "email": "miguel@newsmind.ai",
        "persona": "Wellness & Nutrition reader",
        "preferred_categories": ["Health", "Science"],
        "preferred_topics": ["Nutrition", "Mental Health", "Digital Health"],
        "sequence_spec": [
            ("Health", "Nutrition", 2),
            ("Health", "Mental Health", 1),
            ("Health", "Digital Health", 1),
        ],
    },
]


def generate_users(articles: list[NewsRecord]) -> list[UserRecord]:
    """Generates demo users, each with a chronological read_sequence built
    from their persona's sequence_spec — offsetting duplicate topic pulls so
    the sequence doesn't repeat the same article twice."""
    users: list[UserRecord] = []

    for spec in _PERSONA_DEFS:
        seq: list[str] = []
        topic_offsets: dict[tuple[str, str], int] = {}
        for category, topic, count in spec["sequence_spec"]:
            key = (category, topic)
            offset = topic_offsets.get(key, 0)
            available = _find_by_topic(articles, category, topic)
            picked = available[offset: offset + count]
            seq.extend(picked)
            topic_offsets[key] = offset + len(picked)

        users.append(
            UserRecord(
                user_id=spec["user_id"],
                name=spec["name"],
                email=spec["email"],
                profile_image=f"https://picsum.photos/seed/newsmind-user-{spec['user_id'].lower()}/200/200",
                preferred_language="English",
                persona=spec["persona"],
                preferred_categories=spec["preferred_categories"],
                preferred_topics=spec["preferred_topics"],
                read_sequence=seq,
            )
        )
    return users


# --- Training cohort (Section 7: User Behavior Sequence) ---
#
# The 10 named personas above exist to make the dashboard legible: each has a
# short, hand-authored sequence. That is far too little signal to fit a GRU —
# 10 users x ~5 reads yields a single training sample at SEQUENCE_LENGTH=5.
#
# So we additionally synthesise a larger cohort of anonymous readers. Their
# ids are prefixed "C" (vs "U" for the demo personas) so the API can keep them
# out of the persona switcher while the ML pipeline still trains on them.
#
# Each cohort reader walks a category with topic-level "stickiness": they stay
# on a topic for a short run, drift to a neighbouring topic in the same
# category, and occasionally jump to a secondary category. That produces the
# ordered, predictable-but-not-trivial structure the GRU is meant to learn —
# a purely uniform-random sequence would be unlearnable by construction.

TRAINING_COHORT_SIZE = 400
COHORT_MIN_READS = 14
COHORT_MAX_READS = 38

# Categories that plausibly co-occur in one reader's interests. Used to pick a
# secondary category so cross-category drift is realistic rather than random.
_AFFINITY: dict[str, list[str]] = {
    "Technology": ["AI & Machine Learning", "Business", "Science"],
    "AI & Machine Learning": ["Technology", "Science", "Politics"],
    "Business": ["Politics", "Technology"],
    "Sports": ["Entertainment", "Health"],
    "Science": ["Health", "AI & Machine Learning", "Technology"],
    "Politics": ["Business", "AI & Machine Learning"],
    "Entertainment": ["Sports", "Technology"],
    "Health": ["Science", "Sports"],
}


def _index_by_category_topic(
    articles: list[NewsRecord],
) -> dict[str, dict[str, list[str]]]:
    """{category: {topic: [news_id, ...]}} lookup built once and reused."""
    index: dict[str, dict[str, list[str]]] = {}
    for a in articles:
        index.setdefault(a.category, {}).setdefault(a.subcategory, []).append(a.news_id)
    return index


def _walk_reading_sequence(
    rng: random.Random,
    index: dict[str, dict[str, list[str]]],
    primary: str,
    secondary: str,
    length: int,
    p_topic_switch: float = 0.35,
    p_category_switch: float = 0.12,
    allowed_categories: list[str] | None = None,
) -> list[str]:
    """Generates one reader's chronological news_id sequence.

    The walk keeps a current (category, topic) and mostly stays there, giving
    the GRU a local pattern to pick up; `p_topic_switch` / `p_category_switch`
    control how often it moves.

    `allowed_categories` confines the walk to a fixed set. The named demo
    personas pass their own preferred categories so their recent history — the
    window the GRU actually predicts from — stays on-persona; without it the
    affinity drift can carry an "AI & Technology enthusiast" into Business and
    the dashboard then recommends the wrong thing for them.
    """
    pool = allowed_categories or list(index)
    pool = [c for c in pool if c in index] or [primary]

    category = primary if primary in index else pool[0]
    topic = rng.choice(list(index[category]))
    sequence: list[str] = []

    while len(sequence) < length:
        candidates = index[category][topic]
        news_id = rng.choice(candidates)
        # Consecutive duplicates get collapsed by the sequence builder, so
        # avoid emitting them rather than silently shortening the sequence.
        if not sequence or sequence[-1] != news_id:
            sequence.append(news_id)

        roll = rng.random()
        if roll < p_category_switch:
            if allowed_categories:
                choices = pool
            else:
                choices = [
                    c for c in _AFFINITY.get(category, []) + [secondary] if c in index
                ] or pool
            category = rng.choice(choices)
            topic = rng.choice(list(index[category]))
        elif roll < p_category_switch + p_topic_switch:
            topic = rng.choice(list(index[category]))

    return sequence


def generate_cohort_users(
    articles: list[NewsRecord],
    size: int = TRAINING_COHORT_SIZE,
) -> list[UserRecord]:
    """Synthesises `size` anonymous readers used purely to train the GRU."""
    rng = random.Random(RANDOM_SEED + 7)
    index = _index_by_category_topic(articles)
    categories = list(index)
    users: list[UserRecord] = []

    for i in range(1, size + 1):
        primary = rng.choice(categories)
        secondary = rng.choice(_AFFINITY.get(primary, categories))
        length = rng.randint(COHORT_MIN_READS, COHORT_MAX_READS)
        sequence = _walk_reading_sequence(rng, index, primary, secondary, length)

        user_id = f"C{i:04d}"
        users.append(
            UserRecord(
                user_id=user_id,
                name=f"Cohort Reader {i:04d}",
                email=f"cohort{i:04d}@newsmind.local",
                profile_image=f"https://picsum.photos/seed/newsmind-{user_id.lower()}/200/200",
                preferred_language="English",
                persona=f"{primary} reader",
                preferred_categories=[primary, secondary],
                preferred_topics=sorted(index[primary]),
                read_sequence=sequence,
            )
        )
    return users


def extend_persona_sequences(
    articles: list[NewsRecord],
    users: list[UserRecord],
    target_min: int = 9,
    target_max: int = 13,
) -> None:
    """Lengthens each named persona's hand-authored sequence in place.

    Their spec sequence is kept as the opening history (so the dashboard still
    shows the intended story), then extended with a persona-consistent walk so
    the user has enough context for the model to rank against instead of being
    a cold-start case.

    The target is deliberately modest. Categories hold only 9-18 articles, and
    the recommender excludes what a user has already read — so a persona with a
    20+ article history exhausts its own categories and gets pushed off-persona
    recommendations purely for lack of unread candidates. The 400-user training
    cohort carries the model fitting; these sequences only need to be long
    enough to rank against.
    """
    rng = random.Random(RANDOM_SEED + 13)
    index = _index_by_category_topic(articles)

    for u in users:
        primary = u.preferred_categories[0]
        secondary = (
            u.preferred_categories[1] if len(u.preferred_categories) > 1 else primary
        )
        if primary not in index:
            continue
        target = rng.randint(target_min, target_max)
        extra = target - len(u.read_sequence)
        if extra <= 0:
            continue
        tail = _walk_reading_sequence(
            rng,
            index,
            primary,
            secondary,
            extra,
            # Stay on-persona: only wander among this reader's own preferred
            # categories, and favour the primary one.
            p_category_switch=0.08,
            allowed_categories=u.preferred_categories,
        )
        if u.read_sequence and tail and u.read_sequence[-1] == tail[0]:
            tail = tail[1:]
        u.read_sequence.extend(tail)


def generate_dataset(
    include_training_cohort: bool = True,
) -> tuple[list[NewsRecord], list[UserRecord]]:
    """Convenience entry point: returns (news_articles, users).

    `users` is the 10 named demo personas followed by the anonymous training
    cohort. Pass include_training_cohort=False for a dashboard-only dataset.
    """
    articles = generate_news()
    users = generate_users(articles)
    extend_persona_sequences(articles, users)
    if include_training_cohort:
        users.extend(generate_cohort_users(articles))
    return articles, users


if __name__ == "__main__":
    news, users = generate_dataset()
    print(f"Generated {len(news)} news articles across {len(CATEGORIES)} categories.")
    print(f"Generated {len(users)} demo users:")
    for u in users:
        print(f"  {u.user_id} — {u.name} ({u.persona}): {len(u.read_sequence)} articles read")
