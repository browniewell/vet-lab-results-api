# Vet Lab Results API

> All patients, pets and lab values in this project are made up. No real patient data.

## What it does

TODO: one or two sentences. (A small REST API that receives lab results, validates them, matches them to a patient, flags out-of-range values, and returns a patient's result history.)

## Why

TODO: tie it to the idea of practice software and diagnostics working together: a vet sees a lab result in context and can act on it.

## Tech stack

TODO: Node + TypeScript, Express, zod (validation), Vitest + Supertest (tests), GitHub Actions (CI). Later: SQLite + Prisma, PHP/Laravel port.

## How to run

Requires Node.js 22 or newer.

```bash
npm install                  # also generates the Prisma client
cp .env.example .env         # local database settings (.env is gitignored)
npm run db:migrate           # creates prisma/dev.db and applies all migrations
npm run dev                  # starts the API on http://localhost:3000
```

Tests use their own database (`prisma/test.db`), rebuilt from the migrations on every run, so they never touch your dev data:

```bash
npm test                     # run all tests
npm run coverage             # tests plus a coverage report (coverage/index.html)
```

After changing `prisma/schema.prisma`, create a migration with `npm run db:migrate -- --name describe_the_change`.

To wipe the dev database and rebuild it from the migrations (for example, before a fresh demo), run `npm run db:reset`.

## Try it

[`demo.http`](demo.http) walks through the whole API in 17 requests: two patients (a dog and a cat), lab results that come back `NORMAL`, `HIGH`, `LOW` and `UNKNOWN`, each patient's history, the abnormal-only filter, and the `400` and `404` error cases.

1. Install the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension for VS Code.
2. Start the API with `npm run dev`.
3. Open `demo.http` and click **Send Request** above each request, top to bottom. Later requests reuse the patient IDs created at the start.

To show that data persists, stop and restart the server partway through, then run the history request again. Run `npm run db:reset` to start over with an empty database.

## Data models

### Patient

| Field   | Type   | Required?       | Notes |
| ------- | ------ | --------------- | ----- |
| id      | string | (set by server) | UUID  |
| name    | string | Yes             |       |
| species | string | Yes             |       |

### LabResult

| Field         | Type   | Required?       | Notes                                     |
| ------------- | ------ | --------------- | ----------------------------------------- |
| id            | string | _set by server_ | UUID                                      |
| patientId     | string | Yes             | UUID                                      |
| testCode      | string | Yes             | Alphanumeric                              |
| value         | number | Yes             |                                           |
| unit          | string | Yes             |                                           |
| referenceLow  | number | No              |                                           |
| referenceHigh | number | No              |                                           |
| collectedAt   | string | Yes             | ISO 8601, UTC (`Z`); offsets are rejected |
| flag          | string | _set by server_ | `LOW`, `NORMAL`, `HIGH` or `UNKNOWN`      |

## API endpoints

| Method | Path                  | Description                  |
| ------ | --------------------- | ---------------------------- |
| GET    | /health               | Liveness check               |
| GET    | /patients/:id         | Lookup patient               |
| POST   | /patients             | Create patient               |
| POST   | /lab-results          | Create lab result            |
| GET    | /patients/:id/results | List a patient's lab results |

### GET /health

Returns whether the API is running.

**Request body:** none

**Responses**

- `200 OK`
  ```json
  { "status": "ok" }
  ```

### GET /patients/:id

Returns patient with given ID

**Request body:** none

**Responses**

- `200 OK`:

```json
{
  "patient": {
    "id": "UUID",
    "name": "Pongo",
    "species": "Dog"
  }
}
```

- `404 Not Found`: no ID match found

### POST /patients

Creates a new patient

**Request body**

```json
{
  "name": "Pongo",
  "species": "Dog"
}
```

**Responses**

- `201 Created`:

```json
{
  "patient": {
    "id": "UUID",
    "name": "Pongo",
    "species": "Dog"
  }
}
```

- `400 Bad Request`: missing field, wrong type, unknown field

### POST /lab-results

Creates a new lab result

**Request body**

```json
{
  "patientId": "UUID",
  "testCode": "ABC",
  "value": 98,
  "unit": "degrees",
  "referenceLow": 95,
  "referenceHigh": 100,
  "collectedAt": "YYYY-MM-DDTHH:mm:ssZ"
}
```

**Responses**

- `201 Created`:

```json
{
  "labResult": {
    "id": "UUID",
    "patientId": "UUID",
    "testCode": "ABC",
    "value": 98,
    "unit": "degrees",
    "referenceLow": 95,
    "referenceHigh": 100,
    "collectedAt": "YYYY-MM-DDTHH:mm:ssZ",
    "flag": "NORMAL"
  }
}
```

- `400 Bad Request`: missing field, wrong type, unknown field (including `id` or `flag`), `collectedAt` not ISO 8601 UTC, or `referenceLow` greater than `referenceHigh`. The response lists each problem with the field it applies to.
- `404 Not Found`: no patient with that `patientId`

### GET /patients/:id/results

Returns a patient's lab results, newest `collectedAt` first.

**Query parameters**

- `abnormal` (optional): `true` returns only `LOW`, `HIGH` and `UNKNOWN` results; `false` or omitted returns all results.

**Request body:** none

**Responses**

- `200 OK`:

```json
{
  "labResults": [
    {
      "id": "UUID",
      "patientId": "UUID",
      "testCode": "ABC",
      "value": 101,
      "unit": "degrees",
      "referenceLow": 95,
      "referenceHigh": 100,
      "collectedAt": "2026-10-09T08:00:00Z",
      "flag": "HIGH"
    }
  ]
}
```

- `200 OK` with `"labResults": []`: the patient exists but has no results (or none match the filter)
- `400 Bad Request`: `abnormal` is anything other than `true` or `false`
- `404 Not Found`: no patient with that ID

## Design decisions

TODO: a few bullets on choices you made and why (and one tradeoff you'd explain in an interview).

- Reject any request with an unrecognized field. This is so the sender knows they've done something wrong, and the failure doesn't happen silently. Need to use zod strict mode.
- GET on an empty list returns an empty list. It's not an invalid request, there's just nothing to return.
- If no reference values are provided, set `flag` to `UNKNOWN`, to avoid a false negative, which could incorrectly indicate a normal test result
- Reference range limits are inclusive: a value exactly at `referenceLow` or `referenceHigh` is `NORMAL`, matching how labs report ranges. If only one limit is provided, the value is checked against that limit alone.
- Validate request bodies with zod's `safeParse` only, not the faster `validate`. A failed request needs the detailed errors for the `400` response, which `validate` doesn't provide, and the speed difference is negligible next to network I/O. One validation path is also easier to keep correct: `validate` returns a boolean rather than parsed data, so any transforms or defaults added to a schema later would be skipped on that path.
- `?abnormal=true` includes `UNKNOWN` results as well as `LOW` and `HIGH`. A result with no reference range hasn't been checked, so it needs a person to look at it; hiding it would repeat the false-negative risk of defaulting to `NORMAL`.
- Query parameters are validated as strictly as request bodies: `?abnormal=` accepts only `true` or `false`, and anything else is a `400`. A typo like `?abnormal=ture` should tell the caller, not silently return every result.
- Lab results are stored by their own server-generated ID and linked to patients only through `patientId`. The patient doesn't keep a list of its results, so the relationship lives in one place and can't get out of sync. This mirrors a foreign key in a relational database, which keeps the later move from in-memory storage to SQLite straightforward.

## Testing

TODO: what is tested, which edge cases, and how CI runs the tests.

- Account for missing fields - helpful error reporting

## How I used AI

I'm an engineering manager getting back into hands-on coding, and TypeScript was new to me. I used AI deliberately: as a coach and reviewer for the application code, and as a tool for setup and plumbing.

**How I set it up**

- I gave Claude Code standing instructions (a `CLAUDE.md` file) to act as a coach: no writing application code unless I asked, hints before answers, and senior-engineer-style reviews of my work. I wrote the code in `src/` and `tests/` myself.
- I used GitHub Copilot inline suggestions for the early steps. Midway through, I realized it was preventing me from learning, so I turned them off and wrote every line by hand.

**What I delegated**

- Planning: turning the project idea into a step plan, then into user stories with acceptance criteria.
- Setup and configuration: TypeScript, CI (GitHub Actions), Prettier, test coverage, and the Prisma/SQLite setup, including a separate test database rebuilt from migrations on every run. The one piece of `src/` it wrote is the 10-line database connection file (`src/db.ts`).
- README formatting: I decided the content; Claude turned it into consistent Markdown.

**What it caught in review**

- A test that failed intermittently because two timestamps could land a millisecond apart.
- Missing `await`s after converting storage to async, which made "patient not found" checks always pass.
- Lab values stored as `Int`, which would have rejected or truncated decimals like potassium 3.1.
- Validation running after the patient lookup, so a malformed request returned `404` instead of `400`.
- An `else if` chain where an earlier branch swallowed the "below the low limit" case.
- Tests asserting only the status code, which could pass for the wrong reason; they now check which field failed.

**Where I pushed back, or it was wrong**

- It told me zod has no `.validate()` method. I pointed it to the zod docs, which show the method exists; it had predated that addition and corrected itself. I chose `safeParse` anyway, for the reasons under Design decisions.
- I challenged an ambiguous acceptance criterion about storing results, and the story was rewritten.
- It predicted one of my edge-case tests wouldn't catch a bug. I ran the experiment, the test did catch it, and it acknowledged the mistake.
- I questioned a Copilot-generated database query that worked but "didn't look right". Reviewing it found a redundant filter, sorting in JavaScript instead of in the database, and an unchecked type cast.
- My first storage idea had each patient keep a list of its result IDs. It pointed out that this records the relationship twice, so the two copies could drift. I chose to store results by their own ID, linked only through `patientId`, which also set up the move to a database (see Design decisions).

**What I took from it**

AI was most useful as a fast, always-available reviewer and explainer. Its output still needed review: it was confidently wrong more than once, and the best results came from questioning it the way I'd question a teammate.

## What I'd do next

TODO: what you'd add with more time.
