# Putting Word Trap online (one time, about 5 minutes, free)

Word Trap runs on Cloudflare's free plan: one Worker serves the app and the API, and each match is a
Durable Object (SQLite storage). No credit card is needed, and nothing here costs money.

## Steps

1. Go to <https://dash.cloudflare.com/sign-up> and create a free account (email and password).
2. In the dashboard, open **Workers & Pages** and select **Create application**.
3. Next to **Import a repository**, select **Get started**. When asked, connect your GitHub account and allow
   access to the `wordtrap` repository.
4. Pick the `wordtrap` repository. On the settings screen:
   - **Project name:** `wordtrap`
   - **Build command:** `npm run build`  ← the only thing you need to type
   - Leave the deploy command as `npx wrangler deploy`, and leave everything else as it is.
   - **Branch:** `main` (once the pull request is merged). To try it before merging, pick
     `claude/milestone-1-setup-build-osffl5` instead.
5. Select **Save and Deploy**. After a minute or two you get a link like
   `https://wordtrap.<your-name>.workers.dev`. That's the game.

From then on, every push to that branch redeploys the game automatically.

## Free-plan limits (from Cloudflare's docs)

- Workers: 100,000 requests a day. The app's files (HTML, word lists) don't count.
- Durable Objects: 100,000 requests and 13,000 GB-seconds a day, which is roughly 29 hours a day of a match being
  "awake" while someone waits with the app open. The app checks for the other player every 5 seconds while you
  wait, slowing to every 30 seconds after 10 minutes, and stops when the app is in the background.
- If a limit is ever hit, requests fail until midnight UTC. Nothing is charged.

## Running it locally

```sh
npm install
npx wrangler dev   # builds the app and serves app + API at http://localhost:8787
```
