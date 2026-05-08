# CloudDrive-AI Project Paper

## Abstract
CloudDrive-AI is a secure full-stack document platform that combines cloud-style file storage, OCR-based text extraction, AI-assisted document question answering, and machine-learning-based DDoS defense. The project was built to demonstrate how a modern web application can handle document management while also defending against abuse patterns such as rapid uploads, duplicate-file floods, and bot-like traffic. It uses a React frontend, an Express backend, optional AWS S3 storage, MongoDB-based telemetry, Python machine-learning scripts, and a federated defense model for suspicious upload traffic.

## 1. Introduction
CloudDrive-AI is designed as both a practical file management system and a security engineering showcase. Users can register, log in, upload files, view their stored documents, search content, and ask questions about their documents using an AI assistant. At the same time, the application monitors upload behavior in real time and scores that behavior to detect abnormal or malicious patterns.

The project focuses on three main goals:

1. Secure document handling and file management.
2. OCR and AI-driven document understanding.
3. Real-time DDoS and abuse detection with visual security monitoring.

## 2. Project Purpose
The purpose of CloudDrive-AI is to provide a single platform where users can safely store documents and interact with them intelligently, while administrators can observe and defend the system against suspicious activity. Instead of treating storage, retrieval, and security as separate concerns, the project links them into one workflow. Every upload becomes both a document asset and a security signal.

This makes the system useful for:

- secure personal or organizational file handling,
- document search and semantic question answering,
- attack simulation and defensive monitoring,
- demonstrating machine learning in a real application context.

## 3. System Overview
CloudDrive-AI is organized into three major layers.

### 3.1 Presentation Layer
The frontend is built with React and TypeScript using Vite for development and build tooling. It provides the user interface for:

- landing and authentication screens,
- dashboard and file management pages,
- upload workflow,
- admin DDoS monitoring pages,
- visual threat mapping.

The frontend uses component-based design, routed pages, and background polling for security state updates.

### 3.2 Service Layer
The backend is implemented with Node.js and Express. It exposes APIs for:

- authentication,
- file upload, listing, download, and delete operations,
- OCR processing orchestration,
- document search and AI answer generation,
- DDoS telemetry, block reporting, analytics, and reset operations.

This layer is also responsible for connecting the frontend to the ML subsystem and storing operational metadata.

### 3.3 Intelligence Layer
The intelligence layer is built in Python and is responsible for the machine-learning workflow. It includes:

- upload log collection,
- feature extraction,
- Isolation Forest model training,
- prediction and risk scoring,
- evaluation and retraining support.

This layer analyzes user behavior rather than the content of the files alone, which makes it suitable for abuse detection in an upload-heavy environment.

## 4. Architecture
The project uses an end-to-end pipeline that connects the user, the backend, OCR, AI search, and DDoS defense.

### 4.1 Normal File Flow
1. The user uploads a file through the frontend.
2. The backend accepts the file and checks security policy.
3. The file is stored locally or in AWS S3 depending on configuration.
4. The upload event is logged for telemetry and ML analysis.
5. OCR runs in the background and extracts text from supported file types.
6. Extracted text is saved into metadata and extracted-text storage.
7. The file becomes searchable and available for AI question answering.

### 4.2 Security Flow
1. Each upload request is scored by the DDoS protection layer.
2. The system computes behavioral features such as upload frequency, duplicate ratio, failure rate, and file size patterns.
3. The Isolation Forest model estimates anomaly score and risk level.
4. The system applies allow, rate-limit, or block decisions based on the score and burst behavior.
5. Blocked events are written to telemetry and shown in the admin dashboard.
6. A threat map visualizes the geographic origin of blocked activity.

## 5. Technologies and Tools Used
### 5.1 Frontend Technologies
- React 18
- TypeScript
- Vite
- React Router
- TanStack React Query
- Tailwind CSS
- shadcn/ui and Radix UI components
- Lucide React icons
- Leaflet and React Leaflet for threat visualization
- Recharts for analytics visualization

### 5.2 Backend Technologies
- Node.js
- Express
- JWT authentication
- bcryptjs password hashing
- multer for file upload handling
- MongoDB with Mongoose for telemetry storage
- AWS SDK for S3 integration
- geoip-lite for location enrichment
- child_process for Python orchestration

### 5.3 AI and Security Technologies
- Python
- pandas and scikit-learn style ML pipeline structure
- Isolation Forest anomaly detection
- OCR processing pipeline
- Google Generative AI API for document Q and A
- CSV-based event logging for model input

### 5.4 Operational Tools
- PowerShell scripts for startup and attack simulation
- RUN_ALL.ps1 for orchestration
- attack_interface.ps1 for interactive attack testing
- ddos_attack_simulator.ps1 for synthetic traffic generation
- quick training and evaluation scripts in the DDoS subsystem

## 6. Core Functional Modules
### 6.1 Authentication Module
The authentication system supports signup and login using email and password. Passwords are hashed before storage, and JSON Web Tokens are used to keep sessions stateless. The frontend stores the token locally and sends it with API requests.

### 6.2 File Management Module
The file module supports:

- file upload,
- file listing,
- file deletion,
- download access,
- metadata generation,
- clean versus quarantined file status.

It supports both local filesystem storage and AWS S3-based storage. This makes the system flexible for both development and deployment.

### 6.3 OCR Module
The OCR module processes uploaded documents in the background. It extracts text from PDFs, images, and office documents, then stores the output in extracted text files and metadata records. This extracted content is later used by search and AI answer generation.

### 6.4 Search and AI Module
The search module retrieves relevant documents using filename, metadata, and OCR content. The AI module sends the selected document context to Gemini and asks it to answer the user’s question using only the uploaded documents as evidence. This gives the platform a retrieval-augmented document assistant workflow.

### 6.5 DDoS Protection Module
The DDoS module is one of the project’s central contributions. It logs every upload event and extracts behavioral features from the log history. It then uses a machine-learning model to score whether the user behavior looks normal, suspicious, or malicious. The backend can then allow the request, rate-limit it, or block it.

### 6.6 Admin Monitoring Module
The admin monitoring interface provides:

- system status,
- blocked events,
- blocked user summaries,
- analytics,
- live refresh,
- a geographic threat map.

This helps administrators see both the scale and the location of suspicious activity.

## 7. Machine Learning Method
The project uses unsupervised anomaly detection with Isolation Forest. This is a good fit because DDoS and abuse patterns often do not come with reliable labeled datasets, especially in a custom application environment.

### 7.1 Why Isolation Forest
Isolation Forest works well here because it:

- does not require labeled attack examples,
- can detect unusual upload behavior,
- produces interpretable anomaly scores,
- scales reasonably well for real-time scoring,
- supports adaptive thresholding.

### 7.2 Features Used
The model is driven by behavioral features derived from upload logs, including:

- uploads per time window,
- duplicate file ratio,
- average file size,
- upload failure rate,
- maximum file size,
- average time between uploads,
- total uploads,
- total bytes uploaded,
- IP diversity,
- unique file hash count.

These features are designed to capture the difference between normal user behavior and attack-like behavior.

### 7.3 Risk Scoring
The system maps anomaly scores to operational decisions:

- low score: allow,
- medium score: rate-limit or challenge,
- high score: block.

This tiered approach is useful because not every abnormal event should be treated as a full attack.

## 8. OCR and AI Method
The OCR pipeline converts document content into searchable text. That text is then reused in two ways:

- it can be searched directly,
- it can be passed to the AI assistant for document-aware question answering.

This design prevents the AI from answering in a vacuum and keeps responses grounded in uploaded material. It also makes the system useful for practical file lookup tasks such as finding IDs, names, dates, topics, and key sections inside documents.

## 9. Storage and Persistence
CloudDrive-AI uses multiple storage formats depending on the data type:

- uploaded files are stored locally or in AWS S3,
- OCR text is stored as extracted-text artifacts,
- file metadata is stored in JSON,
- upload telemetry is stored in CSV and MongoDB,
- model artifacts are saved as serialized Python files.

This mixed storage design keeps the system simple to work with during development while still supporting more production-like deployment options.

## 10. Security and Defense Design
The project includes several security mechanisms:

- JWT-based authenticated access,
- password hashing,
- upload rate and anomaly monitoring,
- duplicate upload detection,
- zero-trust escalation behavior,
- admin-only DDoS visibility,
- threat map visualization of blocked attacks.

A key design choice is that the defense system does not only look at request volume. It also considers file duplication, upload timing, and user behavior patterns. This reduces reliance on a single signal and makes the defense more robust.

## 11. Federated DDoS Concept
The documentation describes a federated defense design in which three ML clusters independently score requests and a majority-vote aggregator makes the final decision. The purpose of this design is to reduce the chance that one weak or compromised detector can control the policy outcome. It improves resilience, fault tolerance, and confidence in the final block decision.

## 12. Development and Testing Workflow
The repository includes scripts and documentation that support:

- application startup,
- backend and frontend development,
- model training,
- attack simulation,
- dashboard validation,
- troubleshooting and reset operations.

This means the project is not only an application prototype but also a testable security platform.

## 13. Project Outcome
CloudDrive-AI demonstrates how a cloud storage application can be extended with intelligent document understanding and ML-based security. The project combines practical file management with applied AI and real-time defense, creating a platform that is useful for both end users and security operators.

## 14. Conclusion
CloudDrive-AI is a complete full-stack system that integrates secure file storage, OCR, AI document answering, and DDoS defense into one architecture. Its main strengths are the combination of real application features with ML-based behavioral analysis, the separation of user and admin workflows, and the use of visual analytics to make attack behavior understandable. The project is well suited for a final-year engineering paper because it demonstrates software engineering, machine learning, cybersecurity, and applied AI in one coherent system.

## References
- PROJECT_EXECUTIVE_ARCHITECTURE_AND_MODULE_GUIDE.md
- FEDERATED_DDOS_CLUSTER_ARCHITECTURE.md
- HOW_DDOS_SYSTEM_WORKS.md
- DDOS_IMPLEMENTATION_SUMMARY.md
- QUICK_START.md
