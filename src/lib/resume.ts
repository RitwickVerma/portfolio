// GENERATED from the resume builder's base.json (vault resume-src). Do not edit by hand:
// change base.json, rebuild the PDF, and regenerate this file so the page and the PDF match.

export const resume = {
  "title": "Backend Engineer · C++ · Search Systems",
  "summary": "Backend engineer with 5.5 years on Cassini, the C++ search engine behind every ebay.com search (1B+ listings). Owned eBay Motors fitment across 16 sites and 19 catalogs: query semantics, caching, rewriting and embedding plumbing on the serving path. Does migrations without flag days and builds the correctness tooling the team runs on.",
  "roles": [
    {
      "role": "Software Engineer 3, Search Backend (promoted from SE2)",
      "location": "San Francisco, CA",
      "period": "Jun 2023 to Present",
      "bullets": [
        "Owned eBay Motors fitment, the C++ subsystem that decides which parts fit a buyer's vehicle across 16 sites and 19 catalogs, and am the top author of its current code. Designed the query operator clients use to request fit constraints or a per-item \"fits\" signal.",
        "Retired a legacy query language from fitment's production index and the engine's test fixtures with no flag day: dual parser, migrate the data, remove the fallback. Audited 404 deployed expressions across 4,815 configs first and kept 2,549 unit tests and 511 regression cases green throughout.",
        "Before merging a fitment refactor, replayed 50,000 production-sampled queries, traced 160 new failures to an init-order dependency in shared config and fixed the root cause instead of patching configs (new errors 167 to 6).",
        "Built a request-scoped result cache that removed repeat backend calls across recall-recovery passes, and added client-supplied embeddings with batching under the embedding service's limits. Revived a dead embedding cache and fixed a production memory spike by capping a combinatorial expansion in query rewriting.",
        "Built three C++ query transforms for the product-grouped carousels on the results page and folded three ranking expressions into one native C++ macro, both checked against replayed production traffic.",
        "In a design review for a new fitment category, used real size data to show the proposed bitmask match accepted wrong multi-part packs; the team switched designs. Led a cross-team production investigation that disproved a ticket's root cause with read-only production queries and traced the gap to an upstream data source.",
        "Made the tokenizer stack allocator-aware (C++ PMR) and shipped it as an internal HTTP API that science and QA use to debug tokenization. Wrote the markdown-based test frameworks the team runs on and a language server for the query language (719 operators)."
      ]
    },
    {
      "role": "Software Engineer 2, Search Backend",
      "location": "San Jose, CA",
      "period": "Mar 2021 to Jun 2023",
      "bullets": [
        "Rewrote fitment for garage vehicles and tire and wheel specifications, with spec translation for the German, French and Italian sites, and added A/B testing that runs control and treatment in the same request.",
        "Moved fitment configuration out of the engine repo so config changes ship without an engine release, and reworked the engine's core query, table and property containers to use C++ polymorphic allocators."
      ]
    }
  ],
  "earlier": "Earlier: software intern at Shoelace Wireless (Android, 2020) and BHEL (Java EE, 2017).",
  "projectsNote": "Side projects are built with AI coding agents (Hermes, self-hosted); I make the design calls and verify the results. Also ShutUp, an Android app with 26,000+ downloads.",
  "projects": [
    {
      "name": "TizenAmbilight",
      "description": "Ambilight from inside a Samsung TV. The public capture API only returns the UI layer, so it reads the undocumented video plane instead, tone-maps HDR and drives an LED strip at 20 to 25 fps."
    },
    {
      "name": "Plutus",
      "description": "Ran 30+ trading-strategy experiments on point-in-time data with bootstrap confidence intervals. None showed an edge that held up, and the write-up says so."
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
      "value": "Query rewriting, tokenization, ranking factors, embedding retrieval, caching, A/B testing, production traffic replay"
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
