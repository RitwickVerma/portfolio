// GENERATED from the resume builder's base.json (vault resume-src). Do not edit by hand:
// change base.json, rebuild the PDF, and regenerate this file so the page and the PDF match.

export const resume = {
  "title": "Search and Retrieval Infrastructure · C++ · Systems",
  "summary": "Backend engineer with 5.5 years on Cassini, the distributed C++ search engine behind every ebay.com search (1B+ listings). Owned vehicle-parts fitment and built retrieval, caching and query-transform features, shipped through A/B tests. 215 merged PRs, in the top 10% of 121 contributors to the engine.",
  "roles": [
    {
      "role": "Software Engineer 3, Search Backend",
      "location": "San Francisco, CA",
      "period": "Jun 2023 to Present",
      "bullets": [
        "Owned eBay Motors fitment, the C++ subsystem that decides which parts fit a buyer's vehicle, across 16 sites and 19 catalogs. Designed the query operator clients use to ask for fit constraints or a per-item \"fits\" signal.",
        "Built a request-scoped result cache that removed repeat backend calls across recall-recovery passes. Requests that already carry embeddings now skip the embedding service, large requests are batched under its limits Also fixed an embedding cache that had stopped hitting.",
        "Designed three C++ query transforms for the product-grouped carousels on the results page, checked against replayed production traffic. Folded three ranking expressions into one native C++ macro that matched production exactly.",
        "Made the tokenizer stack allocator-aware (C++ PMR) in 7 PRs and shipped it as an HTTP API for other teams.",
        "Replayed 50,000 production-sampled queries and caught an initialization-order bug before release, and the fix cut new errors by about 96%. Also hotfixed a production parser crash and capped a combinatorial blow-up in query rewriting.",
        "Wrote the markdown-based test frameworks the team adopted as its standard, a language server for the engine's query language (719 operators), and a CLI that diffs query results across environments."
      ]
    },
    {
      "role": "Software Engineer 2, Search Backend",
      "location": "San Jose, CA",
      "period": "Mar 2021 to Jun 2023",
      "bullets": [
        "Rewrote fitment for garage vehicles and tire and wheel specifications (88 merged PRs in 2022), with spec translation for the German, French and Italian sites, and added A/B testing to it.",
        "Reworked the engine's core query, table and property containers to use C++ polymorphic allocators."
      ]
    }
  ],
  "earlier": "Earlier: software intern at Shoelace Wireless (Android, 2020) and BHEL (Java EE, 2017).",
  "projectsNote": "Side projects are written with AI coding agents. I made the design calls and checked the results. Also ShutUp, an Android app with 26,000+ downloads (v1 written by hand in 2016).",
  "projects": [
    {
      "name": "Self-hosted agent",
      "description": "An LLM agent on my homelab with tools for code, mail, documents and infrastructure. It runs the homelab and does most of the typing on the projects below."
    },
    {
      "name": "TizenAmbilight",
      "description": "Ambilight from inside a Samsung TV. The public capture API only returns the UI layer, so it reads the undocumented video plane instead, tone-maps HDR and drives an LED strip at 20 to 25 fps. The image decoders were checked byte for byte against libjpeg-turbo."
    },
    {
      "name": "Crush 80 firmware",
      "description": "Open ZMK firmware for a keyboard whose vendor never released source: a Telink RISC-V chip, 154 per-key LEDs on a ported SPI-DMA driver, and a pinout recovered from PCB photos and the stock binary."
    },
    {
      "name": "Homelab as code",
      "description": "16 Proxmox guests behind Traefik, Authelia SSO and a Headscale VPN. 14 are declared in OpenTofu, a nightly CI job commits config drift, and alerts fire once per real fault."
    },
    {
      "name": "Plutus",
      "description": "Python research setup for trading strategies with point-in-time backtests and block-bootstrap confidence intervals. Five popular strategies failed the tests and were dropped."
    }
  ],
  "skills": [
    {
      "label": "Languages",
      "value": "C++ (17/20/23), Python, Java, Kotlin, C#, C"
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
      "label": "Systems",
      "value": "Linux, Docker, Proxmox, OpenTofu, GitLab CI, Traefik and OIDC"
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
