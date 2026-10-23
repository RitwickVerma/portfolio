// GENERATED from the resume builder's base.json (vault resume-src). Do not edit by hand:
// change base.json, rebuild the PDF, and regenerate this file so the page and the PDF match.

export const resume = {
  "title": "Backend Engineer · C++ · Search Systems",
  "summary": "Backend engineer with 5.5 years on Cassini, the C++ search engine behind every ebay.com search (1B+ listings). Owned eBay Motors fitment, and built request caching and query transforms on the engine's serving path.",
  "roles": [
    {
      "role": "Software Engineer 3, Search Backend (promoted from SE2)",
      "location": "San Francisco, CA",
      "period": "Jun 2023 to Present",
      "bullets": [
        "Owned eBay Motors fitment, the C++ subsystem that decides which parts fit a buyer's vehicle across 16 sites and 19 catalogs. Moved its config out of the engine repo, so config changes stopped waiting on engine releases.",
        "Retired a legacy query language from fitment's production index and the engine's test fixtures without a flag day: the loader read both formats until the data migrated, then the fallback came out. Audited 404 deployed expressions in 4,815 configs first, kept 2,549 unit tests and 511 regression cases green, and wrote up the blocked tracks for their owners.",
        "Caught a regression before merge by replaying 50,000 production-sampled queries: shared config was set by whichever transform initialized first. Made it order-independent, which also removed a latent startup crash. New errors fell from 167 to 6.",
        "Removed repeat backend calls in recall recovery with a request-scoped cache that needs no invalidation and can't leak across users; transient failures are never cached. For embeddings, client-supplied vectors skip the service call when every item has one and large requests batch under the service's limit. Revived a silently dead embedding cache.",
        "Built three C++ query transforms for search-result product carousels: one batched round trip prices products under the user's filters, and a failed table is dropped rather than shown half-built.",
        "Led the engine-side design for a new fitment category: real size data showed the proposed bitmask match accepted wrong multi-blade packs and that the existing tire pipeline could serve the category with no new engine code, so the team switched. Disproved a ticket's root cause with read-only production queries and routed it to indexing.",
        "Wrote tools other engineers build on: markdown test frameworks the team made its standard, a query-language server (719 operators), and an allocator-aware (C++ PMR) tokenizer served as an internal HTTP API. Fixed two crashes in shared engine code (a null dereference, an iterator invalidated mid-loop)."
      ]
    },
    {
      "role": "Software Engineer 2, Search Backend",
      "location": "San Jose, CA",
      "period": "Mar 2021 to Jun 2023",
      "bullets": [
        "Took over the fitment code in year two, 6 to 13 years old with no tests: modernized its memory handling, refactored its worst components into a readable flow, rebuilt the config-generation scripts, and wrote its first unit and regression tests.",
        "Designed the query operator that lets clients state fitment constraints directly, removing two downstream service calls from the latency path, in a cross-team Motors effort. Became the fitment point of contact for the SaaS, indexing and Motors teams.",
        "Built garage-vehicle and tire-spec fitment: the buyer's chosen vehicle drives the constraints, with DE, FR and IT spec translation, and co-built A/B testing that tags only the queries a change affects. Moved the engine's core containers to C++ PMR allocators."
      ]
    }
  ],
  "earlier": "Earlier: software intern at Shoelace Wireless (Android, 2020) and BHEL (Java EE, 2017).",
  "projectsNote": "Side projects are built with AI coding agents (Hermes, self-hosted) under my direction. Also ShutUp, an Android app with 26,000+ installs.",
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
      "label": "Systems",
      "value": "Query rewriting, tokenization, ranking factors, embedding retrieval, request caching, A/B testing, traffic replay"
    },
    {
      "label": "Tooling",
      "value": "C++ PMR, ASan, clang-tidy, CMake, GoogleTest, Linux, Docker, GitLab CI, Claude Code"
    }
  ],
  "education": [
    {
      "degree": "Master of Computer Science",
      "school": "University of California, Irvine",
      "period": "2019 to 2020"
    },
    {
      "degree": "B.Tech, Computer Science and Engineering",
      "school": "SRM Institute of Science and Technology",
      "period": "2015 to 2019"
    }
  ]
} as const;
