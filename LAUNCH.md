# Popopen Launch Strategy

The package version is defined in `package.json`; verify the published npm version before making release claims. The README documents both global npm installation and `npx popopen`. This plan is tailored to individual developers using several coding agents and moving skills between computers.

## Where you are

- **Phase:** Launch planning. The repository contains the product implementation; npm publication and current release status are not verified by this file. No coordinated launch is recorded here.
- **Audience:** Individual developers using Claude Code, Codex, OpenCode, Hermes, or Pi, especially those managing skills across agents or computers.
- **Distribution angle:** `npx popopen` runs without a global install. Lean into the short setup in launch copy.

## Positioning (one line)

> **Popopen — browse, edit, and carry your coding-agent skills between computers. Run `npx popopen`.**

Variants:
- "Skills you can actually see." (visual-first angle)
- "Stop editing skill markdown in a text editor."
- "One local library for the skills your coding agents use."

## ORB channel picks

### Owned (build these now)
1. **GitHub repo as the hub** — README is your landing page. Add: animated GIF in first screenful, "Why" section, screenshot grid.
2. **Lightweight email capture** — even just a Tally form linked from README ("get notified on new releases"). Cheap, future-proof.

### Rented (pick 2, skip the rest)
1. **X/Twitter** — Claude/Anthropic devs live here. Short demo videos, before/after of skill editing.
2. **Reddit** — r/ClaudeAI, r/LocalLLaMA, r/commandline. One *useful* post per sub, not crossposted spam.

### Borrowed (high leverage for a dev tool)
1. **Anthropic DevRel + Claude Code team** — tag them once, with substance. They amplify community tools.
2. **Claude-Code-adjacent YouTubers/streamers** — anyone doing "Claude Code tips" content. Send a 60-sec Loom showing Popopen.
3. **Newsletters** — Pointer, Console.dev, TLDR Dev, Bytes. Submit to Console.dev specifically (devtool-native).

## Launch sequence (5 weeks)

### Week -2: Soft prep
- Record one 30–60s screen capture (open → browse skill → edit → save). Becomes the hero asset everywhere.
- Update README: hero GIF, 3-screenshot grid, "Install: `npx popopen`" above the fold.
- Stand up a simple landing (optional) or just point to GitHub.
- Open a `#popopen` Discord thread or GitHub Discussions to give early users a home.

### Week -1: Borrowed channel seeding
- DM 5–10 Claude Code content creators with the demo video and a one-liner. No ask. Just "thought you'd want this."
- Submit to Console.dev, BetaList, Awesome-Claude lists.
- Pre-write your Product Hunt assets (see below) but don't ship yet.

### Week 0: Product Hunt + coordinated push
- **Tuesday or Wednesday launch** (best PH days, avoid Mon/Fri).
- Same morning: X thread, Reddit post (r/ClaudeAI first, value-led not promo-led), LinkedIn if you use it.
- Be online 8am–10pm responding to every comment. This is non-negotiable on PH.

### Week +1: Convert attention
- Follow-up X post with launch metrics ("X installs in 48h, here's what you asked for").
- Ship one visible improvement based on feedback — signals momentum.
- Email anyone who starred/signed up with a thank-you + roadmap teaser.

## Product Hunt specifics

| Asset | Notes |
|---|---|
| Tagline | "Visual editor for Claude Code skills" (<60 chars) |
| Description | Lead with `npx popopen`. End with "open source, local-only, no telemetry." |
| Gallery | Hero GIF first, then 3–4 stills (skill list, editor, theme toggle, tour) |
| First comment | Founder note — *why* you built it (you were editing skills in VS Code and wanted something better) |
| Hunters | Don't chase a big hunter; self-hunt is fine in 2026 |

## What makes Popopen launchable (the angles)

- **"Your skills stay on your computer"** — Popopen scans local skill folders and stores analytics locally; update checks contact GitHub for eligible installed skills.
- **"`npx popopen` and you're in"** — no global install is needed for the demo.
- **"It looks like a real Mac app"** — the Apple HIG design system is a real differentiator vs. typical dev tools.

## What to skip

- Paid ads — audience is too small and concentrated.
- LinkedIn-heavy strategy — wrong crowd for this tool.
- A formal waitlist — friction with no upside since the product is already shippable via npm.

## Immediate next actions (this week)

1. Record the demo GIF/video.
2. Rewrite README hero section around `npx popopen` + GIF.
3. Pick a Product Hunt launch date and reverse-plan from there.
4. Draft the founder's "why I built this" post — it'll seed your launch comment, X thread, and Reddit post.
