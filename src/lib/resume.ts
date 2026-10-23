// GENERATED from the resume builder's base.json (vault resume-src). Do not edit by hand:
// change base.json, rebuild the PDF, and regenerate this file so the page and the PDF match.

export const resume = {
  "title": "Backend Engineer · C++ · Search Systems",
  "summary": "Backend engineer with 5.5 years on Cassini, the C++ engine behind ebay.com search. Owned eBay Motors fitment and worked on caching, query transforms and the tokenizer on the serving path. 215 merged PRs since 2021.",
  "roles": [
    {
      "role": "Software Engineer 3, Search Backend",
      "location": "San Francisco, CA",
      "period": "Jun 2023 - Present",
      "bullets": [
        "Owned eBay Motors fitment, the part of the engine that decides which parts fit a buyer's vehicle, across 16 sites and 19 catalogs. Partner teams came to me first with fitment questions. Wrote 31% of its current code.",
        "Moved fitment onto the engine's new transform architecture. Then migrated its production index and test fixtures off a legacy query language in steps, with no big-bang switch, while 2,549 unit and 511 regression tests stayed green.",
        "Replayed 50,000 production queries before merging a refactor of the client fitment operator. The new failures traced to shared config that depended on initialization order. Fixed the cause; replay errors fell from 167 to 6. In review.",
        "Added a request-scoped cache in recall recovery so the same backend call is not repeated within one request: nothing to invalidate, and failures are never cached. Also let clients send precomputed embeddings.",
        "Wrote three C++ query transforms for the product carousels on the results page, where one batched round trip fetches listing counts and lowest prices under the user's filters. Also wrote the Markdown-driven test frameworks the team now uses."
      ]
    },
    {
      "role": "Software Engineer 2, Search Backend",
      "location": "San Jose, CA",
      "period": "Mar 2021 - Jun 2023",
      "bullets": [
        "Took over the fitment code in 2022, 6 to 13 years old with no unit tests. Modernized its memory handling, refactored the worst parts, wrote its first unit tests and rebuilt the config generators so config stopped waiting on releases.",
        "Built garage-vehicle fitment in a cross-team Motors effort: the buyer's saved vehicle sets the constraints, taking two service calls out of the latency path. Made tire fitment by spec config-driven for new countries.",
        "Co-built fitment's A/B testing, where control and treatment run on one request and only the affected queries are tagged. Moved the engine's core request containers to C++ PMR allocators and made the tokenizer allocator-aware; it was later exposed as an internal HTTP API."
      ]
    }
  ],
  "earlier": "Earlier: Software intern at Shoelace Wireless (Android, 2020) and BHEL (Java EE, 2017).",
  "projectsNote": "",
  "projects": [
    {
      "name": "ShutUp",
      "description": "Android app that answers, silences and ends calls with a wave over the proximity sensor. Written in 2016. 26,000+ downloads, 4.3 stars on Google Play. AI-assisted rebuild in 2026."
    },
    {
      "name": "RPG in C++",
      "description": "2D RPG on SDL2 with no game engine. Collisions, sprite animation, weapons and dialogue trees written from scratch across 44 source files."
    },
    {
      "name": "TizenAmbilight (AI-assisted)",
      "description": "Ambient TV lighting that runs on the Samsung TV itself. The public capture API only returns the UI layer, so it reads the decoded video plane, tone-maps HDR and drives an LED strip at 20 to 25 fps."
    }
  ],
  "skills": [
    {
      "label": "Languages",
      "value": "C++17/20/23, Python, Java"
    },
    {
      "label": "Search",
      "value": "query understanding (rewriting, tokenization, spell correction), ranking factors, embedding retrieval, caching, A/B testing, traffic replay"
    },
    {
      "label": "Tooling",
      "value": "CMake, GoogleTest, ASan, clang-tidy, Git, Jenkins, Linux, Claude Code"
    }
  ],
  "education": [
    {
      "degree": "Master of Computer Science",
      "school": "University of California, Irvine",
      "period": "2019 - 2020"
    },
    {
      "degree": "B.Tech, Computer Science and Engineering",
      "school": "SRM Institute of Science & Technology",
      "period": "2015 - 2019"
    }
  ]
} as const;
