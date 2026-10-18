# todoist-toggl-extension

A Todoist UI Extension that adds **Start** and **Stop** [Toggl 2.0](https://focus.toggl.com) timer actions to any task via the Todoist context menu. Works in the Todoist desktop app (Windows/Mac) and web app.

## Why this exists

Toggl's browser extension adds a timer button to the Todoist web interface, but it does not work in the desktop app. This extension uses Todoist's native UI Extensions platform to bring one-click timer tracking to the desktop app via the task context menu.

## How it works

1. Right-click any task (or click `⋯`) in Todoist
2. Select **Integrations** → **Start Toggl timer** or **Stop Toggl timer**
3. A modal appears. Review or edit the details, then confirm

The extension is a small HTTPS web service that Todoist calls when you invoke it. It verifies the request, calls the Toggl 2.0 API (`focus.toggl.com/api`), and returns a confirmation notification.

### How Todoist maps to Toggl 2.0

| Todoist | Toggl 2.0 |
|---------|-----------|
| Task | Task, matched by the Todoist task URL. Created on the first start, reused after that |
| Project | Project, matched by name. Created if it does not exist |
| Start Timer | A running time entry linked to the task |

Timers are started with Toggl's `tracking/start-from-description` endpoint, the same flow Toggl's own browser extension uses. Each Toggl task records the Todoist task URL (`extension_url`) and `extension_source: todoist`.

### Start Timer card

- **Description**: pre-filled with the Todoist task name and used as the Toggl task name; editable before starting
- **Project**: pre-filled with the task's Todoist project name (if [sync is enabled](#settings)); editable or clearable
- If a Toggl timer is already running for the same task name, the card shows a notice instead and offers an **Ok** button to dismiss without starting a duplicate

### Stop Timer card

Displays the name of the currently running timer and a **Stop Timer** button. If no timer is running, a message is shown instead.

## Requirements

- A [Todoist](https://todoist.com) account (any plan)
- A [Toggl 2.0](https://focus.toggl.com) account
- Node.js 22+
- An HTTPS endpoint (Cloudflare Tunnel, ngrok, or similar)

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/avinsonmassif/todoist-toggl-extension.git
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
TOGGL_API_TOKEN=              # Toggl 2.0 API token (starts with toggl_sk_)
TOGGL_ORGANIZATION_ID=        # Toggl 2.0 organisation ID (numeric)
TOGGL_WORKSPACE_ID=           # Toggl 2.0 workspace ID (numeric)
PORT=3000
LOG_LEVEL=info                # trace | debug | info | warn | error | fatal | silent
```

**Getting your Toggl API token:** see [Toggl MCP and CLI](https://docs.toggl.com/toggl-mcp-and-cli). Creating a new token invalidates the previous one, so reuse an existing token if another tool already uses it.

**Getting your organisation and workspace IDs:** open Toggl 2.0 in the browser. The URL has the form `focus.toggl.com/<organisation_id>/workspaces/<workspace_id>/…`

Toggl Track tokens and IDs do not work. Toggl 2.0 and Toggl Track are separate products with separate APIs.

### 4. Register the extension in Todoist

1. Go to the [Todoist App Management Console](https://developer.todoist.com/)
2. Create a new app and name it **Toggl Timer**
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

- **Cloudflare Tunnel**: stable, free, no open inbound ports required
- **ngrok**: quick for local development
- **Docker**: a `Dockerfile` and `docker-compose.yml` are included for self-hosted deployment. Images are published to `ghcr.io/avinsonmassif/todoist-toggl-extension` with `latest`, `sha-<short>` and version tags

## Tech stack

- TypeScript
- Express
- [@doist/ui-extensions-core](https://www.npmjs.com/package/@doist/ui-extensions-core)
- [pino](https://www.npmjs.com/package/pino): structured JSON logging
- Toggl 2.0 API (`focus.toggl.com/api`)

## Licence

GNU Affero General Public License v3.0. See [LICENSE](LICENSE) for details.
