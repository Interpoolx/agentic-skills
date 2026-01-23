# Agentic Skills Registry API Documentation

This documentation provides details on how to interact with the Agentic Skills Registry API. This API is used by the CLI and can be used by external VS Code plugins or other tools to search and fetch skills, PRDs, and prompts.

## Base URL

All requests should be made to the following base URL:

```
https://api.agenticskills.org/api
```

---

## Authentication

### Public API
Most retrieval endpoints (search, list, details) and the skill resolution endpoint are **public** and do not require authentication.

### Admin API
Endpoints under `/api/admin/*` are protected and require a Bearer token.
- **Header:** `Authorization: Bearer <RALPHY_ADMIN_TOKEN>`
- **Note:** External plugins should generally stick to the Public API unless they are performing administrative tasks.

---

## Rate Limiting

The API is hosted on Cloudflare Workers. While there is no explicit application-level rate limiting enforced at this time, we recommend:
- Caching results locally for at least 24 hours.
- Avoiding aggressive polling.
- Respecting standard HTTP 429 status codes if they are returned by the infrastructure.

---

## Skills API

### 1. Search Skills
Search for skills by name, description, tags, or author.

- **Endpoint:** `GET /search`
- **Query Parameters:**
  - `q`: Search query string.
  - `category`: Filter by category (e.g., `coding`, `automation`).
  - `limit`: Number of results (default: 20, max: 10000).
  - `page`: Page number (default: 1).

**Example Request:**
```bash
curl "https://api.agenticskills.org/api/search?q=react&limit=5"
```

### 2. Get Skill Details
Fetch details for a specific skill using its ID or slug.

- **Endpoint:** `GET /skills/:owner/:repo/:skillSlug`
- **Parameters:**
  - `:owner`: GitHub owner/org name.
  - `:repo`: GitHub repository name.
  - `:skillSlug`: The unique slug for the skill.

**Example Request:**
```bash
curl "https://api.agenticskills.org/api/skills/Interpoolx/open-agentic-skills/git-auto-commit"
```

### 3. Resolve & Add Skill (Interactive)
This endpoint is used by the CLI's `add` command. If the skill exists in the database, it returns it. If not, the API will attempt to fetch it directly from GitHub, scan for `SKILL.md`, and index it in the database.

- **Endpoint:** `POST /skills/resolve`
- **Body:**
  ```json
  {
    "owner": "github-owner",
    "repo": "github-repo",
    "skillName": "optional-skill-name"
  }
  ```

**Example Request:**
```bash
curl -X POST "https://api.agenticskills.org/api/skills/resolve" \
     -H "Content-Type: application/json" \
     -d '{"owner": "Interpoolx", "repo": "open-agentic-skills"}'
```

---

## PRDs (Product Requirements Documents) API

### 1. List PRDs
Retrieve a list of published PRDs.

- **Endpoint:** `GET /prds`
- **Query Parameters:**
  - `q`: Search query.
  - `category`: Filter by category slug.
  - `sort`: Sort by `views`, `likes`, `recent`, or `name`.
  - `limit`: Results per page (default: 20).

**Example Request:**
```bash
curl "https://api.agenticskills.org/api/prds?category=web-app&sort=views"
```

### 2. Get PRD Details
- **Endpoint:** `GET /prd/:slug`

---

## Prompts API

### 1. List Prompts
Retrieve a list of published AI prompts.

- **Endpoint:** `GET /prompts`
- **Query Parameters:**
  - `q`: Search query.
  - `category`: Filter by category.
  - `type`: Filter by prompt type (e.g., `instruction`, `workflow`).
  - `sort`: Sort by `copies`, `views`, `likes`, `recent`.

**Example Request:**
```bash
curl "https://api.agenticskills.org/api/prompts?q=typescript&type=instruction"
```

### 2. Get Prompt Details
- **Endpoint:** `GET /prompts/:slug`

### 3. Track Usage
External tools can report when a prompt is copied or used to help maintain accurate statistics.

- **Post Copy:** `POST /prompts/:slug/copy`
- **Post View:** `POST /prompts/:slug/view`

---

## Connection & Integration Tips

### VS Code Plugin Implementation
If you are building a VS Code extension, you can use the built-in `fetch` or a library like `axios` to interact with these endpoints.

```javascript
// Example: Searching for skills
async function searchSkills(query) {
    const response = await fetch(`https://api.agenticskills.org/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    return data.skills; // Returns an array of skill objects
}
```

### Response Formats
All responses are in JSON format. Common fields for items (Skills/PRDs/Prompts) include:
- `id`: Unique identifier.
- `name` / `title`: Display name.
- `slug`: URL-friendly identifier.
- `description`: Short summary.
- `githubUrl`: Link to source repository (if applicable).
- `install_count` / `view_count`: Popularity metrics.
