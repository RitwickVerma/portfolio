import type { Project, Experience, Education, Service } from "./types";
import { resume } from "./resume";

// Single source of truth for the home page, the /resume page and the terminal.
// Every claim here must be one the owner can back. Star counts and download
// figures are a dated snapshot (2026-10) — re-check before changing.

export const projects: Project[] = [
  {
    slug: "shutup",
    title: "ShutUp",
    description:
      "Android app that answers, silences and ends calls with a wave over the proximity sensor.",
    role: "Author (2016), rebuilt in 2026 with AI assistance · GPLv3",
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
      "Research harness for systematic US-equity strategies. The verdict after 30+ experiments: no edge that held up. A trend-filtered cross-sectional momentum strategy with volatility targeting paper-trades through Alpaca as a live test.",
    role: "Author, private repository, paper account",
    // Lead with the method, not a backtest number: the research ledger (30+ experiments, Aug-Sep 2026) found no
    // demonstrated edge, and the surviving backtest's universe is only partly survivorship-corrected.
    metric: { value: "30+ experiments", label: "on point-in-time data with block-bootstrap intervals. Paper account, not real money" },
    why: "The universe is the S&P 500 and 400 plus removed names that still trade, which softens survivorship bias. Stop-losses and daily regime exits were tested and rejected. CI deploys to a timer on green master.",
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
    role: "My design and on-device verification, code written with Claude · MIT",
    metric: { value: "20 to 25 fps", label: "one process on the TV, no capture card, no HDMI splitter" },
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
    metric: { value: "374", label: "scenarios against a nested KWin, none failing. REUSE lint in CI" },
    why: "Every window stays an ordinary KWin window at an ordinary position, so fullscreen apps keep direct scanout. The canvas only moves a camera over them. Written by an agent under my direction, and the README says so.",
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
      "One Proxmox host with 16 guests behind a Debian gateway that runs Traefik, Authelia SSO and a Headscale VPN in Docker.",
    role: "Architect and sole operator",
    metric: { value: "14 of 16", label: "guests declared in OpenTofu. Nightly CI reports plan drift against the live host" },
    why: "Git is the source of truth. A scheduled pipeline pulls the live configs and commits whatever changed, with secrets SOPS-encrypted in the repo. A health check runs every five minutes and pages once per new fault, only after it persists.",
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
      "Open firmware for a Wobkey Crush 80 Pro keyboard whose vendor never released source: ZMK on the Telink TLSR9511, a RISC-V SoC. USB, Bluetooth, 154 addressable LEDs and OpenRGB, installed over the stock updater with one cable.",
    role: "Fork maintainer. Added per-key RGB, OpenRGB and the update and recovery tooling · Apache-2.0",
    // LEDs confirmed working 2026-09-15 on the ported driver; OpenRGB Direct verified 2026-10-14 (gitlab.com/ritwick7/crush80-zmk).
    metric: { value: "154 LEDs", label: "lit from a ported WS2812 driver on the SoC's SPI DMA, GRB, one data line" },
    why: "My first guess was wrong: a WB32 chip and a QMK port that could never run. The stock image's USB descriptor said TLSR9511, which QMK does not support. The findings document keeps the wrong turn next to the evidence. The matrix, LED line and power gate were traced from PCB photos and the stock binary's GPIO init.",
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
    role: "Author · MIT · signed release APKs",
    metric: { value: "18 of 18", label: "checks pass in a replay of pam_rssh's real sequence, negative controls included" },
    why: "The phone speaks two ssh-agent messages; the ECDSA key never leaves the TEE and BiometricPrompt gates every signature. The replay has to pass before anything touches /etc/pam.d/sudo.",
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
    why: "A table of measured facts drives the design. Displays are told apart by aspect ratio, not id. Raw frames stream from screencap, and a shell-reflected SurfaceControl call keeps the overlay out of the capture.",
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
      "2D RPG in C++ on SDL2, with no game engine.",
    role: "Author",
    metric: { value: "44", label: "C++ source files, all hand-written" },
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
    role: "Fork maintainer · GPLv3",
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
/** Last day at eBay. "Present" is true until then; a build on or after it shows the month. */
export const EBAY_SEPARATION = "2026-12-08";
/** The day the export was built (next.config.ts). Falls back to today for tests and dev. */
export const BUILD_DATE = process.env.NEXT_PUBLIC_BUILD_DATE ?? new Date().toISOString().slice(0, 10);
/** True once the role has ended as of the build. Every "Present" and the Person.worksFor entry key off this. */
export const EBAY_ENDED = BUILD_DATE >= EBAY_SEPARATION;

export const experiences: Experience[] = [
  {
    company: "eBay",
    role: "Software Engineer 3",
    location: "San Francisco, CA",
    period: `Jun 2023 – ${EBAY_ENDED ? "Dec 2026" : "Present"}`,
    // The home-page timeline shows the resume's three strongest bullets; /resume has all of them.
    description: [...resume.roles[0].bullets.slice(0, 3)],
    tech: ["C++", "Cassini", "Search"],
  },
  {
    company: "eBay",
    role: "Software Engineer 2",
    location: "San Jose, CA",
    period: "Mar 2021 – Jun 2023",
    description: [...resume.roles[1].bullets],
    tech: ["C++", "Cassini", "Search"],
  },
  {
    company: "Shoelace Wireless",
    role: "Software Development Intern",
    period: "Jun – Sep 2020",
    description: [
      "Built a tool that records radio-technology metrics (5G, WCDMA) during network speed tests, stored in Room (SQLite) and uploaded to AWS.",
      "Built a map-based crowd-density app on Mapbox with an MVVM architecture and a Retrofit API client.",
    ],
    tech: ["Android", "Mapbox", "Retrofit", "MVVM"],
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
    degree: "Master of Computer Science",
    period: "2019 – 2020",
  },
  {
    school: "SRM Institute of Science and Technology",
    degree: "BTech, Computer Science and Engineering",
    period: "2015 – 2019",
  },
];

// All 16 Proxmox guests (14 LXC + 2 VM), ordered by ID. No addresses or ports:
// this ships to the browser.
export const services: Service[] = [
  { name: "Home Assistant", description: "Home automation", ct: "VM100", tech: ["Home Assistant OS"] },
  { name: "Hermes Agent", description: "Open-source AI agent that builds and runs this lab", ct: "CT101", tech: ["Python", "Claude"] },
  { name: "Technitium", description: "DNS and DHCP with blocklists", ct: "CT102", tech: ["Technitium", "DoH"] },
  { name: "Vaultwarden", description: "Password manager", ct: "CT104", tech: ["Rust", "Docker"] },
  { name: "Glance", description: "Start-page dashboard", ct: "CT105", tech: ["Glance"] },
  { name: "Immich", description: "Photo and video backup with ML search", ct: "CT106", tech: ["PostgreSQL", "Docker"] },
  { name: "Paperless-ngx", description: "Document management, woken on demand", ct: "CT107", tech: ["Python", "Redis"] },
  { name: "Backup Server", description: "Proxmox Backup Server", ct: "CT108", tech: ["PBS"] },
  { name: "Gateway", description: "Traefik, Authelia SSO, Headscale VPN and CrowdSec", ct: "VM110", tech: ["Debian", "Docker"] },
  { name: "Remux", description: "Media server", ct: "CT111", tech: ["Remux", "Docker"] },
  { name: "Syncthing", description: "Peer-to-peer file sync", ct: "CT113", tech: ["Go", "systemd"] },
  { name: "CI Runner", description: "GitLab CI runners", ct: "CT115", tech: ["GitLab CI"] },
  { name: "Plutus", description: "Paper-trading bot", ct: "CT116", tech: ["Python", "systemd"] },
  { name: "Kavita", description: "E-book library with OIDC login", ct: "CT117", tech: ["Kavita", "OIDC"] },
  { name: "Devbox", description: "Development box, file-synced from my workstation", ct: "CT118", tech: ["Debian"] },
  { name: "Observability", description: "Status checks, log hub and image-update notices", ct: "CT119", tech: ["Gatus", "Dozzle", "Diun"] },
];

export const skills = {
  // Languages he writes himself. C# in the side projects is agent-written, so it
  // stays on the project cards only (copy.test.ts pins this list).
  languages: ["C++", "Python", "Java", "Kotlin", "TypeScript", "C"],
  domains: [
    "Search & retrieval",
    "Query rewriting",
    "Request caching",
    "Distributed systems",
    "Traffic replay & A/B testing",
    "Reverse engineering",
    "Android",
    "Embedded",
  ],
  tools: [
    "C++ PMR",
    "CMake",
    "GoogleTest",
    "ASan",
    "clang-tidy",
    "Linux",
    "Docker",
    "GitLab CI",
    "OpenTofu",
    "Proxmox",
    "Traefik",
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
  /** One specific line, his voice, not a job-title list. True in any tense. */
  line: "Backend engineer. 5.5 years on eBay's C++ search engine.",
  lineTwo: "I build and self-host the systems I ship.",
};
