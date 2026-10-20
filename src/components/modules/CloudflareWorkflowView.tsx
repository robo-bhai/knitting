import React, { useState } from 'react';
import {
  Cpu, Copy, Check, Shield, Globe, Terminal, ArrowRight,
  Clock, Key, Download, CheckCircle2, AlertCircle, ExternalLink
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

jobs:
  run-server-and-tunnel:
    name: Run Application & Cloudflare Tunnel
    runs-on: ubuntu-latest
    timeout-minutes: 360 # GitHub maximum limit is 360 minutes (6 hours)

    env:
      PORT: 5000
      SECRET_KEY: \${{ secrets.SECRET_KEY || 'production-secret-garmentflow-erp-token-9928' }}
      # Optional remote MySQL connection if configured in GitHub Secrets
      MYSQL_HOST: \${{ secrets.MYSQL_HOST }}
      MYSQL_PORT: \${{ secrets.MYSQL_PORT || '3306' }}
      MYSQL_USER: \${{ secrets.MYSQL_USER }}
      MYSQL_PASSWORD: \${{ secrets.MYSQL_PASSWORD }}
      MYSQL_DB: \${{ secrets.MYSQL_DB || 'garmentflow_pro' }}

    steps:
      - name: 📥 Checkout Repository
        uses: actions/checkout@v4

      - name: 🐍 Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - name: 📦 Install Python Dependencies
        run: |
          python -m pip install --upgrade pip
          if [ -f requirements.txt ]; then
            pip install -r requirements.txt
          else
            pip install Flask gunicorn xlsxwriter python-dotenv werkzeug PyMySQL mysql-connector-python cryptography
          fi

      - name: 🛡️ Install Cloudflare Tunnel CLI (cloudflared)
        run: |
          echo "Installing latest cloudflared client..."
          curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
          sudo dpkg -i cloudflared.deb
          rm cloudflared.deb
          cloudflared --version

      - name: 🗄️ Verify Database & Prepare Application
        run: |
          echo "Checking application files..."
          ls -la
          if [ -f main.py ]; then
            echo "Found main.py in repository root."
          elif [ -f public/assets/aistudio/main_db7d8a2c.py ]; then
            echo "Copying main_db7d8a2c.py to main.py..."
            cp public/assets/aistudio/main_db7d8a2c.py main.py
          fi

      - name: 🚀 Start Flask Web Server
        run: |
          echo "Starting GarmentFlow Backend Server on 127.0.0.1:\${PORT}..."
          
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

      - name: ⏳ Keep Server Active for 5 Hours
        env:
          INPUT_HOURS: \${{ github.event.inputs.duration_hours || '5' }}
        run: |
          DURATION_HOURS=\${INPUT_HOURS:-5}
          TOTAL_SECONDS=$((DURATION_HOURS * 3600))
          
          echo "=========================================================="
          echo "🟢 Server & Cloudflare Tunnel are LIVE on your domain!"
          echo "⏱️ Target duration: $DURATION_HOURS hour(s) ($TOTAL_SECONDS seconds)"
          echo "=========================================================="
          
          START_TIME=$(date +%s)
          INTERVAL=300 # Print heartbeat every 5 minutes
          
          while true; do
            CURRENT_TIME=$(date +%s)
            ELAPSED=$((CURRENT_TIME - START_TIME))
            REMAINING=$((TOTAL_SECONDS - ELAPSED))
            
            if [ $REMAINING -le 0 ]; then
              echo "✅ Completed target duration of $DURATION_HOURS hour(s)."
              break
            fi
            
            ELAPSED_MIN=$((ELAPSED / 60))
            REMAINING_MIN=$((REMAINING / 60))
            
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/login || echo "FAIL")
            echo "💓 Heartbeat: [Elapsed: \${ELAPSED_MIN}m / Remaining: \${REMAINING_MIN}m] | Local Server Status: HTTP $STATUS"
            
            SLEEP_TIME=$INTERVAL
            if [ $REMAINING -lt $INTERVAL ]; then
              SLEEP_TIME=$REMAINING
            fi
            sleep $SLEEP_TIME
          done

      - name: 🧹 Graceful Server & Tunnel Teardown
        if: always()
        run: |
          echo "Shutting down server and tunnel..."
          pkill -f cloudflared || true
          pkill -f gunicorn || true
          echo "Teardown complete."`;

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
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
              GitHub Actions & Cloudflare Tunnel
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            5-Hour Cloudflare Tunnel Workflow (.github/workflows)
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            A to Z production-ready workflow: installs all dependencies, starts Gunicorn WSGI server, connects Cloudflare Tunnel to your custom domain, and maintains a 5-hour continuous live session.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied YAML!' : 'Copy Workflow YAML'}
          </button>
          <button
            onClick={handleDownloadYaml}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-amber-400" />
            Download .yml
          </button>
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
              <span>Custom Domain Link Karein</span>
            </div>
            <p className="text-slate-600">
              Tunnel k andar <strong>Public Hostname</strong> tab par click karein.
            </p>
            <p className="text-slate-500 text-[11px]">
              Subdomain: <code>erp</code> (ya jo aap chahein) &bull; Domain: <code>apnidomain.com</code> &bull; Service Type: <code>HTTP</code> &bull; URL: <code>127.0.0.1:5000</code>.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] flex items-center justify-center font-mono">3</span>
              <span>GitHub Secrets Mein Save Karein</span>
            </div>
            <p className="text-slate-600">
              GitHub Repo &rarr; <strong>Settings</strong> &rarr; <strong>Secrets and variables</strong> &rarr; <strong>Actions</strong>.
            </p>
            <p className="text-slate-500 text-[11px]">
              "New repository secret" click karein: Name: <code className="text-emerald-700 font-bold">CLOUDFLARE_TUNNEL_TOKEN</code> aur value paste kar dein. Phir "Run workflow" par click karein!
            </p>
          </div>
        </div>
      </div>

      {/* Secret Keys Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-500" />
          GitHub Repository Secrets Mapping
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b">
              <tr>
                <th className="py-2.5 px-3">Secret Key Name</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Example Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-emerald-50/40">
                <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">CLOUDFLARE_TUNNEL_TOKEN</td>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">ONLY REQUIRED SECRET</span></td>
                <td className="py-2.5 px-3 text-slate-700 font-medium">Cloudflare Zero Trust connector token. Iss aik token se tunnel, account, aur custom domain sab khud hi bind ho jata hai.</td>
                <td className="py-2.5 px-3 font-mono text-slate-500">eyJhIjoiY2...</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-slate-800">SECRET_KEY</td>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">OPTIONAL</span></td>
                <td className="py-2.5 px-3 text-slate-600">Flask login session encryption key (default fallback already included)</td>
                <td className="py-2.5 px-3 font-mono text-slate-500">custom_key_123</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-slate-800">MYSQL_HOST</td>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">OPTIONAL</span></td>
                <td className="py-2.5 px-3 text-slate-600">Agar remote MySQL database use karna ho (agar na ho toh SQLite auto use hoga)</td>
                <td className="py-2.5 px-3 font-mono text-slate-500">db.mycloud.com</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Workflow Location</span>
            <span className="text-xs font-bold font-mono text-slate-900">.github/workflows/cloudflare_tunnel.yml</span>
          </div>
          <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 font-semibold">
            Ready for GitHub Actions
          </span>
        </div>

        <div className="bg-slate-950 text-slate-100 p-4 font-mono text-xs overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-800">
          <pre className="whitespace-pre">
            <code>{workflowYaml}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
