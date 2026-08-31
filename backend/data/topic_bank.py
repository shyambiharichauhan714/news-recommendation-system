"""
Topic bank for the synthetic demo news dataset (Section 5: News Dataset).

This mirrors frontend/lib/mock-data.ts's TOPIC_BANK so the backend-generated
dataset and the frontend's standalone demo dataset describe the same
categories/topics/article count, keeping the academic writeup consistent
regardless of whether the frontend is run against the live backend or in
demo-only mode.

8 categories x ~4 topics x 3 titles = ~96-100+ articles.
"""

CATEGORIES = [
    "Technology",
    "AI & Machine Learning",
    "Business",
    "Sports",
    "Science",
    "Politics",
    "Entertainment",
    "Health",
]

TOPIC_BANK: dict[str, list[dict]] = {
    "AI & Machine Learning": [
        {
            "topic": "Large Language Models",
            "titles": [
                "New LLM Architecture Cuts Inference Costs by 40%",
                "How Researchers Are Teaching LLMs to Reason Step by Step",
                "Open-Source LLMs Close the Gap With Proprietary Models",
            ],
        },
        {
            "topic": "Generative AI",
            "titles": [
                "Generative AI Applications Reshape Enterprise Software",
                "The Next Wave of Generative AI: From Text to Multimodal",
                "Startups Race to Build Generative AI Tools for Designers",
            ],
        },
        {
            "topic": "AI Agents",
            "titles": [
                "AI Agents Are Learning to Use Tools Autonomously",
                "Inside the Rise of Multi-Agent AI Systems",
                "AI Agents Could Automate a Third of Knowledge Work by 2030",
            ],
        },
        {
            "topic": "Robotics",
            "titles": [
                "Advanced Robotics Startups Attract Record Funding",
                "Humanoid Robots Take on Warehouse Logistics",
                "Robotics Meets AI: The Next Frontier for Automation",
            ],
        },
        {
            "topic": "LLM Research",
            "titles": [
                "LLM Research Breakthrough Improves Long-Context Understanding",
                "New Benchmark Exposes Weaknesses in Popular LLMs",
                "LLM Research Team Publishes Findings on Emergent Reasoning",
            ],
        },
        {
            "topic": "Machine Learning",
            "titles": [
                "Machine Learning Models Now Predict Supply Chain Disruptions",
                "A Beginner's Guide to Modern Machine Learning Pipelines",
                "Machine Learning in Healthcare: Promise and Pitfalls",
            ],
        },
    ],
    "Technology": [
        {
            "topic": "Cloud Computing",
            "titles": [
                "Cloud Providers Compete on AI Infrastructure Pricing",
                "Edge Computing Gains Ground as Cloud Costs Rise",
                "How Enterprises Are Rearchitecting for Hybrid Cloud",
            ],
        },
        {
            "topic": "Cybersecurity",
            "titles": [
                "New Cybersecurity Framework Targets AI Supply Chains",
                "Ransomware Attacks Shift Focus to Critical Infrastructure",
                "Zero Trust Architecture Becomes Industry Standard",
            ],
        },
        {
            "topic": "Consumer Tech",
            "titles": [
                "Foldable Devices See Renewed Consumer Interest",
                "Wearable Tech Adds Real-Time Health Monitoring",
                "Smart Home Ecosystems Finally Start Talking to Each Other",
            ],
        },
        {
            "topic": "Semiconductors",
            "titles": [
                "Chipmakers Unveil Next-Generation AI Accelerators",
                "Semiconductor Shortage Eases as New Fabs Come Online",
                "The Race for More Efficient AI Chips Heats Up",
            ],
        },
    ],
    "Business": [
        {
            "topic": "Startups",
            "titles": [
                "AI Startup Valuations Cool After Record 2025 Funding",
                "Founders Pivot to Vertical AI Products for Faster Growth",
                "Venture Capital Doubles Down on Enterprise AI Tools",
            ],
        },
        {
            "topic": "Markets",
            "titles": [
                "Tech Stocks Rally on Strong AI Infrastructure Earnings",
                "Global Markets React to Central Bank Rate Decision",
                "Investors Weigh AI Spending Against Near-Term Returns",
            ],
        },
        {
            "topic": "Corporate Strategy",
            "titles": [
                "Fortune 500 Firms Accelerate AI Adoption Roadmaps",
                "How Retailers Are Using AI to Cut Inventory Costs",
                "Corporate Boards Add AI Oversight Committees",
            ],
        },
        {
            "topic": "Finance",
            "titles": [
                "Fintech Firms Embed AI Copilots Into Trading Platforms",
                "Banks Trial AI Agents for Customer Service at Scale",
                "AI-Driven Fraud Detection Cuts Losses for Card Issuers",
            ],
        },
    ],
    "Sports": [
        {
            "topic": "Cricket",
            "titles": [
                "Cricket Analytics Firms Use AI to Predict Match Outcomes",
                "Young Talent Shines in Domestic Cricket Season",
                "Cricket Boards Explore AI-Assisted Umpiring Tools",
            ],
        },
        {
            "topic": "Football",
            "titles": [
                "Football Clubs Adopt AI for Injury Prevention",
                "Transfer Window Roundup: Biggest Moves This Season",
                "AI-Powered Scouting Reshapes Football Recruitment",
            ],
        },
        {
            "topic": "Olympics",
            "titles": [
                "Olympic Athletes Turn to AI-Driven Training Programs",
                "Host City Unveils Tech-Forward Olympic Venues",
                "AI Timing Systems Set New Standard for Precision",
            ],
        },
        {
            "topic": "Basketball",
            "titles": [
                "Basketball Teams Use Computer Vision for Play Analysis",
                "Rookie Season Records Fall as League Talent Deepens",
                "AI Models Now Forecast Player Injury Risk",
            ],
        },
    ],
    "Science": [
        {
            "topic": "Space Exploration",
            "titles": [
                "Space Agency Announces New Mars Sample Return Timeline",
                "Private Space Firms Compete for Lunar Cargo Contracts",
                "Astronomers Use AI to Sift Through Telescope Data",
            ],
        },
        {
            "topic": "Climate Science",
            "titles": [
                "AI Models Improve Extreme Weather Forecasting Accuracy",
                "Climate Researchers Release Updated Emissions Projections",
                "New Sensors Track Ocean Warming in Real Time",
            ],
        },
        {
            "topic": "Genomics",
            "titles": [
                "Genomics Startups Use AI to Speed Up Drug Discovery",
                "Researchers Map New Links Between Genes and Disease",
                "AI-Assisted Gene Editing Shows Promise in Early Trials",
            ],
        },
        {
            "topic": "Physics",
            "titles": [
                "Physicists Report Progress on Room-Temperature Superconductors",
                "Quantum Computing Milestone Brings Error Correction Closer",
                "New Particle Detector Data Puzzles Researchers",
            ],
        },
    ],
    "Politics": [
        {
            "topic": "AI Policy",
            "titles": [
                "Lawmakers Debate New AI Safety Regulation Framework",
                "Governments Coordinate on Cross-Border AI Standards",
                "AI Policy Experts Testify on Model Transparency Rules",
            ],
        },
        {
            "topic": "Elections",
            "titles": [
                "Election Officials Brace for AI-Generated Misinformation",
                "Campaigns Increasingly Rely on Data-Driven Outreach",
                "Voter Turnout Trends Shift Ahead of Upcoming Election",
            ],
        },
        {
            "topic": "International Relations",
            "titles": [
                "Trade Talks Resume Amid Tech Export Control Disputes",
                "Diplomats Meet to Discuss AI Arms Control Proposals",
                "Regional Alliance Expands Economic Cooperation Pact",
            ],
        },
    ],
    "Entertainment": [
        {
            "topic": "Streaming",
            "titles": [
                "Streaming Platforms Use AI to Personalize Recommendations",
                "Original Series Budgets Shrink as Competition Grows",
                "AI-Generated Dubbing Expands Global Content Reach",
            ],
        },
        {
            "topic": "Film Industry",
            "titles": [
                "Studios Debate Guidelines for AI in Film Production",
                "Box Office Rebounds With Strong Summer Slate",
                "Indie Filmmakers Embrace AI-Assisted Editing Tools",
            ],
        },
        {
            "topic": "Music",
            "titles": [
                "Musicians Push Back on AI-Generated Cover Songs",
                "Streaming Royalties Debate Heats Up Among Artists",
                "AI Mastering Tools Change Home Studio Production",
            ],
        },
    ],
    "Health": [
        {
            "topic": "Digital Health",
            "titles": [
                "AI Diagnostic Tools Gain Approval for Clinical Use",
                "Wearables Data Helps Predict Chronic Disease Risk",
                "Telehealth Platforms Add AI Symptom Triage",
            ],
        },
        {
            "topic": "Nutrition",
            "titles": [
                "New Study Links Diet Patterns to Long-Term Brain Health",
                "Personalized Nutrition Apps Use AI to Tailor Meal Plans",
                "Researchers Question Popular Intermittent Fasting Claims",
            ],
        },
        {
            "topic": "Mental Health",
            "titles": [
                "AI Chat Tools Expand Access to Mental Health Support",
                "Workplace Wellness Programs Show Mixed Results",
                "Sleep Researchers Identify New Recovery Biomarkers",
            ],
        },
    ],
}

AUTHORS = [
    "Maya Chen", "Daniel Ortiz", "Priya Nair", "Tom Becker", "Sarah Kim",
    "James Wu", "Elena Rossi", "Omar Farouk", "Lucy Grant", "Ravi Shah",
]
