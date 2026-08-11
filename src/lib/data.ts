import type { Project, Experience, Service } from "./types";

export const projects: Project[] = [
  {
    slug: "shutup",
    title: "ShutUp",
    description:
      "Gesture-based telephony control app. 26,000+ downloads, 4.3 stars on Google Play.",
    longDescription:
      "An open-source Android application that uses the proximity sensor to control call states and schedule future calls. Built in Java and Kotlin, published on the Play Store with over 26,000 organic downloads and a 4.3-star rating. Features include automatic call muting when phone is face-down, scheduled call-back reminders, and gesture-based call acceptance.",
    tech: ["Java", "Kotlin", "Android SDK", "SQLite"],
    links: {
      github: "https://github.com/RitwickVerma/ShutUp",
    },
    featured: true,
    category: "android",
  },
  {
    slug: "plutus",
    title: "Plutus Trading Bot",
    description:
      "Quantitative trading bot with automated backtesting and live trading cycles. 144 tests, CI/CD pipeline.",
    longDescription:
      "A production quantitative trading system running on Alpaca Markets. Features include automated daily backtesting against historical data, live trading with risk management, SEC sentiment analysis on 10-K filings, and a comprehensive test suite with 144 passing tests. Built with a modular architecture separating live and backtest cycles while sharing core signal generation logic.",
    tech: ["Python", "pandas", "Alpaca API", "SQLite", "CI/CD"],
    links: {},
    featured: true,
    category: "systems",
  },
  {
    slug: "rpg-engine",
    title: "RPG Game Engine",
    description:
      "2D role-playing game built in C++ with SDL2. Custom engine — no game framework, no physics library.",
    longDescription:
      "A 2D RPG built entirely from scratch in C++ using SDL2 for rendering. Features an elaborate inventory system, weapon mechanics, NPC interaction, and a tile-based world. No game engine or physics framework used — all systems (collision, rendering, entity management) are hand-rolled. A deep dive into systems programming and game architecture.",
    tech: ["C++", "SDL2", "CMake", "Game Design"],
    links: {
      github: "https://github.com/RitwickVerma/RPG",
    },
    featured: true,
    category: "systems",
  },
  {
    slug: "homelab",
    title: "Homelab Infrastructure",
    description:
      "14-service Proxmox cluster with NixOS gateway, Traefik, Authelia OIDC, and Headscale VPN.",
    longDescription:
      "A complete self-hosted infrastructure running on Proxmox VE with 14 LXC containers and VMs. The gateway runs NixOS with Traefik v3 reverse proxy, Authelia SSO with OIDC, Headscale VPN (Tailscale-compatible), and CrowdSec intrusion prevention. Services include Home Assistant, Immich, Paperless-ngx, Jellyfin, Vaultwarden, and more — all behind a single wildcard SSL certificate with automatic renewal.",
    tech: ["NixOS", "Proxmox", "Traefik", "Docker", "Authelia", "Headscale"],
    links: {},
    featured: true,
    category: "infra",
  },
  {
    slug: "monster-sudoku",
    title: "Monster Sudoku Solver",
    description:
      "AI constraint satisfaction problem solver with custom heuristics for variable and value selection.",
    longDescription:
      "A Monster Sudoku solver implemented as a Constraint Satisfaction Problem (CSP) for an Intro to AI course at UC Irvine. Implements arc consistency checks, minimum remaining values (MRV) heuristic for variable selection, and least constraining value (LCV) heuristic for value ordering. Benchmarked against baseline backtracking with significant performance improvements.",
    tech: ["Python", "Algorithms", "CSP", "AI"],
    links: {},
    featured: false,
    category: "ai",
  },
  {
    slug: "solar-ev-daq",
    title: "Solar EV Data Acquisition",
    description:
      "Real-time sensor network for a solar electric vehicle. Arduino slaves, Raspberry Pi CPU, Firebase backend.",
    longDescription:
      "A B.Tech capstone project: designed and built a distributed data acquisition system for a solar electric vehicle. Arduino microcontrollers served as sensor slaves collecting telemetry data (speed, battery voltage, temperature, solar irradiance), while a Raspberry Pi acted as the central CPU. Real-time data displayed on the driver's dashboard screen and asynchronously uploaded to Firebase for remote monitoring.",
    tech: ["Arduino", "Raspberry Pi", "Python", "Firebase", "C++"],
    links: {},
    featured: false,
    category: "embedded",
  },
];

export const experiences: Experience[] = [
  {
    company: "eBay",
    role: "Software Engineer",
    period: "2021 — Present",
    description: [
      "Building and maintaining backend services at scale for one of the world's largest e-commerce platforms.",
    ],
    tech: [],
  },
  {
    company: "Shoelace Wireless",
    role: "Software Development Intern",
    period: "Jun — Dec 2020",
    description: [
      "Built a tool for statistical recording of radio technology metrics during network speed tests.",
      "Engineered a map-based crowd density visualization app using MapBox with MVVM architecture and Retrofit API client.",
    ],
    tech: ["Android", "MapBox", "Retrofit", "MVVM"],
  },
  {
    company: "Advanced Structures India",
    role: "Software Development Intern",
    period: "Jun — Jul 2018",
    description: [
      "Extracted client SQL data from Django models with complex relations and cataloged in Excel sheets for internal documentation.",
    ],
    tech: ["Python", "Django", "SQL"],
  },
  {
    company: "Bharat Heavy Electricals Ltd",
    role: "Software Development Intern",
    period: "Jun — Jul 2017",
    description: [
      "Created an advanced library management system using Java EE with JSP, servlets, and SQL. Achieved 2ms response times.",
    ],
    tech: ["Java EE", "JSP", "SQL", "Servlets"],
  },
];

export const services: Service[] = [
  {
    name: "Hermes Agent",
    description: "AI agent runtime — this session's home",
    ct: "CT101",
    ip: "69.69.69.101",
    port: 9119,
    tech: ["Python", "SQLite", "WebSocket"],
  },
  {
    name: "DNS / DHCP",
    description: "Technitium DNS server",
    ct: "CT102",
    ip: "192.168.86.102",
    domain: "dns.ritwickverma.dev",
    tech: ["Technitium", "DNS"],
  },
  {
    name: "Vaultwarden",
    description: "Self-hosted password manager",
    ct: "CT104",
    ip: "69.69.69.105",
    domain: "passwords.ritwickverma.dev",
    tech: ["Rust", "Docker"],
  },
  {
    name: "Immich",
    description: "Self-hosted photo & video backup",
    ct: "CT106",
    ip: "69.69.69.115",
    domain: "photos.ritwickverma.dev",
    tech: ["Node.js", "PostgreSQL", "ML"],
  },
  {
    name: "Paperless-ngx",
    description: "Document management system",
    ct: "CT107",
    ip: "69.69.69.117",
    domain: "docs.ritwickverma.dev",
    tech: ["Python", "Redis", "Docker"],
  },
  {
    name: "Gateway",
    description: "Traefik + Authelia + Headscale VPN",
    ct: "VM110",
    ip: "192.168.86.107",
    domain: "id.ritwickverma.dev",
    tech: ["NixOS", "Traefik", "Authelia", "Headscale"],
  },
  {
    name: "Jellyfin",
    description: "Media streaming server",
    ct: "CT111",
    ip: "69.69.69.116",
    domain: "watch.ritwickverma.dev",
    tech: ["Jellyfin", "Docker"],
  },
  {
    name: "Syncthing",
    description: "P2P file synchronization",
    ct: "CT113",
    ip: "69.69.69.118",
    tech: ["Go", "Syncthing"],
  },
];

export const skills = {
  languages: ["C++", "C", "Python", "Java", "TypeScript", "JavaScript", "Kotlin"],
  domains: [
    "Backend Systems",
    "Android Development",
    "Game Development",
    "AI / Machine Learning",
    "DevOps & Infrastructure",
    "Embedded Systems",
  ],
  tools: [
    "Docker",
    "Proxmox",
    "NixOS",
    "Traefik",
    "Git",
    "Linux",
    "SQLite",
    "PostgreSQL",
  ],
};

export const socialLinks = {
  github: "https://github.com/RitwickVerma",
  linkedin: "https://linkedin.com/in/ritwick-verma",
  email: "ritwickverma@gmail.com",
  resume:
    "https://raw.githubusercontent.com/RitwickVerma/Resume/master/resume_ATS-letter.pdf",
};
