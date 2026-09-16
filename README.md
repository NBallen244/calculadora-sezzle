# Calculator

A full-stack calculator application. A Next.js frontend collects an arithmetic expression and sends it to a Go backend, which parses and evaluates it with a proper operator-precedence engine (not `eval`) and returns the result. The whole stack runs through Docker Compose.

## Architecture

```
┌──────────────────────────┐        POST /calculate        ┌──────────────────────────┐
│  Frontend (Next.js)       │  ──────────────────────────▶  │  Backend (Go + Huma)      │
│  http://localhost:3000    │   { "operation": "5+3*2" }    │  http://localhost:8888    │
│                           │  ◀──────────────────────────  │                           │
│  React 19 + Tailwind v4   │   { "result": "11.000000" }   │  RPN / Shunting-Yard       │
└──────────────────────────┘                               └──────────────────────────┘
```

- **Frontend** — Next.js 16 (App Router), React 19, Tailwind CSS v4. Renders the calculator UI and calls the backend. Served on port `3000`.
- **Backend** — Go 1.27 with the [Huma](https://huma.rocks/) framework. Exposes a single `POST /calculate` endpoint that tokenizes, converts to Reverse Polish Notation via the Shunting-Yard algorithm, and evaluates. Served on port `8888`.
- **Orchestration** — `docker-compose.yaml` builds and runs both services; the frontend `depends_on` the backend.

## Project structure

```
calculadora sezzle/
├── docker-compose.yaml              # Orchestrates backend + frontend
├── api/
│   └── app/
│       ├── Dockerfile               # Multi-stage Go build → minimal alpine image
│       ├── main.go                  # Huma API setup, CORS, POST /calculate
│       ├── go.mod / go.sum
│       └── parser/
│           ├── rpn_parser.go        # Tokenizer + Shunting-Yard + RPN evaluator
│           ├── parser_success_test.go
│           └── parser_fails_test.go
└── front/
    └── calculator_app/
        ├── Dockerfile               # node:20-alpine, runs `next dev`
        ├── package.json
        └── app/
            ├── page.tsx             # Home page, centers the calculator
            ├── layout.tsx
            ├── globals.css
            ├── components/
            │   ├── calculator.tsx       # Calculator component (state + handlers)
            │   └── calculator.test.tsx  # Jest + React Testing Library suite
            └── services/
                └── api_service.tsx  # calculateExpression() — fetch wrapper to the backend
```

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

For local development outside containers (optional): Node.js 20+ and Go 1.27+.

## Setup — running with Docker Compose

From the project root:

```bash
docker compose up --build
```

This builds both images and starts the services. Once running:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8888
- Interactive API docs (Huma): http://localhost:8888/docs

To stop and remove the containers:

```bash
docker compose down
```

> Note: the frontend container runs `next dev` (development mode) and the backend Dockerfile uses a multi-stage build that produces a small static binary on `alpine`. CORS on the backend is configured to allow `http://localhost:3000`, so keep the frontend on port 3000 when running locally.

## Using the frontend

Open http://localhost:3000 and use the on-screen calculator:

- **Digits, `.`, `(` `)`** — build the expression.
- **`+ - × ÷`** — operators. Two operators in a row are prevented; pressing a second operator replaces the previous one.
- **`AC`** — clears the display, result, and any error.
- **`DEL`** — deletes the last character.
- **`=`** — sends the expression to the backend and shows the result. `×`/`÷` are converted to `*`/`/` before sending. While the request is in flight the buttons are disabled and a `Loading...` indicator is shown. Errors are shown in red.

## Using the backend directly

The API exposes one endpoint:

**`POST /calculate`**

Request body:

```json
{ "operation": "5+3*2" }
```

Success response:

```json
{ "result": "11.000000" }
```

Example with `curl`:

```bash
curl -X POST http://localhost:8888/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation":"(2+3)*4"}'
```

The evaluator supports `+ - * /`, parentheses, decimals, and negative numbers. It returns errors for invalid input, for example:

- `Syntax Error` — malformed expressions (two operators in a row, mismatched parentheses, invalid characters, multiple decimal points).
- `Math Error` — division by zero.

## Running tests

**Backend (Go):**

```bash
cd api/app
go test ./...
```

**Frontend (Jest + React Testing Library):**

```bash
cd front/calculator_app
npm test
```

The frontend suite covers the calculator component's handlers and render branches with the API service mocked.

### Coverage reports

Both suites collect coverage automatically when run with the commands above. Current results:

**Backend** — `go test ./... -cover`

| Package                       | Statement coverage |
|-------------------------------|--------------------|
| `calculator_backend/parser`   | 96.1%              |
| `calculator_backend` (`main`) | 0.0% (no tests — HTTP wiring only) |

The `parser` package holds all evaluation logic and is the meaningful target; `main.go` is thin HTTP/CORS setup and is intentionally left untested. To generate an HTML report:

```bash
cd api/app
go test ./parser -coverprofile=coverage.out
go tool cover -html=coverage.out
```

**Frontend** — `npm test` (Jest, coverage enabled in `jest.config.ts`)

| File             | % Stmts | % Branch | % Funcs | % Lines |
|------------------|---------|----------|---------|---------|
| `calculator.tsx` | 100     | 100      | 70.58   | 100     |

18 tests, all passing. Statement, branch, and line coverage are at 100%; the uncovered functions are the intentionally out-of-scope no-op empty button handler and the non-`Error` catch branch. Coverage is scoped to `calculator.tsx` via `collectCoverageFrom` and written to `front/calculator_app/coverage/` (an `lcov-report/index.html` is generated there for browsing).

## Design decisions

**Separation of parsing from the API layer.** The backend keeps all evaluation logic in a dedicated `parser` package (`rpn_parser.go`), independent of the HTTP layer in `main.go`. This makes the core algorithm unit-testable in isolation (`parser_success_test.go`, `parser_fails_test.go`) without spinning up a server.

**Real expression evaluation instead of `eval`.** Rather than delegating to a language `eval`, the backend tokenizes the input, converts it to Reverse Polish Notation using the Shunting-Yard algorithm (respecting operator precedence and parentheses), then evaluates the RPN. This avoids code-injection risk and gives precise, explicit error handling (`Syntax Error`, `Math Error`).

**Typed, self-documenting API via Huma.** Using Huma gives typed request/response structs and auto-generated OpenAPI docs at `/docs`, so the contract between frontend and backend is explicit and browsable.

**Thin, mockable frontend service layer.** All network access lives in `app/services/api_service.tsx` (`calculateExpression`). The `Calculator` component depends only on that function, which keeps the component logic pure and lets the test suite mock the service to run without a network.

**Symbol translation at the boundary.** The UI shows `×` and `÷` for readability, but the service translates them to `*` and `/` right before the request, so the display stays user-friendly while the backend receives standard operators.

**Multi-stage backend image.** The Go Dockerfile compiles in a `golang` build stage and copies only the resulting static binary into a minimal `alpine` runtime image, keeping the final image small.

### Visual design

- **Dark, focused layout.** A slate background (`bg-slate-700`) centers a single dark calculator card (`bg-slate-900`) with rounded corners and a shadow, keeping attention on the one interactive element.
- **Two-line display.** A small muted top line shows the raw expression (`display || '0'`) while a large bottom line shows the current value or result, so input and output are visually distinct.
- **Color-coded controls.** Operators use indigo, the `=` action uses emerald and spans two rows to stand out as the primary action, and `AC` uses a red tint to signal a destructive reset. Errors render in red (`text-red-400`) and the loading state pulses in indigo.
- **Grid layout.** Buttons are arranged in a 4-column CSS grid; `AC` and `0` span two columns and `=` spans two rows to mirror a familiar physical calculator.
