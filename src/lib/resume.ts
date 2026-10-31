// GENERATED from the resume builder's base.json (vault resume-src) by gen_resume_ts.py. Do not edit by hand.

export const resume = {
  "title": "Backend Engineer · C++ · Search Systems",
  "summary": "Backend engineer with 5.5 years on Cassini, the C++ search engine behind ebay.com. Owned eBay Motors fitment from 2022, and built caching, query transforms and test tooling on the engine's serving path.",
  "updated": "Oct 2026",
  "roles": [
    {
      "role": "Software Engineer 3, Search Backend",
      "location": "San Francisco, CA",
      "period": "Jun 2023 - Present",
      "bullets": [
        "Owned eBay Motors fitment, the engine logic that decides which parts fit a buyer's vehicle on 16 sites and 19 catalogs. Top contributor to its current code and the first contact for the partner teams that depend on it.",
        "Led fitment's move onto the engine's new query-transform architecture, then migrated its production index and test fixtures off a legacy query language step by step, with 2,549 unit and 511 regression tests green throughout.",
        "Before merging my refactor of how fitment requests are built, replayed 50,000 production queries against old and new builds and traced the new errors to shared config that depended on initialization order. Fixing the root cause cut them from 167 to 6; the change is in final review.",
        "Added a per-request cache to the path that retries searches returning too few results, so each repeated backend lookup in a search runs only once. Failures are never cached.",
        "Built three C++ query transforms for results-page product carousels, where one batched round trip fetches each product's listing count and lowest price under the shopper's filters.",
        "Wrote Markdown test frameworks for the engine's query transforms and HTTP endpoints, so tests read as tables; the team adopted them for new tests. Served the tokenizer as an internal HTTP API for science and QA."
      ]
    },
    {
      "role": "Software Engineer 2, Search Backend",
      "location": "San Jose, CA",
      "period": "Mar 2021 - Jun 2023",
      "bullets": [
        "Took over fitment in 2022, when the code was 6 to 13 years old with no unit tests. Modernized its memory handling, refactored the worst components, wrote its first tests, and moved config generation off the engine release cycle.",
        "Built garage-vehicle fitment in a cross-team Motors project: the buyer's saved vehicle sets the constraints directly, removing two service calls from the search latency path. Made tire-size fitment config-driven for new countries.",
        "Co-built fitment's A/B testing: control and treatment run in one request, and only the queries a change affects are tagged. Moved the engine's core request containers and the tokenizer to C++ PMR allocators."
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
      "value": "query understanding (rewriting, tokenization), ranking factors, embedding retrieval, request caching, traffic replay, A/B tests"
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
