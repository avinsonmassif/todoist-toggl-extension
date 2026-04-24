# todoist-toggl-extension

A Todoist UI Extension that adds **Start** and **Stop** Toggl Track timer actions to any task via the Todoist context menu. Works in the Todoist desktop app (Windows/Mac) and web app.

## Why this exists

The official Toggl Track browser extension adds a timer button to the Todoist web interface, but it does not work in the desktop app. This extension uses Todoist's native UI Extensions platform to bring one-click timer tracking to the desktop app via the task context menu.

## How it works

1. Right-click any task (or click `⋯`) in Todoist
2. Select **Integrations** → **Start Toggl timer** or **Stop Toggl timer**
3. A modal appears — review or edit the details, then confirm

The extension is a small HTTPS web service that Todoist calls when you invoke it. It verifies the request, calls the Toggl Track API v9, and returns a confirmation notification.

### Start Timer card

- **Description** — pre-filled with the Todoist task name; editable before starting
- **Project** — pre-filled with the task's Todoist project name (if [sync is enabled](#settings)); editable or clearable
- If a Toggl timer is already running with the same description, the card shows a notice instead and offers an **Ok** button to dismiss without starting a duplicate

### Stop Timer card

Displays the description of the currently running timer and a **Stop Timer** button. If no timer is running, a message is shown instead.

## Requirements

- A [Todoist](https://todoist.com) account (any plan)
- A [Toggl Track](https://toggl.com/track/) account
- Node.js 18+
- An HTTPS endpoint (Cloudflare Tunnel, ngrok, or similar)

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/adrianhalid/todoist-toggl-extension.git
cd todoist-toggl-extension
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

```env
TODOIST_VERIFICATION_TOKEN=   # From Todoist App Management Console
TOGGL_API_TOKEN=              # From Toggl Track profile settings
TOGGL_WORKSPACE_ID=           # Your Toggl workspace ID (numeric)
PORT=3000
LOG_LEVEL=info                # trace | debug | info | warn | error | fatal | silent
```

**Getting your Toggl API token:** Toggl Track → Profile → API Token (bottom of the page)

**Getting your Toggl workspace ID:** Toggl Track → Manage → Workspaces → click your workspace — the ID is in the URL

### 4. Register the extension in Todoist

1. Go to the [Todoist App Management Console](https://developer.todoist.com/)
2. Create a new app — name it **Toggl Timer**
3. Under **UI Extensions**, add two extensions:
   - Name: `Start Toggl timer` | Type: Context menu | Context: Task
   - Name: `Stop Toggl timer` | Type: Context menu | Context: Task
4. Set the **Data exchange endpoint URL** for each to your HTTPS endpoint
5. Copy the **Verification token** into your `.env`
6. Click **Install for me**

### 5. Run the service

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Settings

Runtime settings are stored in `settings.json` (excluded from git) and can be changed via the **Settings** UI Extension in Todoist.

| Setting | Default | Description |
|---------|---------|-------------|
| `useTodoistProject` | `true` | Pre-fill the **Project** field in the Start Timer card with the task's Todoist project name |

## Deployment

The service needs a public HTTPS URL. Recommended options:

- **Cloudflare Tunnel** — stable, free, no open inbound ports required
- **ngrok** — quick for local development
- **Docker** — a `Dockerfile` and `compose.yml` are included for self-hosted deployment

## Tech stack

- TypeScript
- Express
- [@doist/ui-extensions-core](https://www.npmjs.com/package/@doist/ui-extensions-core)
- [pino](https://www.npmjs.com/package/pino) — structured JSON logging
- Toggl Track API v9

## Licence

GNU Affero General Public License v3.0 — see [LICENSE](LICENSE) for details.
