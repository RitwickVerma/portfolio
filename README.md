# www.ritwickverma.dev

Personal portfolio — [www.ritwickverma.dev](https://www.ritwickverma.dev)

## Stack

- **Next.js 16** + React 19 + TypeScript
- **Three.js** / React Three Fiber — 3D homelab datacenter hero
- **Custom GLSL shader** — full-viewport animated network grid background
- **Framer Motion** — stagger reveals, 3D tilt cards
- **GSAP ScrollTrigger** — hero pinning + cinematic reveals
- **xterm.js** — interactive terminal with command system
- **Tailwind CSS v4** — dark theme, glassmorphism

## Features

- **3D datacenter** — isometric Proxmox rack visualization with mouse-reactive camera
- **Shader background** — live network grid that breathes, shifts color, and reacts to scroll
- **Interactive terminal** — `whoami`, `projects`, `homelab`, `neofetch`, `matrix` and more
- **3D tilt cards** — project cards rotate toward cursor with perspective glow
- **Custom cursor** — particle trail that follows mouse
- **Cinematic scroll** — hero pins while content scrolls over, sections sweep in

## Hosting

Served from a Proxmox LXC (CT114) on my homelab infrastructure:

```
Cloudflare → VM110 (Traefik) → CT114:3456 (Next.js)
```

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build
npm run lint     # ESLint
```

## Deploy

```bash
# Manual: build + push to CT114
npm run build
tar czf deploy.tar.gz --exclude='node_modules' --exclude='.git' --exclude='.next/cache' .next package.json package-lock.json next.config.ts public/
scp deploy.tar.gz root@192.168.86.114:/tmp/
ssh root@192.168.86.114 "cd /opt/portfolio && rm -rf .next public && tar xzf /tmp/deploy.tar.gz && npm ci --omit=dev && systemctl restart portfolio"

# Or via CI (auto-deploy on push to main)
```
