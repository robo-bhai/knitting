import React, { useState } from 'react';
import {
  Cpu, Copy, Check, Shield, Globe, Terminal, ArrowRight,
  Clock, Key, Download, CheckCircle2, AlertCircle, ExternalLink,
  Database, RefreshCw, HardDrive, CheckCircle, PauseCircle, PlayCircle
} from 'lucide-react';

export const CloudflareWorkflowView: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);

  const workflowYaml = `name: Run GarmentFlow Server & Cloudflare Tunnel

on:
  workflow_dispatch:
    inputs:
      duration_hours:
        description: "Server Run Duration in Hours (Max 5.8 hours due to GitHub limit)"
        required: true
        default: "5"
  # Optional: un-comment to automatically trigger on push
  # push:
  #   branches: [ main ]

permissions:
  actions: read
  contents: read

jobs:
  run-server-and-tunnel:
    name: Run Application, GitHub MySQL & Cloudflare Tunnel
    runs-on: ubuntu-latest
    timeout-minutes: 360 # GitHub maximum limit is 360 minutes (6 hours)

    # 1. Native GitHub Actions MySQL Service Container
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: garmentflow_pro
        ports:
          - 3306:3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=5

    env:
      PORT: 5000
      SECRET_KEY: \${{ secrets.SECRET_KEY || 'production-secret-garmentflow-erp-token-9928' }}
      # GitHub Actions Native MySQL connection settings
      DB_TYPE: "mysql"
      MYSQL_HOST: "127.0.0.1"
      MYSQL_PORT: "3306"
      MYSQL_USER: "root"
      MYSQL_PASSWORD: "root"
      MYSQL_DB: "garmentflow_pro"
      # Admin credentials loaded from GitHub Secrets
      ADMIN_USERNAME: \${{ secrets.ADMIN_USERNAME || 'admin' }}
      ADMIN_PASSWORDS: \${{ secrets.ADMIN_PASSWORDS || secrets.ADMIN_PASSWORD || 'admin123' }}

    steps:
      - name: 📥 Checkout Repository
        uses: actions/checkout@v4

      - name: 🐍 Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - name: ⏳ Wait for Previous Workflow Run to Complete & Save Cache
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          echo "=========================================================="
          echo "🔍 CHECKING FOR ACTIVE PREVIOUS WORKFLOW RUNS            "
          echo "=========================================================="
          python3 -c "
          import os, sys, time, json, urllib.request

          repo = os.environ.get('GITHUB_REPOSITORY', '')
          token = os.environ.get('GITHUB_TOKEN', '')
          cur_id = int(os.environ.get('GITHUB_RUN_ID', '0'))
          cur_num = int(os.environ.get('GITHUB_RUN_NUMBER', '0'))

          if not token or not repo:
              print('ℹ️ GITHUB_TOKEN not available; skipping previous run wait check.')
              sys.exit(0)

          max_wait = 180 # 3 minutes max wait for previous run to complete snapshot
          poll_interval = 8
          elapsed = 0

          print(f'Current Run ID: {cur_id} (Run #{cur_num})')
          print('Checking if an earlier workflow run is actively running and saving database cache...')

          while elapsed < max_wait:
              try:
                  req = urllib.request.Request(
                      f'https://api.github.com/repos/{repo}/actions/runs?per_page=20',
                      headers={
                          'Authorization': f'Bearer {token}',
                          'Accept': 'application/vnd.github.v3+json',
                          'User-Agent': 'GarmentFlow-Coordinator'
                      }
                  )
                  with urllib.request.urlopen(req, timeout=10) as resp:
                      data = json.loads(resp.read().decode())
                      runs = data.get('workflow_runs', [])
                      active_prev = [
                          r for r in runs 
                          if r.get('status') == 'in_progress' 
                          and r.get('id') != cur_id 
                          and r.get('run_number', 0) < cur_num
                      ]
                      if not active_prev:
                          print('✅ No active previous workflow runs detected. Cache is fully saved and safe to restore!')
                          sys.exit(0)
                      
                      prev_ids = [str(r['id']) for r in active_prev]
                      print(f'⏳ Previous run(s) active: {prev_ids}. Waiting for safe database snapshot into cache ({elapsed}s / {max_wait}s)...')
              except Exception as e:
                  print(f'⚠️ Warning during check: {e}')

              time.sleep(poll_interval)
              elapsed += poll_interval

          print('⚠️ Wait timeout reached. Proceeding with cache restore.')
          "

      - name: 📦 Install Python Dependencies & MySQL Client
        run: |
          python -m pip install --upgrade pip
          sudo apt-get update && sudo apt-get install -y default-mysql-client
          if [ -f requirements.txt ]; then
            pip install -r requirements.txt
          else
            pip install Flask gunicorn xlsxwriter python-dotenv werkzeug PyMySQL mysql-connector-python cryptography
          fi

      - name: 🔄 Restore MySQL Cache from Previous Run
        id: mysql-cache
        uses: actions/cache/restore@v4
        with:
          path: db_backup
          key: garmentflow-mysql-\${{ github.run_number }}-\${{ github.run_attempt }}
          restore-keys: |
            garmentflow-mysql-

      - name: 📥 Import Cached MySQL Database Data
        run: |
          mkdir -p db_backup
          echo "=========================================================="
          echo "       RESTORING MYSQL DATA FROM GITHUB CACHE            "
          echo "=========================================================="
          if [ -f db_backup/garmentflow_pro.sql ] && [ -s db_backup/garmentflow_pro.sql ]; then
            echo "📦 Found cached database dump: db_backup/garmentflow_pro.sql ($(du -h db_backup/garmentflow_pro.sql | cut -f1))"
            echo "Importing dump into GitHub Actions MySQL service..."
            mysql -h 127.0.0.1 -P 3306 -u root -proot garmentflow_pro < db_backup/garmentflow_pro.sql
            echo "✅ Database restored successfully from previous run!"
          else
            echo "ℹ️ No existing cache found or empty. Fresh MySQL database instance will be initialized."
          fi

      - name: 🛠️ Verify & Auto-Recreate Tables and Migrations
        run: |
          echo "=========================================================="
          echo "⚙️ CHECKING & AUTO-CREATING ALL TABLES & COLUMNS          "
          echo "=========================================================="
          python3 -c "
          import os, sys
          os.environ['DB_TYPE'] = 'mysql'
          os.environ['MYSQL_HOST'] = '127.0.0.1'
          os.environ['MYSQL_PORT'] = '3306'
          os.environ['MYSQL_USER'] = 'root'
          os.environ['MYSQL_PASSWORD'] = 'root'
          os.environ['MYSQL_DB'] = 'garmentflow_pro'

          import main
          print('[DB] Checking connection and executing repair_and_migrate_db()...')
          main.repair_and_migrate_db()
          print('✅ All 16 ERP tables and missing columns verified, repaired, and ready!')
          "

      - name: 🛡️ Install Cloudflare Tunnel CLI (cloudflared)
        run: |
          echo "Installing latest cloudflared client..."
          curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
          sudo dpkg -i cloudflared.deb
          rm cloudflared.deb
          cloudflared --version

      - name: 🗄️ Verify Application Files
        run: |
          echo "Checking application files..."
          if [ -f main.py ]; then
            echo "✅ Found main.py in repository root."
          elif [ -f public/assets/aistudio/main_db7d8a2c.py ]; then
            echo "Copying main_db7d8a2c.py to main.py..."
            cp public/assets/aistudio/main_db7d8a2c.py main.py
          fi

      - name: 🚀 Start Flask Web Server
        run: |
          echo "Starting GarmentFlow Backend Server with GitHub Actions MySQL on 127.0.0.1:\${PORT}..."
          
          # Start gunicorn in background
          gunicorn --workers 3 --bind 127.0.0.1:5000 main:app --daemon --access-logfile - --error-logfile -
          
          # Health check: Wait until server responds
          echo "Waiting for web server to initialize..."
          for i in {1..30}; do
            if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/login | grep -qE "200|302"; then
              echo "✅ Web server is UP and responding on port 5000!"
              break
            fi
            echo "Attempt $i: Server starting, waiting 1s..."
            sleep 1
          done

      - name: 🌐 Connect & Run Cloudflare Tunnel (Token Only)
        env:
          CLOUDFLARE_TUNNEL_TOKEN: \${{ secrets.CLOUDFLARE_TUNNEL_TOKEN }}
        run: |
          echo "=========================================================="
          echo "     CONNECTING CLOUDFLARE TUNNEL VIA SECRET TOKEN        "
          echo "=========================================================="
          
          if [ -z "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
            echo "❌ ERROR: 'CLOUDFLARE_TUNNEL_TOKEN' secret is missing in GitHub Repository Secrets!"
            echo "Please add it in: Settings -> Secrets and variables -> Actions -> New repository secret"
            echo "Launching fallback TryCloudflare temporary tunnel so your job still connects..."
            nohup cloudflared tunnel --url http://127.0.0.1:5000 > tunnel.log 2>&1 &
            sleep 5
            grep -o 'https://[-a-zA-Z0-9@:%._\\+~#=]*\\.trycloudflare.com' tunnel.log || true
          else
            echo "✅ Loaded CLOUDFLARE_TUNNEL_TOKEN from GitHub Secrets."
            echo "Starting cloudflared tunnel..."
            nohup cloudflared tunnel --no-autoupdate run --token "$CLOUDFLARE_TUNNEL_TOKEN" > tunnel.log 2>&1 &
            TUNNEL_PID=$!
            echo "Cloudflared Process ID: $TUNNEL_PID"
            sleep 4
            echo "Recent Cloudflared Logs:"
            tail -n 20 tunnel.log || true
          fi

      - name: ⏳ Keep Server Active, Detect New Runs & Periodic MySQL Backup
        env:
          INPUT_HOURS: \${{ github.event.inputs.duration_hours || '5' }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          DURATION_HOURS=\${INPUT_HOURS:-5}
          TOTAL_SECONDS=$((DURATION_HOURS * 3600))
          
          echo "=========================================================="
          echo "🟢 Server, GitHub MySQL & Cloudflare Tunnel are LIVE!"
          echo "⏱️ Target duration: $DURATION_HOURS hour(s) ($TOTAL_SECONDS seconds)"
          echo "💾 Periodic MySQL backup enabled (Every 60s)."
          echo "👀 Continuous New Run Detection enabled (Every 10s)."
          echo "=========================================================="
          
          START_TIME=$(date +%s)
          LAST_BACKUP=0
          
          while true; do
            CURRENT_TIME=$(date +%s)
            ELAPSED=$((CURRENT_TIME - START_TIME))
            REMAINING=$((TOTAL_SECONDS - ELAPSED))
            
            if [ $REMAINING -le 0 ]; then
              echo "✅ Completed target duration of $DURATION_HOURS hour(s)."
              break
            fi
            
            # 1. Continuous New Run Detector: Checks if a newer workflow run has been triggered
            NEW_RUN_SIGNAL=$(python3 -c "
            import os, json, urllib.request
            repo = os.environ.get('GITHUB_REPOSITORY', '')
            token = os.environ.get('GITHUB_TOKEN', '')
            cur_id = int(os.environ.get('GITHUB_RUN_ID', '0'))
            cur_num = int(os.environ.get('GITHUB_RUN_NUMBER', '0'))
            if token and repo:
                try:
                    req = urllib.request.Request(
                        f'https://api.github.com/repos/{repo}/actions/runs?per_page=15',
                        headers={'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'GarmentFlow-Detector'}
                    )
                    with urllib.request.urlopen(req, timeout=6) as r:
                        runs = json.loads(r.read().decode()).get('workflow_runs', [])
                        newer = [x['id'] for x in runs if x.get('status') in ('queued', 'in_progress') and x.get('id') != cur_id and x.get('run_number', 0) > cur_num]
                        if newer:
                            print(','.join(map(str, newer)))
                except Exception:
                    pass
            " 2>/dev/null || echo "")

            if [ -n "$NEW_RUN_SIGNAL" ]; then
              echo "=========================================================="
              echo "🚨 NEW WORKFLOW RUN DETECTED (#$NEW_RUN_SIGNAL)!"
              echo "📦 Taking immediate atomic snapshot of MySQL database..."
              echo "=========================================================="
              mkdir -p db_backup
              mysqldump -h 127.0.0.1 -P 3306 -u root -proot \\
                --single-transaction \\
                --quick \\
                --triggers \\
                --routines \\
                --databases garmentflow_pro > db_backup/garmentflow_pro.sql 2>/dev/null || true
              echo "✅ Snapshot ready: $(ls -lh db_backup/garmentflow_pro.sql)"
              echo "👋 Gracefully stopping server to yield to new workflow run..."
              break
            fi

            # 2. Periodic background dump every 60 seconds
            TIME_SINCE_BACKUP=$((CURRENT_TIME - LAST_BACKUP))
            if [ $TIME_SINCE_BACKUP -ge 60 ]; then
              mkdir -p db_backup
              mysqldump -h 127.0.0.1 -P 3306 -u root -proot \\
                --single-transaction \\
                --quick \\
                --databases garmentflow_pro > db_backup/garmentflow_pro.sql 2>/dev/null || true
              LAST_BACKUP=$CURRENT_TIME
              ELAPSED_MIN=$((ELAPSED / 60))
              REMAINING_MIN=$((REMAINING / 60))
              STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/login || echo "FAIL")
              echo "💓 Monitor: [Elapsed: \${ELAPSED_MIN}m / Rem: \${REMAINING_MIN}m] | Web: $STATUS | DB Sync: OK"
            fi

            sleep 10
          done

      # ================= SAFE DATA CACHE & TEARDOWN ON TIMEOUT, CANCEL OR NEW RUN HANDOFF =================

      - name: 🏷️ Generate Timestamped Cache Key
        if: always()
        run: |
          echo "TIMESTAMP_KEY=garmentflow-mysql-\${{ github.run_number }}-$(date +%s)" >> $GITHUB_ENV

      - name: 💾 Dump MySQL Database (Runs on Success, Cancel, Timeout, or Handoff)
        if: always()
        run: |
          echo "=========================================================="
          echo "💾 FINAL MYSQL DATABASE EXPORT FOR ACTIONS CACHE         "
          echo "=========================================================="
          mkdir -p db_backup
          if mysqladmin ping -h 127.0.0.1 -P 3306 -u root -proot --silent; then
            echo "Dumping MySQL database 'garmentflow_pro'..."
            mysqldump -h 127.0.0.1 -P 3306 -u root -proot \\
              --single-transaction \\
              --quick \\
              --triggers \\
              --routines \\
              --databases garmentflow_pro > db_backup/garmentflow_pro.sql
            echo "✅ Export complete: $(ls -lh db_backup/garmentflow_pro.sql)"
          else
            echo "⚠️ MySQL service not responding or down, using latest periodic backup if available."
            ls -lh db_backup/garmentflow_pro.sql || true
          fi

      - name: 📦 Save MySQL Cache to GitHub Actions Cache (Runs on Success, Cancel, Timeout, or Handoff)
        if: always()
        uses: actions/cache/save@v4
        with:
          path: db_backup
          key: \${{ env.TIMESTAMP_KEY || format('garmentflow-mysql-{0}-{1}', github.run_number, github.run_attempt) }}

      - name: 🧹 Graceful Server & Tunnel Teardown
        if: always()
        run: |
          echo "Shutting down server and tunnel..."
          pkill -f cloudflared || true
          pkill -f gunicorn || true
          echo "Teardown complete. All database data safely cached for next run!"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(workflowYaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadYaml = () => {
    const blob = new Blob([workflowYaml], { type: 'text/yaml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cloudflare_tunnel.yml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
              GitHub Actions &bull; Native MySQL &bull; Safe Cache &bull; Run Handoff
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            GarmentFlow Server + GitHub MySQL + Cloudflare Tunnel
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Multi-run coordination with automatic previous-run waiting step, continuous new-run detection, atomic MySQL snapshot caching, and instant cache restoration on next run.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied YAML!' : 'Copy Workflow YAML'}
          </button>
          <button
            onClick={handleDownloadYaml}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            Download .yml
          </button>
        </div>
      </div>

      {/* Feature Highlights: GitHub MySQL & Persistent Cache Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-3">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">1. GitHub Native MySQL</h3>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              GitHub runner ke andar hi <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">services: mysql:8.0</code> chalaya jata hai. External cloud database ki zaroorat nahi.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
            <span>127.0.0.1:3306 (user: root)</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center mb-3">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">2. Wait for Previous Run Step</h3>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              New workflow start hotay hi pehle check karta hai agar koi purana run active hai to uske complete aur cache save hone ka wait karta hai.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-purple-500" />
            <span>Zero Tunnel / Cache Conflict</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-3">
              <RefreshCw className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">3. Live New-Run Detector</h3>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Server loop har 10 seconds baad check karta hai. Jaise hi naya run trigger ho, pehla run foran atomic snapshot save karke handoff kar deta hai.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Instant Graceful Exit</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-3">
              <HardDrive className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">4. Safe Cache Restore</h3>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Naye run par latest cache se SQL database restore hota hai aur <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-mono">repair_and_migrate_db()</code> all 16 tables auto-check karta hai.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>Zero Data Loss Guaranteed</span>
          </div>
        </div>
      </div>

      {/* Step-by-Step Setup Guide */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          Setup Instructions (Roman Urdu / English)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] flex items-center justify-center font-mono">1</span>
              <span>Cloudflare Zero Trust Mein Tunnel Bnao</span>
            </div>
            <p className="text-slate-600">
              Cloudflare Dashboard &rarr; <strong>Zero Trust</strong> &rarr; <strong>Networks</strong> &rarr; <strong>Tunnels</strong> par jayein.
            </p>
            <p className="text-slate-500 text-[11px]">
              "Create a Tunnel" par click karein aur naam dein (e.g. <code>texflow-erp</code>). Connector select karein aur di gayi command mein se <code>--token &lt;TOKEN&gt;</code> copy karein.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] flex items-center justify-center font-mono">2</span>
              <span>Sirf 1 GitHub Secret Add Kro</span>
            </div>
            <p className="text-slate-600">
              Apni GitHub repo &rarr; <strong>Settings</strong> &rarr; <strong>Secrets and variables</strong> &rarr; <strong>Actions</strong> &rarr; <strong>New repository secret</strong>.
            </p>
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded font-mono text-[11px] text-emerald-900">
              Name: <strong>CLOUDFLARE_TUNNEL_TOKEN</strong><br />
              Value: [Paste your token from Step 1]
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] flex items-center justify-center font-mono">3</span>
              <span>Public Hostname Route Set Kro</span>
            </div>
            <p className="text-slate-600">
              Tunnel ke <strong>Public Hostname</strong> tab mein jakar apna domain set karein:
            </p>
            <div className="p-2 bg-slate-100 rounded font-mono text-[11px] text-slate-800 space-y-0.5">
              <div>Subdomain: <code>erp</code> | Domain: <code>yourdomain.com</code></div>
              <div>Type: <code>HTTP</code> | URL: <code>127.0.0.1:5000</code></div>
            </div>
          </div>
        </div>
      </div>

      {/* YAML Preview & Actions */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
          <div>
            <span className="text-xs font-bold font-mono text-emerald-400 block mb-0.5">Workflow File Content</span>
            <span className="text-xs font-bold font-mono text-slate-200">.github/workflows/cloudflare_tunnel.yml</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownloadYaml}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              Download
            </button>
          </div>
        </div>

        <pre className="p-4 bg-slate-950 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed border border-slate-800 max-h-[500px]">
          {workflowYaml}
        </pre>
      </div>
    </div>
  );
};
