# Reddit launch post

## r/macapps

**Title:** I made a free app that shows your Claude usage limits in the MacBook notch

**Body:**

I kept getting cut off mid-refactor by Claude's 5-hour limit with no warning, so I built Claude Meter.

It lives around the notch:

- **Collapsed:** your session % on the left, your weekly % on the right (or whichever model limit is tighter)
- **Hover:** it opens into three rings with reset countdowns and a forecast like "hits the cap in 1h 12m"
- **Click:** pins a full table with 6-hour sparklines for every limit your plan has (Opus included)
- Optional alerts at 50/80/95%, three looks (Solid, Frosted, Liquid Glass), and a pill + menu bar item on Macs without a notch

It reads the sign-in Claude Code already saved on your Mac, and it's read-only: no account, no analytics, no server. It only talks to Anthropic's API.

- Free, open source (MIT), signed and notarized
- macOS 14.4+, Apple Silicon and Intel
- Needs Claude Code signed in with Pro or Max

Download: https://claudemeter.vercel.app
Code: https://github.com/FreemanGT/claude-meter

Feedback is welcome, especially on the forecast and which alerts you'd actually want.

---

## r/ClaudeAI

**Title:** Built a notch app so I stop hitting the usage limit mid-task (free, open source)

**Body:**

If you're on Pro or Max and use Claude Code, Claude Meter puts your 5-hour session, weekly cap and per-model limits right in the MacBook notch. Hover to see reset times and a burn-rate forecast, and click to pin the full breakdown.

It reuses Claude Code's existing sign-in on your Mac, read-only, and nothing leaves your machine except calls to Anthropic's own usage endpoint.

Free, MIT licensed, notarized: https://claudemeter.vercel.app · https://github.com/FreemanGT/claude-meter

Not affiliated with Anthropic.

---

**Tips**
- Post the poster as an **image post**, then add the body as the first comment if the sub doesn't allow text with images.
- r/macapps asks you to state that it's your own app and whether it's free. The title and body above already cover both.
- Best time: weekday mornings US Eastern.
