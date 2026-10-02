# Word Trap

A two-player word game for phones, played at your own pace. See [spec.md](spec.md) for the full rules and build plan.

Status: all five milestones from the spec are built. To put it online, follow [DEPLOY.md](DEPLOY.md) (free, about 5
minutes). To check it on a real phone, use [TESTING.md](TESTING.md). Judgement calls are recorded in
[DECISIONS.md](DECISIONS.md), the balance numbers are in [reports/balance.md](reports/balance.md), and the layout and
commands are in [CLAUDE.md](CLAUDE.md).

```sh
npm install
npm test            # unit tests
npx wrangler dev    # the whole game locally at http://localhost:8787
npm run e2e         # full matches on emulated phones
```
