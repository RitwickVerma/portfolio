// GENERATED from the resume builder's base.json (vault resume-src). Do not edit by hand:
// change base.json, rebuild the PDF, and regenerate this file so the page and the PDF match.

export const resume = {
  "title": "Backend Engineer · C++ · Search Systems",
  "summary": "Backend engineer with 5.5 years on Cassini, the distributed C++ search engine behind every ebay.com search (1B+ listings). Owned eBay Motors fitment; built caching and query transforms on the serving path. 215 merged PRs.",
  "roles": [
    {
      "role": "Software Engineer 3, Search Backend",
      "location": "San Francisco, CA",
      "period": "Jun 2023 - Present",
      "bullets": [
        "Owned eBay Motors fitment, the C++ subsystem that decides which parts fit a buyer's vehicle on 16 sites and 19 catalogs. Top author of its current code (31%) and point of contact for the partner teams that rely on it.",
        "Led fitment's move to the engine's new transform architecture, then moved its production index and test fixtures off a legacy query language with no cutover outage, keeping all 2,549 unit and 511 regression tests green.",
        "Replayed 50,000 production-sampled queries before merging my refactor of the client fitment operator, traced the new failures to init-order-dependent shared config and fixed the root cause: replay errors 167 to 6 (fix in review).",
        "Built a request-scoped cache for recall recovery that needs no invalidation and never caches transient failures. Also in recall: client-supplied vectors skip the embedding service, and big requests run as concurrent batches.",
        "Built three C++ query transforms for results-page product carousels (18 PRs): one batched round trip gets each product's listing count and lowest price under the user's filters; a failed table is dropped, not shown half-built.",
        "Designed the engine side of a new fitment category (pre-launch): showed a proposed bitmask match accepted packs with the wrong piece counts, kept vehicle matching on the proven pipeline, raised a requirements conflict early.",
        "Wrote the Markdown-driven test frameworks (tests as readable tables) the team made its standard. Made the tokenizer stack allocator-aware (C++ PMR) and served it as an internal HTTP API that science and QA use."
      ]
    },
    {
      "role": "Software Engineer 2, Search Backend",
      "location": "San Jose, CA",
      "period": "Mar 2021 - Jun 2023",
      "bullets": [
        "Took over fitment in year two (code 6 to 13 years old, no unit tests): modernized its memory handling, refactored its worst parts, wrote its first unit tests, and rebuilt the config generators so config stopped waiting on engine releases.",
        "Built garage-vehicle fitment in a cross-team Motors effort: constraints come from the buyer's vehicle, cutting two service calls from the latency path. Made tire fitment-by-spec config-driven, so new countries need no engine change.",
        "Co-built fitment's A/B testing (control and treatment on one request, only affected queries tagged). Fixed a production memory spike by capping a combinatorial expansion. Moved core request containers to PMR allocators."
      ]
    }
  ],
  "earlier": "Earlier: software intern at Shoelace Wireless (Android, 2020) and BHEL (Java EE, 2017).",
  "projectsNote": "Built with AI coding agents (Hermes, self-hosted) under my direction. Also ShutUp, an Android app with 26,000+ installs.",
  "projects": [
    {
      "name": "TizenAmbilight",
      "description": "Ambilight from inside a Samsung TV. The public capture API only returns the UI layer, so it reads the undocumented video plane instead, tone-maps HDR and drives an LED strip at 20 to 25 fps."
    },
    {
      "name": "Plutus",
      "description": "Ran 30+ trading-strategy experiments on point-in-time data with bootstrap confidence intervals; none held up."
    },
    {
      "name": "Homelab as code",
      "description": "16 Proxmox guests, 14 declared in OpenTofu, with a nightly CI job that flags config drift."
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
