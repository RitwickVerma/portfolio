// GENERATED from the resume builder's base.json (vault resume-src). Do not edit by hand:
// change base.json, rebuild the PDF, and regenerate this file so the page and the PDF match.

export const resume = {
  "title": "Backend Engineer · C++ · Search Systems",
  "summary": "Backend engineer. 5.5 years on Cassini, the C++ search engine behind ebay.com search. Owned eBay Motors fitment and worked on caching, query transforms and the tokenizer on the serving path. 215 merged PRs.",
  "roles": [
    {
      "role": "Software Engineer 3, Search Backend",
      "location": "San Francisco, CA",
      "period": "Jun 2023 - Present",
      "bullets": [
        "Owned eBay Motors fitment, the part of the engine that decides which parts fit a buyer's vehicle, on 16 sites and 19 catalogs. Partner teams came to me first with fitment questions. I wrote 31% of its current code.",
        "Moved fitment onto the engine's new transform architecture, then took its production index and the test fixtures off a legacy query language without a cutover. 2,549 unit tests and 511 regression cases stayed green.",
        "Before merging a refactor of the client fitment operator, replayed 50,000 production queries. The new failures traced to shared config that depended on initialization order. Fixed the cause; errors went from 167 to 6. The fix is in review.",
        "Added a request-scoped cache in recall recovery so the same backend call is not repeated within one request. Nothing to invalidate, and failures are never cached. Also let clients pass their own embeddings.",
        "Wrote three C++ query transforms for the product carousels on the results page (one batched round trip fetches listing counts and lowest prices under the user's filters), and the Markdown-driven test frameworks the team now uses."
      ]
    },
    {
      "role": "Software Engineer 2, Search Backend",
      "location": "San Jose, CA",
      "period": "Mar 2021 - Jun 2023",
      "bullets": [
        "Took over the fitment code in my second year. It was 6 to 13 years old with no unit tests. Modernized its memory handling, refactored the worst parts, wrote the first unit tests, and rebuilt the config generators so config stopped waiting on engine releases.",
        "Garage-vehicle fitment, in a cross-team Motors effort: the buyer's saved vehicle sets the constraints, which took two service calls out of the latency path. Made tire fitment-by-spec config-driven for new countries.",
        "Co-built fitment's A/B testing (control and treatment evaluated on one request, only affected queries tagged). Moved the engine's core request containers to C++ PMR allocators and made the tokenizer allocator-aware, later served as an internal HTTP API."
      ]
    }
  ],
  "earlier": "Earlier: software intern at Shoelace Wireless (Android, 2020) and BHEL (Java EE, 2017).",
  "projectsNote": "ShutUp and the RPG are hand-written. TizenAmbilight was built by directing Claude; I did the design and the on-device verification. Hobby: a 16-machine homelab run as code.",
  "projects": [
    {
      "name": "ShutUp",
      "description": "Android app that answers, silences and ends calls with a wave over the proximity sensor. Written in 2016. 26,000+ downloads, 4.3 stars on Play. Rebuilt in 2026 with AI assistance."
    },
    {
      "name": "RPG Engine",
      "description": "2D RPG in C++ on SDL2 with no game engine. Collisions, sprite animation, weapons and dialogue trees written from scratch, 44 source files."
    },
    {
      "name": "TizenAmbilight",
      "description": "Ambilight running on the Samsung TV itself. The public capture API only returns the UI layer, so it reads the decoded video plane, tone-maps HDR and drives an LED strip at 20 to 25 fps."
    }
  ],
  "skills": [
    {
      "label": "Languages",
      "value": "C++ (17/20/23), Python, Java"
    },
    {
      "label": "Search",
      "value": "Query understanding (rewriting, tokenization, spell correction), ranking factors, embedding retrieval, caching"
    },
    {
      "label": "Tooling",
      "value": "C++ PMR, ASan, clang-tidy, CMake, GoogleTest, Git, Jenkins, Linux, A/B tests, traffic replay, Claude Code"
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
      "school": "SRM Institute of Science and Technology",
      "period": "2015 - 2019"
    }
  ]
} as const;
