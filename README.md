# Town Planning & Urban Development - I-SupportOne Desk

Enterprise Helpdesk & Citizen Grievance Ticketing Portal with dynamic user authentication, role-based access control, service category allocation, SLA tracking, and audit logging.

## 🚀 Key Features

- **Dynamic Authentication & Role Management**:
  - Super Admin, Helpdesk Operator, Technician Specialists, and Citizen Users.
  - Live synchronization between Admin Console and Login Modal.
- **Admin Console**:
  - Full management of registered user credentials, roles, designations, and contact details.
  - Interactive Service Category Management (Inline Add, Edit, Delete with safeguard checks).
  - Category-to-Technician allocation & workload monitoring.
- **Ticketing & SLA Automation**:
  - Auto-ticket numbering, SLA calculation, and escalation alerts.
  - Immutable audit trail preserving original action-taker names and timestamps.
- **Rich Interactive UI**:
  - Zoho Desk / SupportOne enterprise design system with light/dark themes.
  - Real-time notification center and monthly analytics dashboard.

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Vanilla CSS (Enterprise Design System), FontAwesome icons.
- **Backend**: Node.js, Express, SQLite (`better-sqlite3`), JWT Authentication.

## 📦 Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
node server.js
```
Backend runs on `http://localhost:5000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`.

## 👤 Default Active Accounts
- **Super Admin**: `ishwarsahu1269@gmail.com` (Pass: `admin123`)
- **Helpdesk Operator**: `albpms.helpdesk@gmail.com` (Pass: `Admin@123`)
- **Technician Specialist**: `osu.dtcp@gmail.com` (Pass: `Admin@123`)
- **Citizen User**: `user@townplanning.gov.in` (Pass: `user123`)
