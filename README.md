# Vet Lab Results API

> All patients, pets and lab values in this project are made up. No real patient data.

## What it does

TODO: one or two sentences. (A small REST API that receives lab results, validates them, matches them to a patient, flags out-of-range values, and returns a patient's result history.)

## Why

TODO: tie it to the idea of practice software and diagnostics working together: a vet sees a lab result in context and can act on it.

## Tech stack

TODO: Node + TypeScript, Express, zod (validation), Vitest + Supertest (tests), GitHub Actions (CI). Later: SQLite + Prisma, PHP/Laravel port.

## How to run

```bash
npm install
npm run dev
npm test
```

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

TODO: keep a running list as you go. What you asked, what it got right, what you had to fix or rewrite.

- Establish project steps
- Help with initial environment setup and scaffolding
- Help with syntax and peculiarities of typescript language

## What I'd do next

TODO: what you'd add with more time.
