// GENERATED from the resume builder's base.json (vault resume-src). Do not edit by hand:
// change base.json, rebuild the PDF, and regenerate this file so the page and the PDF match.

export const resume = {
  "title": "Backend Engineer · C++ · Search Systems",
  "summary": "Backend engineer with 5.5 years on Cassini, the distributed C++ search engine behind every ebay.com search (1B+ listings). Owned the fitment subsystem and built caching, query-rewriting and embedding plumbing on its serving path. Joined as SE2 (university hire), promoted to SE3; 215 merged PRs, 13th of 121 contributors to the engine.",
  "roles": [
    {
      "role": "Software Engineer 3, Search Backend (promoted)",
      "location": "San Francisco, CA",
      "period": "Jun 2023 to Present",
      "bullets": [
        "Owned eBay Motors fitment, the C++ subsystem that decides which parts fit a buyer's vehicle, across 16 sites and 19 catalogs; top author of its current code (31% of lines). Designed the query operator clients use to request fit constraints or a per-item \"fits\" signal.",
        "Built a request-scoped result cache that removed repeat backend calls across recall-recovery passes. Added client-supplied embeddings and batching under the embedding service's limits, and fixed a dead embedding cache.",
        "Built three C++ query transforms for the product-grouped carousels on the results page, checked against replayed traffic. Folded three ranking expressions into one native C++ macro that matched production on live items.",
        "Moved fitment's production index and the engine's test fixtures off a legacy query language with no flag day, keeping 2,549 unit tests and 511 regression cases green, after auditing 404 deployed expressions across 4,815 configs.",
        "Before merging a fitment refactor, replayed 50,000 production-sampled queries, traced 160 new failures to an init-order dependency in shared config and fixed the root cause (new errors 167 to 6). Fixed a production memory spike by capping a combinatorial expansion in query rewriting.",
        "Made the tokenizer stack allocator-aware (C++ PMR) in 7 PRs and shipped it as an internal HTTP API that science and QA teams use to debug tokenization.",
        "Wrote the markdown-based test frameworks the team adopted as its standard and a language server for the engine's query language (719 operators), and added cross-environment result diffing to the team's query CLI."
      ]
    },
    {
      "role": "Software Engineer 2, Search Backend",
      "location": "San Jose, CA",
      "period": "Mar 2021 to Jun 2023",
      "bullets": [
        "Rewrote fitment for garage vehicles and tire and wheel specifications (57 fitment PRs in 2022), with spec translation for the German, French and Italian sites, and added A/B testing that runs control and treatment in the same request.",
        "Reworked the engine's core query, table and property containers to use C++ polymorphic allocators."
      ]
    }
  ],
  "earlier": "Earlier: software intern at Shoelace Wireless (Android, 2020) and BHEL (Java EE, 2017).",
  "projectsNote": "Side projects are written with AI coding agents, mostly Hermes, an open-source agent I run on my own hardware. I make the design calls and check the results. Also ShutUp, an Android app with 26,000+ downloads (v1 written by hand in 2016).",
  "projects": [
    {
      "name": "TizenAmbilight",
      "description": "Ambilight from inside a Samsung TV. The public capture API only returns the UI layer, so it reads the undocumented video plane instead, tone-maps HDR and drives an LED strip at 20 to 25 fps."
    },
    {
      "name": "Crush 80 firmware",
      "description": "Maintain a fork of a community ZMK port for a keyboard with no vendor source: added a 154-LED per-key RGB driver over SPI-DMA, OpenRGB support and one-cable install."
    },
    {
      "name": "Plutus",
      "description": "Ran 30+ trading-strategy experiments on point-in-time data with bootstrap confidence intervals. None showed an edge that held up, and the write-up says so."
    },
    {
      "name": "Homelab as code",
      "description": "A hobby: 16 Proxmox guests, 14 declared in OpenTofu, with a nightly CI job that flags config drift."
    }
  ],
  "skills": [
    {
      "label": "Languages",
      "value": "C++ (17/20/23), Python, Java, C"
    },
    {
      "label": "C++ tooling",
      "value": "Polymorphic allocators (PMR), ASan, clang-tidy, CMake, GoogleTest"
    },
    {
      "label": "Search",
      "value": "Query rewriting, tokenization, recall and ranking factors, embedding retrieval, caching, A/B tests"
    },
    {
      "label": "AI tools",
      "value": "Claude Code, agent tooling and MCP servers"
    },
    {
      "label": "Tools",
      "value": "Linux, Docker, Git, GitLab CI"
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
