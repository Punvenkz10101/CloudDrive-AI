# CloudDrive-AI

Secure cloud storage with simple Node.js backend and React frontend.

## Backend Setup (Node.js Express)

The project includes a Node.js backend in `server/` for authentication, file upload/storage, and basic search.

### Prerequisites
- Node.js 18+

### Install
```bash
npm install
```

### Configure
Create `server/.env` (see keys below). When developing with Vite on port 8081, you can leave defaults.

```
PORT=8080
CLIENT_URL=http://localhost:8081
JWT_SECRET=change_me

# AWS S3
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
AWS_S3_BUCKET=clouddrive-ai
```

Optionally set `VITE_API_URL` in a `.env` at the project root if hosting frontend and backend separately.

```
VITE_API_URL=http://localhost:8080
```

### Run (Frontend + Backend)
```bash
npm run dev:full
```

This starts the backend at `http://localhost:8080` and Vite at `http://localhost:5173`.

### Backend Endpoints
- `POST /api/auth/signup` { email, password }
- `POST /api/auth/login` { email, password }
- `GET /api/files` list uploaded files
- `POST /api/files/upload` multipart form-data field `file`
- `DELETE /api/files/:id` delete file
- `GET /api/search?q=term` simple filename search
- `GET /downloads/:filename` download file

Uploaded files are stored under `server/storage/files/`. Files containing the word "virus" are quarantined to `server/storage/quarantine/` as a demo of scanning.

