# 🤖 PunBot — Automated Cybersecurity Humor for Mastodon

> *Because if we can't laugh at the state of infosec, we'd never stop crying.*

---

## What Is This?

**PunBot** is a fully automated social media bot that posts cybersecurity puns, tech humor, and roasts of American corporate security culture to Mastodon — 4 times a day, every day, with zero manual effort.

It lives entirely on free infrastructure: GitHub stores the puns, GitHub Actions runs the scheduler, and the Mastodon API does the posting. No servers. No subscriptions. No cost.

---

## Where Does It Post?

Follow the bot here:
**[@lawkid@defcon.social](https://defcon.social/@lawkid)**

This account is brand new to the [defcon.social](https://defcon.social) community — a Mastodon instance for the security-minded, the curious, and the professionally paranoid. If you're in infosec, ethical hacking, privacy advocacy, or just enjoy watching corporate cybersecurity get roasted — give it a follow. Collaboration, conversation, and community are all welcome.

---

## Who Is This For?

This bot was set up for a friend who is:

- A **professional technical writer** specializing in cybersecurity
- Available for **report writing, investigations, and exposure pieces** — the kind that get to the root of what needs to be said, written with precision and without flinching
- Committed to **ethical journalism and technical documentation** at the highest standard
- Open to collaborating with researchers, journalists, whistleblowers, and organizations who need something written properly

**To commission a report, investigation, or technical write-up, reach out via Mastodon:**
👉 [@lawkid@defcon.social](https://defcon.social/@lawkid)

---

## How Does It Work?

```
Claude generates puns → stored in GitHub (puns.json)
        ↓
GitHub Actions scheduler triggers 4x daily (8am, 12pm, 5pm, 9pm UTC)
        ↓
Python randomly selects a pun from the file
        ↓
Mastodon API posts it to @lawkid@defcon.social
```

**The stack:**
| Component | Tool | Cost |
|-----------|------|------|
| Pun storage | GitHub (puns.json) | Free |
| Scheduler | GitHub Actions | Free |
| Posting | Mastodon API | Free |
| Pun generation | Claude (Anthropic) | Free tier |

---

## Want Your Own Bot?

This exact setup can be replicated for **any Mastodon account** on any instance. The same approach works for:

- Daily quote bots
- News headline bots
- Affirmation bots
- Niche humor accounts
- Automated awareness campaigns

**You can set this up yourself** — everything used here is free and open. The rough steps are:

1. Create a GitHub repository
2. Add your content as a JSON file
3. Get a Mastodon API access token from your instance's app settings
4. Store the token as a GitHub Secret
5. Add a GitHub Actions workflow file with a cron schedule
6. Push and let it run

**Or if you'd rather have someone set it up for you**, the person who built this — **Iain Melchizedek** — is available to do exactly that. Whether you want a simple bot like this or something more complex, get in touch.

---

## Who Built This?

This repository was set up by **Iain Melchizedek** as a demonstration of practical automation skills using free, open-source tooling. It showcases:

- GitHub repository management and version control
- GitHub Actions CI/CD and cron scheduling
- REST API integration (Mastodon API)
- JSON data management
- Secure credential handling via GitHub Secrets
- Python scripting in automated environments

If you're looking for someone to set up automation, bots, workflows, or similar technical projects — **reach out.**

---

## Repository Structure

```
pun-bot/
├── puns.json                          # The pun library (130+ and growing)
└── .github/
    └── workflows/
        └── post-pun.yml               # GitHub Actions scheduler
```

---

*Built with free tools, bad puns, and a deep appreciation for how broken enterprise cybersecurity really is.*
