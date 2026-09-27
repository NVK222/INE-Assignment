# INE Product Price Tracker

A full-stack product price tracker built for the INE Software Engineer Intern assignment.

The application allows users to browse and search products, select a product option, track it, and view its price/stock history. A scheduled scraper periodically records the current price and stock and stores every scrape attempt, including failures.

## Tech Stack

* **Frontend:** React + TypeScript + Vite
* **Backend:** Node.js + Express + TypeScript
* **Scraping:** Playwright
* **Database:** Supabase PostgreSQL
* **Frontend hosting:** Vercel
* **Backend hosting:** Render
* **Scheduled scraping:** External cron service

Install dependencies:

```bash
pnpm install
```

Install Playwright Chromium:

```bash
pnpm exec playwright install chromium
```

## Environment Variables

Create a `.env` file for local development.

### Backend

```env
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
HEADLESS=1
TRACING=0
```

| Variable                    | Description                                                             |
| --------------------------- | ----------------------------------------------------------------------- |
| `PORT`                      | Port used by the Express server. Defaults to `3000`.                    |
| `SUPABASE_URL`              | URL of the Supabase project.                                            |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key used by the backend.                          |
| `HEADLESS`                  | Playwright mode. `1` runs headless; `0` runs a visible browser locally. |
| `TRACE`                     | Playwright mode. `1` saves trace zip to /trace                          |

**Never expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend or commit it to Git.**

### Frontend

The Vite frontend uses:

```env
VITE_API_URL=http://localhost:3000/api
```

For the deployed Vercel frontend:

```env
VITE_API_URL=https://ine-assignment-4o10.onrender.com/
```

`VITE_API_URL` is embedded into the frontend during the Vite build, so the Vercel deployment must be rebuilt after changing it.

## Local Development

Start the backend:

```bash
pnpm run start
```

The API will be available at:

```text
http://localhost:3000
```

The frontend can then be run using the project's Vite development setup.

## Application Flow

1. Browse or search for a product.
2. Open the product details.
3. Select the desired product option.
4. Track that product option.
5. The tracked product appears on `/dashboard`.
6. Scheduled scraping records its price and stock.
7. The dashboard displays the recorded history.
8. Failed scrape attempts remain visible in the scrape log.
9. The complete scrape history can be exported as CSV.

## Scraping

The application uses Playwright because the provided INE mock storefront contains browser-dependent interactions that cannot reliably be handled using simple HTTP requests.

The scraper handles:

* Product option selection
* Cookie/overlay interactions
* Browser pointer interaction required to reveal the price
* Slow responses
* Retryable failures
* Price-format normalisation
* Explicit success and failure recording

Each scrape attempt is recorded with an outcome:

```text
success
retried
failed
```

Failed attempts are retained and do not reuse an old price or stock value.

## Scraping Schedule

Scraping is triggered through the backend endpoint:

```text
GET /api/scrape
```

An external cron service calls this endpoint **every 2 hours**.

The external scheduler is used because the backend is hosted on a free-tier Render instance, which may sleep after periods of inactivity. The scheduled HTTP request wakes the service when a scrape is due.

The scraper then:

1. Retrieves the currently tracked products.
2. Scrapes each tracked product/option.
3. Retries failed operations where appropriate.
4. Stores the result in Supabase.
5. Records failed attempts instead of silently discarding them.

### Local headed scraping

For an observable browser run during development or recording:

```powershell
$env:HEADLESS="0"
pnpm dev
```

For normal unattended execution:

```env
HEADLESS=1
```

## Database

The application uses Supabase PostgreSQL.

### `tracked`

Stores the product options currently being tracked.

```text
product_id
option
```

### `scraped_data`

Stores every scrape attempt.

```text
product_id
option
name
price
stock
scraped_at
outcome
```

`scraped_at` is stored as an ISO 8601 UTC timestamp.

## Dashboard

The dashboard is available at:

```text
/dashboard
```

It displays tracked products and allows each product to be opened to view:

* Price history
* Stock history
* All scrape attempts
* Scrape timestamps
* Scrape outcomes
* Failed attempts

Tracked products can also be removed from the dashboard.

## CSV Export

The complete scrape history can be exported from:

```text
GET /api/dashboard/export
```

The CSV contains one row per scrape attempt:

```text
product_id
option
name
price
stock
scraped_at
outcome
```

Failed attempts are included in the export.

## Deployment

### Backend — Render

### Frontend — Vercel

### External Cron - Cron-Job.org

## External Cron

Configure the external cron service to send:

```text
GET https://ine-assignment-4o10.onrender.com/api/scrape
```

every **2 hours**.

The endpoint is intended to be called automatically by the scheduler rather than manually from the frontend.