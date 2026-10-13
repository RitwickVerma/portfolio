import type { Project, Experience, Education, Service } from "./types";

// Single source of truth for the home page, the /resume page and the terminal.
// Every claim here must be one the owner can back. Star counts and download
// figures are a dated snapshot (2026-10) — re-check before changing.

export const projects: Project[] = [
  {
    slug: "shutup",
    title: "ShutUp",
    description:
      "Android app that answers, silences and ends calls from proximity-sensor wave gestures.",
    role: "Author & maintainer · GPLv3",
    metric: { value: "26,000+", label: "downloads · 4.3★ on Google Play" },
    why: "Turns a binary proximity sensor and the accelerometer into gestures: a double-wave timing window, pick-up from a flat surface, face-down detection mid-call.",
    tech: ["Java", "Kotlin", "Android", "EventBus"],
    links: { github: "https://github.com/RitwickVerma/ShutUp" },
    featured: true,
    category: "android",
  },
  {
    slug: "plutus",
    title: "Plutus",
    description:
      "Autonomous long-short equity bot: scores the Russell 1000, sizes by conviction, paper-trades on Alpaca.",
    role: "Author",
    metric: { value: "200+", label: "tests · CI deploys only on green master" },
    why: "Point-in-time backtests run nightly in CI to keep the signal honest; hard stops and a drawdown guard cap the risk.",
    tech: ["Python", "Alpaca API", "SQLite", "APScheduler", "GitLab CI"],
    links: { gitlab: "https://gitlab.com/ritwick7/plutus-trading-bot" },
    featured: true,
    category: "systems",
  },
  {
    slug: "homelab",
    title: "Homelab",
    description:
      "One Proxmox host running 15 guests behind a Debian + Docker gateway with SSO and a VPN.",
    role: "Architect & sole operator",
    metric: { value: "15", label: "guests · 13 LXC containers + 2 VMs" },
    why: "Backups, DNS blocklists and updates run as scheduled jobs, and a 5-minute health check stays silent until something breaks.",
    tech: ["Proxmox", "Docker", "Traefik", "Authelia", "Headscale"],
    links: {},
    featured: true,
    category: "infra",
  },
  {
    slug: "rpg-engine",
    title: "RPG Engine",
    description:
      "2D RPG in C++ with no game engine: collisions, animation and dialogue trees written from scratch.",
    role: "Author",
    metric: { value: "SDL2", label: "the only dependency — no engine, no physics lib" },
    why: "Tiled XML maps drive the world; collision, sprite animation and branching dialogue are hand-rolled on top of SDL2.",
    tech: ["C++", "SDL2", "Tiled"],
    links: { github: "https://github.com/RitwickVerma/RPG" },
    featured: true,
    category: "systems",
  },
  {
    slug: "monster-sudoku",
    title: "Monster Sudoku Solver",
    description: "Constraint-satisfaction solver for large Sudoku grids.",
    role: "UC Irvine AI coursework",
    metric: { value: "MRV + LCV", label: "forward checking, Norvig propagation" },
    why: "Variable and value ordering plus constraint propagation turn brute-force backtracking into guided search.",
    tech: ["Python", "CSP", "Algorithms"],
    links: {},
    featured: false,
    category: "ai",
  },
  {
    slug: "solar-ev-daq",
    title: "Solar EV Data Acquisition",
    description:
      "Telemetry for a solar electric vehicle: Arduino sensor slaves feeding a Raspberry Pi.",
    role: "Designer & builder · B.Tech project",
    metric: { value: "Pi + Arduino", label: "master/slave sensors, synced to Firebase" },
    why: "A Raspberry Pi polls the Arduino slaves and uploads readings to Firebase asynchronously for remote monitoring.",
    tech: ["Arduino", "Raspberry Pi", "Python", "Firebase", "C++"],
    links: {},
    featured: false,
    category: "embedded",
  },
  {
    slug: "gesture-manager-x",
    title: "Gesture-Manager-X",
    description:
      "GTK GUI for libinput-gestures touchpad gestures — an extended fork of gestureManager.",
    role: "Maintainer of the fork · GPLv3",
    metric: { value: "7★", label: "on GitHub" },
    why: "Adds the gestures and settings libinput-gestures supports that the upstream GUI did not expose.",
    tech: ["Python", "GTK 3", "libinput"],
    links: { github: "https://github.com/RitwickVerma/Gesture-Manager-X" },
    featured: false,
    category: "linux",
  },
];

export const experiences: Experience[] = [
  {
    company: "eBay",
    role: "Software Engineer",
    location: "San Francisco, CA",
    period: "2021 — Present",
    description: [
      "Backend services at scale for one of the world's largest e-commerce platforms.",
    ],
    tech: [],
  },
  {
    company: "Shoelace Wireless",
    role: "Software Development Intern",
    period: "Jun — Dec 2020",
    description: [
      "Built a tool that records radio-technology metrics during network speed tests.",
      "Built a map-based crowd-density app on MapBox with an MVVM architecture and a Retrofit API client.",
    ],
    tech: ["Android", "MapBox", "Retrofit", "MVVM"],
  },
  {
    company: "Advanced Structures India",
    role: "Software Development Intern",
    period: "Jun — Jul 2018",
    description: [
      "Extracted SQL data from Django models with complex relations for internal documentation.",
    ],
    tech: ["Python", "Django", "SQL"],
  },
  {
    company: "Bharat Heavy Electricals Ltd",
    role: "Software Development Intern",
    period: "Jun — Jul 2017",
    description: [
      "Built a library management system in Java EE (JSP, servlets, SQL) with 2 ms response times.",
    ],
    tech: ["Java EE", "JSP", "Servlets", "SQL"],
  },
];

export const education: Education[] = [
  {
    school: "University of California, Irvine",
    degree: "MCS, Computer Science",
    period: "2019 — 2020",
  },
  {
    school: "SRM Institute of Science and Technology",
    degree: "BTech, Computer Science and Engineering",
    period: "2015 — 2019",
  },
];

// All 15 Proxmox guests (13 LXC + 2 VM), ordered by ID. No addresses or ports:
// this ships to the browser.
export const services: Service[] = [
  { name: "Home Assistant", description: "Home automation", ct: "VM100", tech: ["Home Assistant OS"] },
  { name: "Hermes Agent", description: "Self-hosted AI agent", ct: "CT101", tech: ["Python", "SQLite"] },
  { name: "Technitium", description: "DNS and DHCP with blocklists", ct: "CT102", tech: ["Technitium", "DoH"] },
  { name: "Vaultwarden", description: "Password manager", ct: "CT104", tech: ["Rust", "Docker"] },
  { name: "Glance", description: "Start-page dashboard", ct: "CT105", tech: ["Glance"] },
  { name: "Immich", description: "Photo and video backup with ML search", ct: "CT106", tech: ["PostgreSQL", "Docker"] },
  { name: "Paperless-ngx", description: "Document management, woken on demand", ct: "CT107", tech: ["Python", "Redis"] },
  { name: "Backup Server", description: "Proxmox Backup Server", ct: "CT108", tech: ["PBS"] },
  { name: "Gateway", description: "Traefik, Authelia SSO, Headscale VPN, CrowdSec", ct: "VM110", tech: ["Debian", "Docker"] },
  { name: "Remux", description: "Media server", ct: "CT111", tech: ["Remux", "Docker"] },
  { name: "Syncthing", description: "Peer-to-peer file sync", ct: "CT113", tech: ["Go", "systemd"] },
  { name: "Portfolio", description: "This site: static export behind nginx", ct: "CT114", tech: ["Next.js", "nginx"] },
  { name: "CI Runner", description: "GitLab CI runners", ct: "CT115", tech: ["GitLab CI"] },
  { name: "Plutus", description: "Trading bot, production deploy", ct: "CT116", tech: ["Python", "systemd"] },
  { name: "Kavita", description: "E-book library with OIDC login", ct: "CT117", tech: ["Kavita", "OIDC"] },
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
    "Debian",
    "Traefik",
    "Git",
    "Linux",
    "SQLite",
    "PostgreSQL",
  ],
};

export const socialLinks = {
  github: "https://github.com/RitwickVerma",
  gitlab: "https://gitlab.com/ritwick7",
  linkedin: "https://linkedin.com/in/ritwickverma",
  support: "https://buycovfefefor.ritwickverma.dev/",
  sponsor: "https://github.com/sponsors/RitwickVerma",
  email: "verma1997@gmail.com",
  resume: "/resume/",
};

export const SITE_URL = "https://www.ritwickverma.dev";

export const hero = {
  name: "Ritwick Verma",
  /** The one specific line — his voice, not a job-title list. */
  line: "Backend engineer at eBay.",
  lineTwo: "I build — and self-host — the systems I ship.",
  roles: "Software engineer · homelab operator · builder",
};
