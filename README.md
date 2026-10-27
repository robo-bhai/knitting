# TexFlow Industrial Garment ERP (GarmentFlow Pro)

Production-grade, enterprise-scale Garment & Textile Manufacturing ERP system designed for spinning, knitting, dyeing, lot-making, fabric quality inspection, warehouse stocking, logistics dispatch, and HR payroll management.

---

## 🌟 Key Features & Workflow Architecture

1. **PPC Tree Hierarchy (Planning & Production Control)**:
   - Cascading structure: `Work Orders (WO) ➔ Plans ➔ Bags ➔ Lots`.
   - Planned weight management, lot target synchronization, and balance tracking.

2. **Machine Sign-In Station (`/machine-sign`)**:
   - Operator and machine assignment to job, shade, and needles specification (e.g., `24N`, `28N`).
   - Dynamic 5-digit unique barcode generation with anti-collision uniqueness check.

3. **Roll Feeding Station (`/roll-entry`)**:
   - 4-column reactive cascading dropdowns: `Work Order ➔ Plan ID ➔ Bag / Badge ➔ Target Lot`.
   - 3-point specification validator: checks `Work Order`, `Fabric Shade`, and `Needles` between scanned machine barcode and selected lot.
   - Sequential roll numbers, tube assignment, and intelligent roll weight merging (`is_merged`).
   - High-speed 5-row printable thermal roll barcode stickers (3x2 inch format).

4. **Roll Quality Inspection Station (`/roll-quality`)**:
   - Grade A (Passed) vs Grade B fabric defect weight classification.
   - Automatic balance restoration to Lot targets for B-grade defects.
   - **Auto-Bag Finalization**: Automatically finalizes the bag for warehouse intake as soon as 100% of rolls are inspected.

5. **Plan Status & Bag Finalization (`/plan-status`)**:
   - Real-time roll-by-roll inspection status monitoring.
   - Auto-finalization when all rolls pass QC.
   - Direct shortcut to Logistics Dispatch for outward gate pass creation.

6. **Logistics & Outward Gate Pass (`/dispatch`)**:
   - Finalized bag outwards, customer & transporter details, and vehicle assignment.
   - Printable official gate pass certificates (`/print-gate-pass/<bag_no>`).

7. **Export Plan Excel Workbook (`.xlsx`)**:
   - Multi-level lot breakdown workbook matching industrial standards.
   - Header row: `Work Order, Bag Number, Plan ID, Shade, Needle, Lot, Planned Weight, Produced Weight, Quality Weight, Dispatched Weight`.
   - Visual bag badge banners, individual lot breakdown rows, bag subtotals, and overall work order grand totals.

8. **Human Resources & Payroll (`/hr/...`)**:
   - Staff directory, biometric-style attendance marking, employee financial ledger (advances/fines/bonuses), and automatic monthly payroll calculation.

9. **Desktop Multi-Window MDI Workspace**:
   - Drag-and-drop, resizable, minimizable, and maximizable window manager mimicking classic Oracle Java ERP desktop applications.

---

## 📁 Project Directory Structure

```text
├── .env.example              # Sample environment variables template (safe for GitHub)
├── .gitignore                # Git exclusions (node_modules, venv, database.db, .env)
├── package.json              # React SPA frontend dependencies & scripts
├── requirements.txt          # Python Flask backend dependencies
├── main.py                   # Python Flask backend server (Dual-Engine SQLite & MySQL)
├── index.html                # Vite SPA HTML entry point
├── vite.config.ts            # Vite build configuration with Tailwind CSS support
├── tsconfig.json             # TypeScript configuration
├── worker.js                 # Cloudflare Worker Cron Trigger script
│
├── src/                      # React Frontend Source Code
│   ├── App.tsx               # Main application controller (Tabs & MDI Window mode)
│   ├── main.tsx              # React DOM mounting
│   ├── index.css             # Tailwind CSS & global styles
│   ├── types/
│   │   └── index.ts          # TypeScript domain interfaces (Roll, Bag, Lot, Staff, etc.)
│   ├── context/
│   │   └── AppContext.tsx    # State management store (localStorage persistence & reactive logic)
│   ├── data/
│   │   └── initialData.ts    # Seed data for production testing
│   └── components/
│       ├── layout/
│       │   ├── Navbar.tsx             # Metallic silver ERP top bar
│       │   ├── Sidebar.tsx            # Left module navigation drawer
│       │   └── DesktopWindowManager.tsx # Oracle Java ERP style MDI Window manager
│       ├── common/
│       │   ├── ThermalStickerModal.tsx # Printable roll barcode sticker modal
│       │   ├── ExportPlanModal.tsx     # Responsive loading & Excel (.xlsx) generator
│       │   └── FlashMessage.tsx        # Toast notification system
│       └── modules/
│           ├── DashboardView.tsx       # KPI executive metrics & quick launch
│           ├── PpcTreeView.tsx         # PPC Tree hierarchy management
│           ├── MachineSignView.tsx     # Machine sign-in & 5-digit barcodes
│           ├── RollEntryView.tsx       # Fabric roll feeding & cascading form
│           ├── RollWiseView.tsx        # Lot-wise roll register & re-print
│           ├── QualityControlView.tsx  # Quality inspection & Grade A/B split
│           ├── FabricStoreView.tsx     # Warehouse roll stocking
│           ├── PlanStatusView.tsx      # Bag inspection status & auto-finalization
│           ├── DispatchView.tsx        # Dispatch & Gate pass generation
│           ├── SearchRollView.tsx      # Barcode tracker & lifecycle history
│           ├── ReportsMenuView.tsx     # 13-column reports & Excel exports
│           ├── HrStaffView.tsx         # Personnel files & employee directory
│           ├── HrAttendanceView.tsx    # Daily departmental attendance
│           ├── HrLedgerView.tsx        # Staff advances, fines & bonuses
│           ├── HrPayrollView.tsx       # Monthly payroll calculation
│           ├── AdminProView.tsx        # Database management & user admin
│           └── LoginView.tsx           # Authentication screen
│
└── templates/                # Python Flask Jinja2 HTML Templates (Production Server)
    ├── base.html             # Base layout with navigation & Export Plan modal
    ├── roll_entry_form.html  # Roll feeding web form
    ├── plan_status.html      # Bag status & finalization screen
    ├── dispatch.html         # Gate pass creation
    ├── gate_pass_pdf.html    # Printable gate pass
    └── ... (other module templates)
```

---

## 🚀 Local Installation & Running Guide

> **Note on UI:** The interface you see in the Google AI Studio preview is the **React SPA (Vite)** on port 3000. When you clone this project to your local computer or VPS, run **`npm run dev`** to get the exact same interface at `http://localhost:3000`. We have also redesigned the Python Flask web template (`templates/roll_entry_form.html`) to be a 100% pixel-perfect replica of the React Roll Entry Form, so both options now deliver the exact same UI!

---

### Option 1: Running the React Frontend (Node.js & Vite) - *Matches AI Studio Preview 100%*

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/<your-repo-name>.git
   cd <your-repo-name>
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`. You will see the **exact** layout, cards, badges, and modals shown in AI Studio!

4. **Build for production**:
   ```bash
   npm run build
   ```

---

### Option 2: Running the Python Flask Backend Server

1. **Create and activate a Python virtual environment**:
   ```bash
   # Linux/macOS
   python3 -m venv venv
   source venv/bin/activate

   # Windows
   python -m venv venv
   venv\Scripts\activate
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to configure your settings (or use default SQLite out of the box):
   ```ini
   DB_TYPE=sqlite
   SQLITE_DB=database.db
   SECRET_KEY=your_secret_key_here
   ADMIN_USERNAME=admin
   ADMIN_PASSWORDS=admin123
   ```

4. **Run the Flask server**:
   ```bash
   python main.py
   ```
   The backend will start on `http://127.0.0.1:5000` (or `PORT` specified in `.env`).

---

## 🔐 Credentials & Environment Variables

- Copy `.env.example` to `.env` before running in production.
- **Never commit `.env` to GitHub** (it is excluded via `.gitignore`).
- **Default Administrative Credentials**:
  - **Username**: `admin`
  - **Password**: `admin123`
  - *Tip: Change these in your `.env` or in production host environment secrets (Render, Railway, Heroku, etc.).*

---

## 📦 Pushing this Code to GitHub (Step-by-Step)

1. Open your terminal in the project directory:
   ```bash
   cd /path/to/project
   ```

2. Initialize a Git repository (if not already initialized):
   ```bash
   git init
   ```

3. Add all files to staging:
   ```bash
   git add .
   ```

4. Commit the changes:
   ```bash
   git commit -m "Initial commit: Production-ready TexFlow Garment ERP with React SPA and Python Flask backend"
   ```

5. Create a new repository on [GitHub](https://github.com/new).

6. Link the local repository to your GitHub remote and push:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```

---

## ☁️ Cloudflare Worker Cron Job (`worker.js`)

If you want to trigger scheduled cron synchronization every 5 hours on Cloudflare Workers:
1. Deploy `worker.js` to Cloudflare Workers.
2. In the Cloudflare Dashboard, go to **Triggers ➔ Cron Triggers**.
3. Add cron expression: `0 */5 * * *` (every 5 hours).

---

## 📜 License
Proprietary Industrial Textile ERP Software &bull; All Rights Reserved.
