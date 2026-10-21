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
    metric: { value: "26,000+", label: "lifetime downloads, 4.3★ when the Play listing was last up" },
    why: "Turns a binary proximity sensor and the accelerometer into gestures: a double-wave timing window, pick-up from a flat surface, face-down detection mid-call.",
    tech: ["Java", "Kotlin", "Android", "EventBus"],
    links: { gitlab: "https://gitlab.com/ritwick7/shutup" },
    onResume: true,
    featured: true,
    category: "android",
  },
  {
    slug: "plutus",
    title: "Plutus",
    description:
      "Systematic US-equity trader: trend-filtered cross-sectional momentum with volatility targeting, executed through Alpaca.",
    role: "Author, private repository, paper account",
    // 2007-01 → 2026-10 backtest from the repo's results/latest/report.md (2026-10-13); SPY 0.63 over the same path.
    metric: { value: "Sharpe 1.04", label: "2007–2026 backtest, one path (95% bootstrap interval 0.62–1.47). SPY 0.63; max drawdown 37%, against 55% for SPY" },
    why: "Universe is S&P 500 + 400 plus still-listed removals to soften survivorship bias; block-bootstrap confidence intervals; stop-losses and daily regime exits were tested and rejected, not assumed. CI deploys to a timer on green master.",
    tech: ["Python", "pandas", "Alpaca", "uv", "GitLab CI"],
    links: {},
    onResume: true,
    featured: true,
    category: "quant",
  },
  {
    slug: "tizen-ambilight",
    title: "TizenAmbilight",
    description:
      "Real-frame ambilight for Samsung Tizen TVs: a headless .NET service on the TV reads the decoded video plane from memory and drives a WLED strip over UDP.",
    role: "Author",
    metric: { value: "20–25 fps", label: "one process on the TV, no capture card, no HDMI splitter" },
    why: "Samsung's capture API returns the static UI layer, so the app dlopens the video-plane entry point instead: NV12 in PQ HDR, tone-mapped per scene and gamut-mapped from BT.2020 to the LEDs.",
    tech: ["C#", ".NET", "Tizen", "WLED", "HDR"],
    links: { gitlab: "https://gitlab.com/ritwick7/TizenAmbilight" },
    onResume: true,
    featured: true,
    category: "tv",
  },
  {
    slug: "kwin-canvas",
    title: "kwin-canvas",
    description:
      "An infinite window canvas for KDE Plasma, built only on KWin's public scripting API: no patched compositor, no private headers.",
    role: "Fork maintainer, 40 commits ahead, proposed upstream in stages",
    metric: { value: "374", label: "scenarios against a nested KWin, none failing; REUSE lint in CI" },
    why: "Every window stays an ordinary KWin window at an ordinary position, so fullscreen apps keep direct scanout; the canvas is a camera, not a second compositor. Written by an agent under my direction; the README says so.",
    tech: ["KWin", "QML", "JavaScript", "Plasma 6"],
    links: { gitlab: "https://gitlab.com/ritwick7/kwin-canvas" },
    onResume: true,
    featured: true,
    category: "desktop",
  },
  {
    slug: "homelab",
    title: "Homelab",
    description:
      "One Proxmox host, 17 guests, 15 declared in OpenTofu, behind a Debian gateway: Docker, Traefik, Authelia SSO and a Headscale VPN.",
    role: "Architect & sole operator",
    metric: { value: "15 of 17", label: "guests declared in OpenTofu (the dev and observability boxes are not yet). Nightly CI reports plan drift against the live host" },
    why: "Git is the source of truth: a scheduled pipeline pulls live configs and commits the diff, secrets are SOPS-encrypted in the repo, and a 5-minute health check pages once per new fault, after it persists, with a cooldown.",
    tech: ["Proxmox", "OpenTofu", "Docker", "Traefik", "Authelia", "SOPS"],
    links: {},
    onResume: true,
    featured: false,
    category: "infra",
  },
  {
    slug: "crush80-firmware",
    title: "Crush 80 firmware",
    description:
      "Open firmware for a Wobkey Crush 80 Pro keyboard whose vendor never released source: ZMK on the Telink TLSR9511, a RISC-V SoC. USB, Bluetooth, 154 per-key LEDs and OpenRGB, installed over the stock updater with one cable.",
    role: "Maintainer: per-key RGB, OpenRGB, the update and recovery tooling, the hardware findings. Fork of a community ZMK port, Apache-2.0",
    // LEDs confirmed working 2026-09-15 on the ported driver; OpenRGB Direct verified 2026-10-14 (gitlab.com/ritwick7/crush80-zmk).
    metric: { value: "154 LEDs", label: "lit from a ported WS2812 driver on the SoC's SPI DMA, GRB, one data line" },
    why: "My first identification was wrong: WB32 and a QMK port that could never run. The stock image's USB descriptor said TLSR9511, QMK has no port for it, and the findings document records the wrong turn next to the evidence. The matrix, LED line and power gate were traced from PCB photos and the stock binary's GPIO init.",
    tech: ["ZMK", "Zephyr", "RISC-V", "Ghidra", "C"],
    links: { gitlab: "https://gitlab.com/ritwick7/crush80-zmk", page: "/#keyboard", pageLabel: "Try the keyboard demo" },
    featured: false,
    onResume: true,
    category: "firmware",
  },
  {
    slug: "sudostamp",
    title: "SudoStamp",
    description:
      "Approve a sudo prompt on my workstation with a fingerprint on my phone. LAN only, key in the phone's hardware keystore.",
    role: "Author · Apache-2.0 · signed release APKs",
    metric: { value: "18 of 18", label: "checks pass in a replay of pam_rssh's real sequence, negative controls included" },
    why: "The phone speaks two ssh-agent messages; the ECDSA key never leaves the TEE and BiometricPrompt gates every signature. A replay of pam_rssh's real sequence, with negative controls, is the gate before touching /etc/pam.d/sudo.",
    tech: ["Kotlin", "Android Keystore", "ssh-agent", "PAM"],
    links: { gitlab: "https://gitlab.com/ritwick7/sudostamp" },
    onResume: false,
    featured: false,
    category: "security",
  },
  {
    slug: "kaeru",
    title: "Kaeru",
    description:
      "The iPhone Duo unfold animation, recreated on a Galaxy Z Fold from what the hardware actually reports.",
    role: "Author, private repository, in progress",
    metric: { value: "3 states", label: "is all the public hinge sensor gives; the real angle comes from the sensor HAL's own log line" },
    why: "A table of measured facts drives the design: which display is which by aspect ratio, not id; raw frames streamed from screencap; the overlay excluded from capture through a shell-reflected SurfaceControl call.",
    tech: ["Kotlin", "Android", "SurfaceFlinger", "MediaProjection"],
    links: {},
    featured: false,
    onResume: false,
    category: "foldable",
  },
  {
    slug: "rpg-engine",
    title: "RPG Engine",
    description:
      "2D RPG in C++ with no game engine: collisions, animation and dialogue trees written from scratch.",
    role: "Author",
    metric: { value: "44", label: "C++ source files, no game or physics engine" },
    why: "Maps are authored in Tiled and loaded through tmxlite; collision, sprite animation, weapons and dialogue are hand-rolled on SDL2.",
    tech: ["C++", "SDL2", "tmxlite", "Tiled"],
    links: { github: "https://github.com/RitwickVerma/RPG" },
    featured: false,
    onResume: false,
    category: "games",
  },
  {
    slug: "gesture-manager-x",
    title: "Gesture-Manager-X",
    description:
      "GTK GUI for libinput-gestures touchpad gestures, an extended fork of gestureManager.",
    role: "Maintainer of the fork, GPLv3",
    metric: { value: "7★", label: "on GitHub" },
    why: "Adds the gestures and settings libinput-gestures supports that the upstream GUI did not expose.",
    tech: ["Python", "GTK 3", "libinput"],
    links: { github: "https://github.com/RitwickVerma/Gesture-Manager-X" },
    featured: false,
    onResume: false,
    category: "linux",
  },
];

// Roles, dates and the Cassini/QSS/fitment wording follow the owner's public
// LinkedIn profile (read 2026-10-13). Newest first; the terminal's `whoami`
// reads experiences[0] as the current role.
export const experiences: Experience[] = [
  {
    company: "eBay",
    role: "Software Engineer 3",
    location: "San Francisco, CA",
    period: "Jun 2023 – Present",
    description: [
      "Own and maintain fitment, the Cassini subsystem that decides whether a sellable item is compatible with the product a buyer's query names.",
    ],
    tech: ["C++", "Cassini", "Search"],
  },
  {
    company: "eBay",
    role: "Software Engineer 2",
    location: "San Jose, CA",
    period: "Mar 2021 – Jun 2023",
    description: [
      "Query Search Stack (QSS) team in the Search Backend org: Cassini, eBay's distributed, highly available C++ search engine.",
    ],
    tech: ["C++", "Cassini", "Search"],
  },
  {
    company: "Shoelace Wireless",
    role: "Software Development Intern",
    period: "Jun – Sep 2020",
    description: [
      "Built a tool that records radio-technology metrics (5G, WCDMA) during network speed tests, stored in Room (SQLite) and uploaded to AWS.",
      "Built a map-based crowd-density app on MapBox with an MVVM architecture and a Retrofit API client.",
    ],
    tech: ["Android", "MapBox", "Retrofit", "MVVM"],
  },
  {
    company: "Advanced Structures India",
    role: "Software Development Intern",
    period: "Jun – Jul 2018",
    description: [
      "Extracted SQL data from Django models with complex relations for internal documentation.",
    ],
    tech: ["Python", "Django", "SQL"],
  },
  {
    company: "Bharat Heavy Electricals Ltd",
    role: "Software Development Intern",
    period: "Jun – Jul 2017",
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
    period: "2019 – 2020",
  },
  {
    school: "SRM Institute of Science and Technology",
    degree: "BTech, Computer Science and Engineering",
    period: "2015 – 2019",
  },
];

// All 17 Proxmox guests (15 LXC + 2 VM), ordered by ID. No addresses or ports:
// this ships to the browser.
export const services: Service[] = [
  { name: "Home Assistant", description: "Home automation", ct: "VM100", tech: ["Home Assistant OS"] },
  { name: "Hermes Agent", description: "Self-hosted AI agent that builds, operates and monitors this lab", ct: "CT101", tech: ["Python", "Claude"] },
  { name: "Technitium", description: "DNS and DHCP with blocklists", ct: "CT102", tech: ["Technitium", "DoH"] },
  { name: "Vaultwarden", description: "Password manager", ct: "CT104", tech: ["Rust", "Docker"] },
  { name: "Glance", description: "Start-page dashboard", ct: "CT105", tech: ["Glance"] },
  { name: "Immich", description: "Photo and video backup with ML search", ct: "CT106", tech: ["PostgreSQL", "Docker"] },
  { name: "Paperless-ngx", description: "Document management, woken on demand", ct: "CT107", tech: ["Python", "Redis"] },
  { name: "Backup Server", description: "Proxmox Backup Server", ct: "CT108", tech: ["PBS"] },
  { name: "Gateway", description: "Traefik, Authelia SSO, Headscale VPN, CrowdSec", ct: "VM110", tech: ["Debian", "Docker"] },
  { name: "Remux", description: "Media server", ct: "CT111", tech: ["Remux", "Docker"] },
  { name: "Syncthing", description: "Peer-to-peer file sync", ct: "CT113", tech: ["Go", "systemd"] },
  { name: "Portfolio (retired)", description: "Former host of this site, kept for rollback; the site now runs on Cloudflare Pages", ct: "CT114", tech: ["nginx"] },
  { name: "CI Runner", description: "GitLab CI runners", ct: "CT115", tech: ["GitLab CI"] },
  { name: "Plutus", description: "Paper-trading bot", ct: "CT116", tech: ["Python", "systemd"] },
  { name: "Kavita", description: "E-book library with OIDC login", ct: "CT117", tech: ["Kavita", "OIDC"] },
  { name: "Devbox", description: "Development box, file-synced from my workstation", ct: "CT118", tech: ["Debian"] },
  { name: "Observability", description: "Status checks, log hub and image-update notices", ct: "CT119", tech: ["Gatus", "Dozzle", "Diun"] },
];

export const skills = {
  languages: ["C++", "Python", "Java", "Kotlin", "C#", "TypeScript", "C"],
  domains: [
    "Search & retrieval",
    "Distributed systems",
    "Infrastructure & GitOps",
    "Reverse engineering",
    "Android",
    "Embedded",
  ],
  tools: [
    "Proxmox",
    "OpenTofu",
    "Docker",
    "Traefik",
    "GitLab CI",
    "Linux",
    "SOPS",
    "PostgreSQL",
    "SQLite",
  ],
};

export const socialLinks = {
  github: "https://github.com/RitwickVerma",
  gitlab: "https://gitlab.com/ritwick7",
  // Public profile slug is ritwick-verma (search engines + the owner's own
  // resume); /in/ritwickverma is not this profile.
  linkedin: "https://www.linkedin.com/in/ritwick-verma/",
  support: "https://buycovfefefor.ritwickverma.dev/",
  sponsor: "https://github.com/sponsors/RitwickVerma",
  email: "verma1997@gmail.com",
  resume: "/resume/",
};

export const SITE_URL = "https://www.ritwickverma.dev";

export const hero = {
  name: "Ritwick Verma",
  /** One specific line, his voice, not a job-title list. */
  line: "Software engineer at eBay.",
  lineTwo: "I build and self-host the systems I ship.",
};
