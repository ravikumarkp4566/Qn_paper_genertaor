# QPGen server

Express + MongoDB API for the question paper app. It stores colleges (with the
header they print on papers), users, subjects, the question bank, generated
papers, LaTeX papers and their images (in GridFS), assessment policies and the
academic options lists.

## Setup

1. Create `server/.env` from `server/.env.example` and fill in `MONGODB_URI`
   (your Atlas connection string, with the database name `qpgen` after `.net/`)
   and `JWT_SECRET`.
2. Install and check the connection:

   ```bash
   cd server
   npm install
   npm run check-db
   ```

3. Move the data that used to be hardcoded in the web app into the database:

   ```bash
   npm run seed
   ```

   It is safe to run again; it updates what is there. `npm run seed:reset`
   empties the collections first.

4. Start the API on port 5050 (the web app's dev server forwards `/api` to it):

   ```bash
   npm run dev
   ```

## What the seed puts in

| Collection | From |
|---|---|
| `colleges` | SIT (with its header and logo) and the three sample tenants |
| `users` | the two demo logins, with hashed passwords |
| `subjects`, `questions` | the Data Structures subject and its 85 questions |
| `papers` | the sample SEE paper |
| `assessmentpolicies` | SEE, Test and Quiz defaults |
| `settings` | Bloom levels, COs, POs, PSOs, difficulty levels, marks |

## API

All routes are under `/api`. Everything except `/health` and `/auth/login`
needs `Authorization: Bearer <token>` from the login response. Faculty see only
their own college's data.

- `POST /auth/login`, `GET /auth/me`
- `GET /college`, `GET /college/logo`
- `GET /subjects`, `PUT|DELETE /subjects/:subjectId`
- `GET /questions?subjectId=`, `PUT|DELETE /questions/:questionId`, `POST /questions/import`
- `GET /papers`, `GET|PUT|DELETE /papers/:paperId`
- `GET /latex-papers`, `GET|PUT|DELETE /latex-papers/:paperId`
- `GET /latex-papers/:paperId/images`, `GET|PUT|DELETE /latex-papers/:paperId/images/:name`
- `GET /assessment-policies`, `PUT /assessment-policies/:kind`
- `GET /options`
- `GET /admin/overview` (platform admin only)
