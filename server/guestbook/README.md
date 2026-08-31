# Guest book server

The backend for the Guest Book app (`src/WinXP/apps/GuestBook/`). It stores
entries, decides which ones may appear without you looking at them, and lets
you moderate from Discord or from inside the site.

Runs on Node 22+ with **no dependencies at all** unless you want the Claude
classifier. SQLite comes from `node:sqlite`, so there is nothing to compile.

```bash
cp .env.example .env
# fill in ADMIN_TOKEN and HMAC_SECRET, then:
node --env-file=.env src/index.js
```

---

## How a submission is judged

Layers run cheapest-first and stop at the first one that settles it, so a bot
spraying the endpoint costs microseconds of regex and never reaches anything
that costs money.

| # | Layer | What it does | Cost |
|---|-------|--------------|------|
| 1 | Shape | Field lengths, control characters | free |
| 2 | Ban | Is this signer already banned | free |
| 3 | Rate | Too many, too fast, from here or overall | free |
| 4 | Traps | Honeypot field, form returned impossibly fast | free |
| 5 | Proof of work | Challenge solved, signed, not replayed | free |
| 6 | Duplicate | Same text, or near enough, seen recently | free |
| 7 | Heuristics | Pattern lists + structural tells, scored | free |
| 8 | Classifier | Claude reads it | ~$0.002 |

Four possible outcomes:

- **reject** — never stored. The submitter gets a deliberately vague error.
- **block** — stored but invisible to everyone, and alerted on.
- **hold** — stored, waiting for you. Shows as `pending`.
- **publish** — live on the page immediately.

A held entry and a blocked one return the **identical** response, because
telling a spammer their payload was recognised is free tuning data for them.

### Scoring

Heuristic signals are additive (`src/filter/patterns.js` has the weights).
`HOLD_SCORE=3` sends it to your queue, `BLOCK_SCORE=8` means nobody ever sees
it. A link alone is worth 3 — so by default **any entry containing a link is
held for review**, which is the single highest-value rule here, because links
are the entire economic motive for guest book spam.

Entries always render as **plain text**. A URL is never turned into a link,
so even a published spam entry is worth nothing to whoever posted it.

### Illegal content

`ILLEGAL_PATTERNS` covers drug/weapon sales, stolen card data, forged
documents, and violence for hire. Each hit is worth 8-20 on its own, so it
blocks outright.

CSAM is handled differently, as a **combination** match: a minor indicator
*and* a sexual indicator must both appear. A minor indicator alone is innocent
("my kids love this site" — verified as a passing case in testing), and a
sexual term alone is merely adult. Only both together score.

When that category fires, **the message text is never written to disk**. The
row keeps the timestamp, the IP, the user agent and the hash; the content
becomes `[redacted]`. The Discord alert carries metadata only, with no text
and no approve button. There is no version of this where storing it is right.

---

## Proof of work — what it is and why

The endpoint hands out a challenge. The browser must find a number whose
SHA-256, appended to that challenge, starts with 18 zero bits. That takes
about **185ms** on a normal machine (measured), and the visitor never sees it
happen — it runs in a worker while they are still reading the page.

There is no puzzle, no images, no "select all the traffic lights", no third
party, and nothing tracked. It is purely a cost.

The point is asymmetry. One person signing your guest book pays 185ms once.
Somebody running a spam script across 50,000 sites now pays 2.5 CPU-hours to
do it, and that is per run. It does not make spam impossible — it makes
*bulk* spam uneconomic, which is what actually stops it.

Two properties keep it honest:

- Challenges are **HMAC-signed**, so the server stores nothing between issuing
  and verifying, and a forged one fails the signature.
- Solved nonces are **remembered until expiry**, so one solution cannot be
  replayed for a thousand submissions.

`POW_BITS` tunes it. Each +1 doubles the work: 18 ≈ 0.2s, 20 ≈ 0.8s, 22 ≈ 3s.
Raise it if you ever get flooded; 18 is a good resting place.

---

## Rate limits

Counted per **hashed** IP, over a sliding window, against every submission
that reached the server — including ones the honeypot or proof of work
rejected, so failures count too.

| Setting | Default | Meaning |
|---------|---------|---------|
| `PER_IP_PER_HOUR` | 3 | One address, one hour |
| `PER_IP_PER_DAY` | 8 | One address, one day |
| `GLOBAL_PER_HOUR` | 120 | Everybody combined — flood protection |

"Sliding" means literally the last 60 minutes, not a bucket that resets on the
hour: the 4th attempt within an hour is refused, and becomes allowed again
once the oldest of the three is more than an hour old. There is no unblock
step and nothing to clear — it recovers on its own.

The global limit is the one that protects your wallet: it caps the whole
site, so a distributed flood from thousands of addresses still cannot push
more than 120 submissions an hour into the expensive layer.

---

## Bans

A ban is on `ip_hash`, not on the address itself.

`ip_hash` is `HMAC-SHA256(ip, HMAC_SECRET)` truncated to 32 chars. It is
stable, so the same visitor always produces the same hash and bans keep
working — but it is **not reversible**, so banning someone never requires
keeping their address on file. The raw IP is stored separately and wiped
after `RETAIN_RAW_IP_DAYS` (30). Bans survive that wipe.

Banning via `/gb ban <id>` or the panel does two things: adds the hash to
`bans`, and **unpublishes every other entry from that signer**. Anything they
submit afterwards is refused at layer 2, before it costs anything.

`/gb unban <hash>` lifts it — the first few characters are enough.

Caveat worth knowing: this is an IP ban, so it is defeated by changing IP,
and a shared or mobile address can move between people. It is a speed bump
for a persistent nuisance, not an identity system. The filtering layers are
what actually do the work.

**`TRUST_PROXY` matters here.** Behind nginx or Caddy it must be `true` so
`X-Forwarded-For` is read. Directly exposed it must be `false` — otherwise
anyone can send that header and walk past every rate limit and ban above.

---

## The Claude classifier (optional, and off by default)

This is the only part that costs money, and it is off unless you set
`ANTHROPIC_API_KEY`. Everything above still runs without it.

**What it is for.** Word lists catch yesterday's spam. They cannot catch the
entry that is polite, correctly spelled, contains no listed keyword, and is
still an advert for something illegal. That is the whole reason it exists —
it reads meaning instead of matching shapes. If that risk does not worry you,
leave it off; the deterministic layers caught every illegal category in
testing.

**What it costs.** About 600 input + 300 output tokens per entry. On
`claude-haiku-4-5` (the default) that is roughly **$0.002 an entry** — a
hundred entries a month is about 20 cents.

**What bounds it.** Normal traffic was never the risk; a flood was.
`CLASSIFIER_MAX_PER_DAY=200` is a hard ceiling — past it, entries are held
for review rather than published, so the worst case is about $0.40/day
instead of an open-ended bill. It also only ever runs on submissions that
already survived layers 1-7.

**When it cannot answer** (no key, API down, timeout, cap reached) the entry
is **held, not published** (`CLASSIFIER_FAIL_OPEN=false`). An outage becomes
a queue rather than an open wall.

Note `CLASSIFIER_EFFORT` applies only to the Opus and Sonnet-5 tiers; Haiku
4.5 rejects the parameter, so it is omitted automatically for that model.

---

## Discord moderation

Buttons are message components, and only an *application* can send those — a
plain incoming webhook cannot. So you need a bot:

1. <https://discord.com/developers/applications> → New Application.
2. **Bot** tab → add a bot, copy the token → `DISCORD_BOT_TOKEN`.
3. Invite it to your server with the `bot` and `applications.commands` scopes.
4. Right-click your channel → Copy Channel ID → `DISCORD_CHANNEL_ID`.
   (Needs Developer Mode on in Discord's advanced settings.)
5. **General Information** → copy Application ID and Public Key →
   `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`.
6. Right-click yourself → Copy User ID → `DISCORD_MODERATOR_IDS`.
7. Set **Interactions Endpoint URL** to
   `https://guestbook.aduncan.dev/api/discord/interactions`. Discord verifies
   it when you save, so the server must be running.
8. `node --env-file=.env scripts/register-commands.js`

Every new entry posts an embed with the message, its score, which signals
fired, and what Claude said, plus **Approve / Reject / Delete / Ban** buttons.

Commands, for everything the buttons do not cover:

```
/gb list [status]     /gb show <id>      /gb stats
/gb approve <id>      /gb reject <id>    /gb delete <id>
/gb reply <id> <text> /gb ban <id>       /gb unban <hash>   /gb bans
```

`/gb reply` is how you answer someone — it appears under their entry on the
page. `/gb delete` handles already-published entries.

`DISCORD_MODERATOR_IDS` is the check that matters. A valid signature only
proves the click came from Discord, not that it was you. **Empty means
nothing can be actioned from Discord at all.**

Without a bot, `DISCORD_WEBHOOK_URL` still delivers the alerts — Discord just
drops the buttons, so you moderate from the in-app panel instead.

---

## The in-app panel

**File → Moderate...** in the Guest Book app, unlocked with `ADMIN_TOKEN`.
Held in `sessionStorage`, so it is gone when the tab closes.

Discord is the fast path for new arrivals. This is for the rest: reviewing
what is already published, working through a backlog, and checking what the
filter *blocked* to see whether it was right — false positives are invisible
otherwise, and "Publish anyway" is on every blocked entry.

---

## Deployment

nginx fronts everything on 443. The site itself is **Apache** on
`localhost:7080` serving `/var/www/web-xp/dist`; nginx proxies `/` to it.
The guest book rides the same host as a **subpath**, which avoids a DNS
record, a cert expansion, a name in the port-80 redirect block and the
catch-all 444 — and is same-origin, so CORS never applies.

**Apache needs no changes.** nginx routes by path before anything reaches
it:

```
internet -> nginx :443 --+-- location /     -> Apache :7080 (the site)
                         +-- location /gb/  -> Node   :8787 (guest book)
```

`/gb/` is a longer prefix match than `/`, so nginx answers those itself and
Apache never sees them. The one regex location in that block
(`~ /(manifest.json|asset-manifest.json)$`) only matches paths ending in
manifest.json — worth knowing because regex locations outrank prefix
matches in nginx, but this one cannot intercept `/gb/`.

Note **8080 is AMP** on that machine — the default here is 8787.

### nginx

Add this inside the existing `server { server_name aduncan.dev; ... }` block.
Position does not matter: nginx picks the longest matching prefix, so `/gb/`
wins over `/` wherever it sits.

```nginx
location /gb/ {
    proxy_pass http://localhost:8787/;   # trailing slash strips the /gb prefix
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

The trailing slash on `proxy_pass` is load-bearing: it rewrites
`/gb/api/entries` to `/api/entries`, which is what the server actually serves.
Without it the backend gets `/gb/api/entries` and 404s everything.

```bash
sudo nginx -t && sudo systemctl reload nginx
curl https://aduncan.dev/gb/api/health
```

If that curl 404s or gets blocked, check `snippets/block_sensitive.conf` — it
is included in that server block and may be filtering the path.

### The service

```bash
rsync -av --exclude node_modules --exclude data     server/guestbook/ you@server:/srv/guestbook/
```

```bash
node -e "const c=require('crypto');console.log('ADMIN_TOKEN='+c.randomBytes(32).toString('hex'));console.log('HMAC_SECRET='+c.randomBytes(32).toString('hex'))"
```

`/srv/guestbook/.env` needs those two plus:

```
PORT=8787
TRUST_PROXY=true
ALLOWED_ORIGINS=https://aduncan.dev
```

`TRUST_PROXY=true` matters: without it every visitor looks like nginx and
shares one rate-limit bucket.

`/etc/systemd/system/guestbook.service`:

```ini
[Unit]
Description=Guest book
After=network.target

[Service]
WorkingDirectory=/srv/guestbook
ExecStart=/usr/bin/node --env-file=.env src/index.js
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now guestbook
sudo systemctl status guestbook
```

Requires **Node 22+** (`node:sqlite`). Check with `node -v` first.

Nothing is port-forwarded: the process binds `127.0.0.1` and is only
reachable through nginx over loopback.

### Frontend

`VITE_GUESTBOOK_API=https://aduncan.dev/gb` is the built-in default, so a
plain `npm run build` and deploy to `/var/www/web-xp/dist` is enough.

Discord's interactions endpoint becomes
`https://aduncan.dev/gb/api/discord/interactions`.

Back up `/srv/guestbook/data/guestbook.db` — that is the whole guest book.

### Separate subdomain instead

If you would rather have `guestbook.aduncan.dev`: add the DNS record, add the
name to the port-80 redirect block's `server_name`, expand the cert
(`certbot --nginx -d guestbook.aduncan.dev` alongside the existing names),
and give it its own server block proxying to 8787. Everything works the same,
except CORS now applies, so `ALLOWED_ORIGINS` must list `https://aduncan.dev`.

## Retention

Runs every 6 hours, or `npm run purge` by hand.

| Setting | Default | Effect |
|---------|---------|--------|
| `RETAIN_RAW_IP_DAYS` | 30 | Clears the raw IP; the hash and the ban stay |
| `RETAIN_REJECTED_DAYS` | 30 | Deletes rejected/blocked rows |
| `RETAIN_ATTEMPTS_DAYS` | 7 | Deletes rate-limit records |

Since you log IPs, put a line in a privacy note somewhere saying you keep an
address and user agent for 30 days for abuse handling.
