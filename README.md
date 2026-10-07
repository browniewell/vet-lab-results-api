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

| Field         | Type   | Required?       | Notes                |
| ------------- | ------ | --------------- | -------------------- |
| patientId     | string | Yes             | UUID                 |
| testCode      | string | Yes             | Alphanumeric         |
| value         | number | Yes             |                      |
| unit          | string | Yes             |                      |
| referenceLow  | number | No              |                      |
| referenceHigh | number | No              |                      |
| collectedAt   | string | Yes             | YYYY-MM-DDTHH:mm:ssZ |
| flag          | string | _set by server_ |                      |

## API endpoints

| Method | Path          | Description       |
| ------ | ------------- | ----------------- |
| GET    | /health       | Liveness check    |
| GET    | /patients/:id | Lookup patient    |
| POST   | /patients     | Create patient    |
| POST   | /lab-results  | Create lab result |

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
  "patientId": "UUID",
  "testCode": "ABC",
  "value": 98,
  "unit": "degrees",
  "referenceLow": 95,
  "referenceHigh": 100,
  "collectedAt": "YYYY-MM-DDTHH:mm:ssZ",
  "flag": "LOW | NORMAL | HIGH | UNKNOWN"
}
```

- `400 Bad Request`: missing field, wrong type, unknown field

## Design decisions

TODO: a few bullets on choices you made and why (and one tradeoff you'd explain in an interview).

- Reject any request with an recognized field. This is so the sender knows they've done something wrong, and the failure doesn't happen silently. Need to use zod strict mode.
- GET on an empty list returns an empty list. It's not an invalid request, there's just nothing to return.
- If no reference values are provided, set outOfRange to unknown, to avoid a false negative, which could incorrectly indicate a normal test result

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
