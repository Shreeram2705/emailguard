# EmailGuard

EmailGuard is a rule based educational email analyzer integrating Full Stack Web Development, Computer Networks, and Formal Languages and Automata Theory. It analyzes manually entered messages and `.eml`/`.txt` files, displays transparent evidence, saves results in MongoDB, and supports history and alert review.

## Requirements

Node.js 20+ and MongoDB 6+ (local or hosted). No credentials are included.

## Setup

1. Copy `.env.example` to `backend/.env` and set `MONGODB_URI`, `PORT`, and `CLIENT_ORIGIN` as needed. The default Mongo URI is `mongodb://127.0.0.1:27017/emailguard`.
2. Start MongoDB. For a local service, install and start MongoDB Community Server; alternatively use a MongoDB Atlas connection string in `backend/.env`.
3. In a terminal run `cd backend; npm install; npm run dev`.
4. In another terminal run `cd frontend; npm install; npm run dev`.
5. Open `http://localhost:5173`. API health is at `http://localhost:4000/api/health`.

The API starts even while MongoDB is unavailable, so `/api/health` remains available and reports `database: "disconnected"`. Database-backed API calls need MongoDB to accept connections.

## Implemented features

- Manual analysis and in-memory `.eml` parsing / `.txt` upload (1 MB limit).
- Regex checks for sender/recipient syntax, phishing terms, spam phrases, URL patterns, repeated punctuation, uppercase, and urgency.
- DFA over S/N tokens; accepts three consecutive suspicious tokens.
- Configurable rule weights and classification boundaries in `backend/algorithms/classificationEngine.js`.
- MongoDB email records, security alerts, history search/filter, status update and delete.
- Dashboard counts and recent records, DFA test API, health check.
- Axios request/response timings in the client and actual request logs in Express.
- OSI and TCP/IP explanatory view.
- Responsive React Router application.

## API

`POST /api/emails/analyze`, `POST /api/emails/upload`, `GET /api/emails`, `GET /api/emails/:id`, `PUT /api/emails/:id`, `DELETE /api/emails/:id`, `GET /api/dashboard/stats`, `GET /api/dashboard/recent`, `GET /api/alerts`, `PUT /api/alerts/:id`, `DELETE /api/alerts/:id`, `POST /api/dfa/test`, `GET /api/health`.

Set `VITE_API_URL` in `frontend/.env` to change the API base URL. Set `CLIENT_ORIGIN` in `backend/.env` to the exact frontend origin.

## Tests

Run `cd backend; npm test`. Algorithm tests use Node's built in test runner. Database and multipart API integration tests require a running MongoDB and are not yet included in this first implementation.

## Safety and limitations

This is an educational transparent heuristic, not a mail gateway or machine learning product. Regex syntax checks do not establish that an address exists. Risk scores are rule contributions, capped at 100, and should not be interpreted as probability. Uploaded attachments are not extracted or executed; `.eml` is parsed for sender, recipient, subject, and plain text. URLs are never fetched. HTML is never rendered. Avoid uploading sensitive personal correspondence to an untrusted deployment.

## Deploying the full app on Vercel

The root `vercel.json` configures the repository as two Vercel Services: the Vite frontend and Express backend. It routes `/api/...` to the backend and all other paths to the frontend. Select **Services** as the project framework when importing the repository. Add `MONGODB_URI` in Vercel's Environment Variables using a MongoDB Atlas connection string; a local MongoDB address such as `127.0.0.1` is not reachable from Vercel. The frontend uses the same deployment origin for `/api` automatically, so `VITE_API_URL` is not required. After deployment, check `/api/health` and verify its database field says `connected`. Without a database connection, fallback records are temporary and won't persist between serverless instances. This demo has no authentication, so use synthetic email content only on a public deployment.

## Demonstration

1. Start MongoDB, backend, and frontend.
2. Open Dashboard and show its empty state.
3. Analyze an ordinary short message, then show the safe score and evidence.
4. Analyze a message with multiple urgency/spam indicators and show its score, regex matches, DFA result, and generated alert.
5. Open History, change review status, open details, then delete a sample.
6. Enter `N S S S` in the DFA view and advance each transition; try `S N S` as a rejection.
7. Open Network Architecture and demonstrate real Axios calls and explain the OSI/TCP-IP responsibilities.

## Project layout

- `backend/algorithms`: regex, DFA, and score rules.
- `backend/models`, `routes`, `config`: database and API.
- `backend/tests`: automated algorithm tests.
- `frontend/src/pages`: dashboard, analyzer, history, DFA, network, alerts, about.
- `docs/`: requirements and design notes.

### Running without MongoDB
The analyzer remains usable without MongoDB. In that case analyses, history, dashboard counts, and alerts are kept in process memory and disappear when the backend stops. The analyzer result labels this as temporary in-memory storage. If MongoDB is available, analyses continue to be stored persistently there.
