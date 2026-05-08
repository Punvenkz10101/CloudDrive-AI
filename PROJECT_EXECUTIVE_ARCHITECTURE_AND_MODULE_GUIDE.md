# CloudDrive-AI
## Executive Summary, Architecture, and Module Guide

Date: March 26, 2026
Project: CloudDrive-AI

## 1. Executive Summary
CloudDrive-AI is a full-stack secure file platform that combines document storage, OCR-based text extraction, AI-powered document Q and A, and a real-time machine learning DDoS defense layer.

The project is designed as both:
- A practical secure cloud-drive application for end users
- A security engineering showcase with attack simulation, anomaly detection, adaptive defense, and threat visualization for administrators

Core business value:
- Users can upload files and ask natural language questions about document content
- OCR converts image and PDF data into searchable text
- AI chatbot produces grounded answers from user file corpus
- DDoS system continuously monitors upload behavior and blocks suspicious traffic
- Admin SOC dashboard provides blocked-event intelligence, analytics, and geo threat map visibility

## 2. System Objectives
1. Provide secure document upload, storage, retrieval, and deletion
2. Automatically process documents with OCR for content understanding
3. Enable AI-driven semantic question answering over uploaded files
4. Detect and mitigate upload-based DDoS and bot-like behavior in real time
5. Provide operator-level security observability and controls

## 3. High-Level Architecture
The system has three major planes:
- Presentation Plane: React frontend and user/admin interfaces
- Service Plane: Node.js and Express APIs for auth, files, OCR orchestration, search, and defense endpoints
- Intelligence Plane: Python OCR and ML DDoS pipeline (feature extraction, model training, prediction)

### 3.1 Updated Federated DDoS Architecture Diagram Text (ASCII)

[User Browser]
    |
    | HTTPS uploads and API requests
    v
[React Frontend]
  - Upload, Files, Dashboard, Chat, Admin SOC pages
    |
    | API calls to /api/*
    v
[API Gateway / Express Entry]
  - Authentication
  - Request normalization
  - File and OCR orchestration
  - DDoS protection handoff
    |
    | traffic mirrored to DDoS protection layer
    v
[Round-Robin Load Balancer]
    |
    +-------------------+-------------------+-------------------+
    |                   |                   |
    v                   v                   v
[DDoS ML Cluster 1] [DDoS ML Cluster 2] [DDoS ML Cluster 3]
  - Isolation Forest     - Isolation Forest     - Isolation Forest
  - Local feature scan    - Local feature scan    - Local feature scan
  - Independent scoring   - Independent scoring   - Independent scoring
    \                   |                   /
     \                  |                  /
      v                 v                 v
           [Federated Decision Aggregator]
              - Majority vote on attack/allow
              - Fail-closed on cluster disagreement or health loss
                         |
                         v
                 [Express Backend]
                   - Upload route
                   - OCR trigger
                   - Search and AI
                         |
            +------------+-------------+
            |                          |
            v                          v
     [OCR Pipeline]              [Storage Layer]
       - Python OCR                - Local file storage
       - Text extraction           - Optional AWS S3
       - Metadata sync             - Metadata JSON
                                  - Upload logs CSV

### 3.2 Updated Federated DDoS Architecture Diagram Text (Mermaid)

flowchart TD
  A[User and Admin Browser] --> B[React Frontend]
  B --> C[API Gateway / Express Entry]

  C --> D[Round-Robin Load Balancer]
  D --> E1[DDoS ML Cluster 1]
  D --> E2[DDoS ML Cluster 2]
  D --> E3[DDoS ML Cluster 3]

  E1 --> F[Federated Decision Aggregator]
  E2 --> F
  E3 --> F

  F -->|majority allow| G[Express Backend]
  F -->|majority block| H[Block Request and Log Event]

  G --> I[File Module]
  G --> J[OCR Orchestration Module]
  G --> K[Search and AI Module]
  G --> L[Auth Module]

  I --> M[Local Storage and Optional S3]
  I --> N[Upload Logs CSV]
  J --> O[Python OCR Processor]
  K --> P[OCR Content Loader]
  K --> Q[Gemini LLM Service]

  N --> R[Model Feature Extraction]
  R --> D

  H --> S[Threat Map UI]

### 3.3 Federated DDoS Layer Design Notes

- The load balancer distributes upload and API traffic to the three clusters using round-robin selection.
- Each cluster runs the same Isolation Forest-based detection logic but scores traffic independently.
- The aggregator applies majority voting so a single compromised or noisy cluster cannot decide policy alone.
- The DDoS layer sits logically between the API gateway and the Express backend, so uploads are screened before storage and OCR work begins.
- If a cluster is unhealthy or unreachable, the aggregator can continue with the remaining clusters and fail closed when policy confidence is too low.

## 4. End-to-End Working Flow

### 4.1 User Upload to AI Answer Flow
1. User uploads a file from Upload page
2. Backend receives file request through file upload route
3. Federated DDoS layer evaluates request risk before processing
4. File is stored (local storage by default, optional S3)
5. Upload event is logged for ML telemetry
6. OCR job runs asynchronously in background
7. Extracted text is saved and synced into searchable metadata
8. User asks question in chat interface
9. Search route collects relevant OCR content and ranks context
10. Gemini model generates grounded answer from extracted content
11. Frontend displays answer with source files

### 4.2 DDoS Detection and Defense Flow
1. A user upload request arrives at the API gateway and is normalized before entering the defense layer.
2. The load balancer forwards the request to one of the three DDoS ML clusters using round-robin distribution.
3. Each cluster extracts the same behavioral features and runs the same Isolation Forest algorithm independently.
4. Cluster results are sent to the federated decision aggregator.
5. The aggregator applies majority voting:
   - Two or more clusters detect attack: block the request.
   - Two or more clusters allow: forward the request to the Express backend.
6. Allowed upload traffic continues through file storage, OCR processing, and search indexing.
7. Blocked events are written to telemetry, exposed to admin dashboard APIs, and visualized in the threat map.
8. Periodic retraining refreshes the model artifacts used by every cluster so all nodes stay behaviorally aligned.

## 5. Module-by-Module Explanation

This section explains all functional modules and what each contributes.

## 5.1 Root and Orchestration Modules
- package.json scripts module
  - Runs frontend, backend, full stack, DDoS training, and attack simulation commands
- RUN_ALL.ps1
  - Interactive startup orchestration for project operations
- attack_interface.ps1
  - Interactive attack launcher with modes and controls
- ddos_attack_simulator.ps1
  - Generates synthetic attack traffic patterns for testing detection
- QUICK_START.md, COMMANDS_REFERENCE.md
  - Operational command documentation and onboarding

## 5.2 Frontend Application Modules

### 5.2.1 App Shell and Routing
- App module
  - Initializes global providers, toasts, routing, behavior tracking, and zero-trust guard polling
- Route modules
  - Landing, Auth, Dashboard, Files, Upload, Admin, DDoS Metrics, Not Found

### 5.2.2 User Experience Modules
- Upload page module
  - Handles file upload interactions and status feedback
  - Integrates chat visibility and upload refresh behavior
- Files page module
  - File listing, searching, viewing, downloading, deleting
  - AI query shortcut and chat embedding
- Dashboard module
  - Displays storage and file activity stats

### 5.2.3 AI Chat UI Module
- Chat interface module
  - Maintains conversation state
  - Sends AI query requests
  - Renders responses and source file links

### 5.2.4 Security Visibility Modules
- DDoS Metrics page module
  - Admin SOC dashboard for blocked events, blocked users, analytics, threat map
- Threat Map module
  - Leaflet visualization of attack origins and hotspot circles
- Behavior Tracker module
  - Collects client-side interaction telemetry for bot-probability inference

## 5.3 Backend Service Modules

### 5.3.1 Server Bootstrap Module
- Server index module
  - Loads environment configuration
  - Creates required storage and ML directories
  - Registers API route modules
  - Serves frontend build when available
  - Triggers startup OCR process-all and periodic retraining

### 5.3.2 Authentication Modules
- Auth route module
  - Signup and login using bcrypt password hashing
  - JWT generation and response payload
- Auth middleware module
  - Validates bearer token and injects user context

### 5.3.3 File Management Modules
- Files route module
  - Upload, list, stats, delete
  - Local and optional S3 support
  - Malware placeholder scan logic
  - Background OCR trigger after successful upload
- S3 integration module
  - Presigned URL support, object listing, upload, delete, bucket readiness

### 5.3.4 OCR Pipeline Modules
- OCR route module
  - Validates files, runs OCR Python process, batch processing support
- OCR content loader module
  - Resolves extracted text from metadata and extracted-text artifacts
- OCR Python processor module
  - Supports PDF, image, and Word extraction
  - Applies image preprocessing for OCR quality
  - Syncs extracted content to metadata for search

### 5.3.5 Search and AI Modules
- Search route module
  - Keyword and content-based retrieval over file corpus
  - AI answer endpoint builds relevant context from OCR text
  - Includes retry behavior for LLM rate-limit conditions
- Gemini AI module
  - Handles model selection fallback, retries, and answer generation prompting

### 5.3.6 DDoS and Security Modules
- DDoS gateway module
  - Receives request metadata before the backend executes storage or OCR work
  - Hands traffic to the load balancer and aggregator
- DDoS cluster node module
  - Runs Isolation Forest scoring independently in each of the three clusters
  - Produces local attack or allow decisions from the same feature set
- Federated decision aggregator module
  - Collects all cluster decisions and performs majority voting
  - Enforces block, allow, or fail-closed behavior based on cluster health
- DDoS service module
  - Logs upload events
  - Extracts real-time features from logs
  - Runs prediction calls and fallback heuristic scoring
- DDoS routes module
  - Public ingest endpoint for simulator
  - User risk status, system status, blocked events, blocked users, analytics, reset
- Bot classify route module
  - Converts interaction telemetry into bot-probability score

### 5.3.7 Data and Persistence Modules
- Database module
  - MongoDB connection and schemas for upload logs and stats
- Storage metadata module
  - JSON metadata for OCR outputs and file attributes
- Upload logs CSV module
  - Canonical telemetry stream for ML extraction and analytics

## 5.4 Machine Learning DDoS Subsystem Modules

### 5.4.1 Data Feature Module
- Feature extractor module
  - Computes upload behavior features per user:
    - burst uploads in time windows
    - duplicate ratio
    - average and max size
    - failure rate
    - time gaps between uploads
    - IP diversity and unique hashes

### 5.4.2 Model Training Module
- Isolation Forest trainer module
  - Normalizes features with StandardScaler
  - Trains Isolation Forest anomaly detector
  - Saves model and scaler artifacts for inference across all clusters

### 5.4.3 Prediction Module
- Predictor module
  - Loads the shared model and scaler bundle for each DDoS node
  - Scores user behavior vectors locally inside each cluster
  - Maps anomaly score to attack or allow decisions
  - Returns machine-readable security decisions to the aggregator

### 5.4.4 Retraining Module
- Retraining script module
  - Refreshes model periodically to adapt to new traffic patterns
  - Republishes synchronized artifacts so all clusters evaluate the same baseline

## 6. Technology Stack and Software Used

### 6.1 Frontend Technologies
- React 18
- TypeScript
- Vite
- React Router
- TanStack React Query
- Tailwind CSS
- Radix UI components
- Leaflet and OpenStreetMap for map rendering
- Lucide icons

### 6.2 Backend Technologies
- Node.js
- Express.js
- Multer for multipart upload
- JWT and bcryptjs for auth security
- Mongoose and MongoDB for log persistence
- AWS SDK S3 client for optional object storage

### 6.3 AI and OCR Technologies
- Google Gemini API for answer generation
- Tesseract OCR via pytesseract
- pdf2image and Pillow
- Optional OpenCV preprocessing

### 6.4 Machine Learning Technologies
- scikit-learn Isolation Forest
- pandas and numpy
- joblib serialization
- matplotlib and seaborn for analysis

### 6.5 Tooling and Operations
- PowerShell automation scripts for startup and attack simulation
- Concurrently for multi-process local run
- ESLint and TypeScript build toolchain

## 7. Security Model Summary
1. Authentication via JWT for protected flows
2. Real-time DDoS scoring on upload paths through three clustered ML nodes
3. Majority-vote enforcement with block and allow behavior
4. Bot-like behavior telemetry integration
5. Admin threat visibility and reset controls
6. Blocked event forensics and geolocation enrichment
7. Fault tolerance through cluster redundancy and load-balanced decisioning
8. No single ML node can unilaterally approve or deny a request

### 7.1 Security Benefits
- The design removes the single DDoS middleware bottleneck, so a failure or compromise in one node does not disable protection for the whole system.
- Independent cluster scoring makes targeted model poisoning or partial service degradation less effective because the request outcome depends on multiple nodes.
- Majority voting reduces the chance that a noisy false positive or a temporary node anomaly blocks legitimate traffic.

### 7.2 How Load Balancing Works
- The load balancer uses round-robin distribution across the three DDoS ML clusters.
- Each incoming upload request is assigned to one cluster for local scoring, which keeps the nodes independent while balancing request volume.
- If one cluster slows down or fails health checks, the aggregator can shift traffic to the remaining healthy nodes.

### 7.3 How Federated Decision Improves Accuracy
- Each cluster sees the same request from the same feature space but makes its own inference, which creates a small ensemble effect.
- Majority voting dampens outlier predictions and makes the final verdict more stable than a single-model decision.
- Shared model artifacts keep the three nodes aligned while independent execution still exposes disagreements that can be treated as risk signals.

### 7.4 How This Prevents Bypass Attempts
- Attackers cannot bypass the protection by targeting one cluster, because the final verdict comes from the federated aggregator.
- The DDoS layer sits before the Express backend, so blocked uploads never reach storage, OCR, or downstream business logic.
- A compromised cluster cannot force an allow decision on its own, because the aggregator requires majority approval.

## 8. Deployment and Runtime Model

### 8.1 Local Development Runtime
- Frontend runs on default Vite port
- Backend runs on Express API port
- DDoS ML scripts run from Python virtual environment

### 8.2 Typical Commands
- npm install
- npm run dev
- npm run server
- npm run dev:full
- npm run ddos:quick
- npm run attack

### 8.3 Required Runtime Dependencies
- Node.js and npm
- Python and pip
- Tesseract OCR installation for OCR extraction
- Optional MongoDB and AWS credentials depending on feature usage

## 9. Project Strengths
- Strong integration between document intelligence and cybersecurity
- Clear separation of user and admin experiences
- Practical real-time defense behavior with explainability
- Scripted simulation environment for repeatable testing
- Extensible architecture for cloud storage and model evolution

## 10. Recommended Next Enhancements
1. Replace heuristic bot classifier with trained behavioral model
2. Add role-based access control and hardened admin auth
3. Add queue system for OCR jobs at scale
4. Add test coverage for security-critical middleware paths
5. Add CI pipeline for lint, build, unit tests, and model checks
6. Add structured observability (metrics, traces, and alerting)

## 11. Quick Module Index by Folder

- src
  - Frontend pages, components, hooks, API client
- server
  - Express APIs, middleware, OCR orchestrator, AI integration, storage and security logic
- ddos_system/Application_Layer_DDOS
  - ML data pipeline, training, prediction, simulator tools, model artifacts
- public
  - Static assets
- tools
  - Additional support utilities

## 12. Conclusion
CloudDrive-AI is a hybrid application that unifies secure file management, OCR intelligence, AI document reasoning, and active ML-driven cyber defense. It demonstrates practical full-stack engineering with integrated data workflows, security operations visibility, and adaptive anomaly mitigation.
