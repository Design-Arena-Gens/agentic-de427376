# Meta Inbox Agent

Full-stack Next.js dashboard that builds, tests, and deploys an automation agent for Facebook Page Messenger conversations and Instagram Business comments. The UI lets you store Meta credentials locally, design rule-based response templates, preview smart replies, and send responses directly via the Graph API.

## Features

- Pull recent Page conversations and Instagram media comments with one click.
- Configurable automation rules with keyword matching, multi-platform routing, and priority weighting.
- Smart reply generator that enriches templates with tone control and lightweight heuristics.
- One-click reply execution that posts back to Facebook or Instagram via secure API routes.
- Local persistence for credentials, rules, and agent behaviour using `localStorage`.

## Requirements

- Node.js 18+ (Next.js 16 runtime requirement).
- A Facebook Page connected to an Instagram Business account.
- A long-lived Page access token with the following permissions:
  - `pages_messaging`, `pages_manage_metadata`, `pages_read_engagement`
  - `instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages`

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file in the project root (optional) to override defaults:

   ```bash
   META_GRAPH_VERSION=v19.0
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

## Using the Dashboard

1. **Meta Credentials**
   - Paste your long-lived Page access token.
   - Provide the Facebook Page ID.
   - Provide the Instagram Business Account ID.
   - Credentials are kept in `localStorage` only; nothing is persisted on the server.

2. **Automation Rules**
   - Define labels, keyword lists, priorities (0–1), and platform targeting.
   - Write response templates using handlebars-style tokens:
     - `{{name}}`, `{{platform}}`, `{{threadType}}`

3. **Manual Test Bench**
   - Choose platform + thread type, paste any sample message, and preview the agent response in real time.

4. **Responding**
   - Fetch Facebook inbox threads or Instagram comments.
   - Run the agent against any entry and inspect the suggested reply.
   - Dispatch the reply with one click; the app calls:
     - `POST /{conversation-id}/messages` for Messenger
     - `POST /{comment-id}/replies` for comments

## API Routes

| Route | Method | Description |
| ----- | ------ | ----------- |
| `/api/meta/messages` | `POST` | Fetches recent Page conversations (`pageId`, `accessToken`, optional `limit`) |
| `/api/meta/instagram/comments` | `POST` | Fetches latest Instagram comments (`instagramBusinessId`, `accessToken`, optional `limit`) |
| `/api/meta/reply` | `POST` | Sends a reply to a conversation or comment (`platform`, `targetId`, `message`, `accessToken`) |
| `/api/agent/reply` | `POST` | Generates an automated reply from the configured rules |

All routes expect JSON and return JSON. Errors bubble up with HTTP 4xx/5xx for easy troubleshooting.

## Testing & Linting

```bash
npm run lint
npm run build
```

Running the build ensures server components and route handlers compile without type errors.

## Deployment

The project is ready for Vercel. After confirming `npm run build` succeeds locally, deploy with:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-de427376
```

Once DNS propagates, verify with:

```bash
curl https://agentic-de427376.vercel.app
```

## Security Notes

- The dashboard stores Meta credentials on the client only; do **not** redeploy with server-side persistence unless you add proper encryption and a database.
- Ensure the access token has the minimum scope necessary and rotate it periodically.
