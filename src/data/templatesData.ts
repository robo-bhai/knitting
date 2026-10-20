export interface JinjaTemplateFile {
  path: string;
  title: string;
  route: string;
  description: string;
  flaskContext: string[];
  code: string;
}

export const JINJA_TEMPLATES: JinjaTemplateFile[] = [
  {
    path: "templates/base.html",
    title: "Base Master Template (base.html)",
    route: "Inherited by all templates",
    description: "Master responsive layout with Tailwind CSS CDN, mobile navigation, Flask flash messages block, active user session badges, and role-based links.",
    flaskContext: ["session.user", "session.role", "get_flashed_messages()"],
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{% block title %}TexFlow Industrial Garment ERP{% endblock %}</title>
  <!-- Tailwind CSS & Lucide Icons CDN for immediate production rendering -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    @media print {
      .no-print { display: none !important; }
      body { background: white !important; color: black !important; }
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col font-sans antialiased">
  <!-- Top Navigation Bar -->
  <header class="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 no-print">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <a href="{{ url_for('index') }}" class="flex items-center gap-2 font-black text-sm tracking-tight text-white hover:text-emerald-400 transition-colors">
          <i class="fa-solid fa-industry text-emerald-400"></i>
          <span>TEXFLOW <span class="text-emerald-400 font-mono text-xs font-normal">ERP</span></span>
        </a>
      </div>

      <div class="flex items-center gap-4 text-xs">
        {% if session.get('user') %}
          <div class="hidden sm:flex items-center gap-2">
            <span class="text-slate-400">Station:</span>
            <span class="font-bold font-mono text-white">{{ session.get('user') }}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 border border-slate-700">
              {{ session.get('role', 'clerk') }}
            </span>
          </div>
          <a href="{{ url_for('logout') }}" class="px-3 py-1 bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-300 rounded font-medium transition-colors">
            <i class="fa-solid fa-right-from-bracket mr-1"></i> Logout
          </a>
        {% else %}
          <a href="{{ url_for('login') }}" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium">
            Login
          </a>
        {% endif %}
      </div>
    </div>
  </header>

  <!-- Sub-Navigation Bar for Industrial Modules -->
  {% if session.get('user') %}
  <nav class="bg-white border-b border-slate-200 no-print overflow-x-auto shadow-2xs">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 py-1.5 text-xs font-medium whitespace-nowrap">
      <a href="{{ url_for('index') }}" class="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-700">Dashboard</a>
      {% if session.get('role') in ['admin', 'manager'] %}
        <a href="{{ url_for('ppc') }}" class="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-700">PPC Tree</a>
      {% endif %}
      <a href="{{ url_for('machine_sign') }}" class="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-700">Machine Sign</a>
      <a href="{{ url_for('roll_entry') }}" class="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-700">Roll Entry</a>
      <a href="{{ url_for('roll_wise') }}" class="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-700">Roll-Wise</a>
      <a href="{{ url_for('roll_quality') }}" class="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-700">Roll Quality</a>
      <a href="{{ url_for('fabric_store') }}" class="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-700">Fabric Store</a>
      <a href="{{ url_for('plan_status') }}" class="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-700">Plan Status</a>
      <a href="{{ url_for('dispatch_management') }}" class="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-700">Dispatch</a>
      {% if session.get('role') in ['admin', 'manager'] %}
        <a href="{{ url_for('hr_staff_directory') }}" class="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-700">HR Staff</a>
      {% endif %}
      {% if session.get('role') in ['admin', 'manager', 'incharge'] %}
        <a href="{{ url_for('hr_attendance') }}" class="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-700">Attendance</a>
      {% endif %}
      {% if session.get('role') == 'admin' %}
        <a href="{{ url_for('hr_payroll') }}" class="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-700">Payroll</a>
        <a href="{{ url_for('admin_dashboard') }}" class="px-3 py-1.5 rounded bg-rose-50 text-rose-800 font-bold border border-rose-200">Admin Control</a>
      {% endif %}
      <a href="{{ url_for('reports_menu') }}" class="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-700">Reports</a>
    </div>
  </nav>
  {% endif %}

  <!-- Flash Messages Block -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 pt-4 w-full no-print">
    {% with messages = get_flashed_messages(with_categories=true) %}
      {% if messages %}
        {% for category, message in messages %}
          <div class="p-3.5 mb-3 rounded-lg text-xs font-semibold flex items-center justify-between shadow-xs border
            {% if category == 'danger' %} bg-rose-50 text-rose-800 border-rose-300
            {% elif category == 'success' %} bg-emerald-50 text-emerald-800 border-emerald-300
            {% elif category == 'warning' %} bg-amber-50 text-amber-800 border-amber-300
            {% else %} bg-slate-900 text-white border-slate-700 {% endif %}">
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-circle-info"></i>
              <span>{{ message }}</span>
            </div>
            <button onclick="this.parentElement.remove()" class="text-current opacity-70 hover:opacity-100">&times;</button>
          </div>
        {% endfor %}
      {% endif %}
    {% endwith %}
  </div>

  <!-- Page Content Block -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
    {% block content %}{% endblock %}
  </main>

  <footer class="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print">
    <p>&copy; {{ now.year if now else 2026 }} TexFlow Industrial Management ERP &bull; Production System</p>
  </footer>

  <script>
    lucide.createIcons();
  </script>
  {% block scripts %}{% endblock %}
</body>
</html>`
  },
  {
    path: "templates/index.html",
    title: "Dashboard (index.html)",
    route: "/",
    description: "Main dashboard displaying real KPI metrics (total_rolls, total_weight, active_plans, dispatched) and the 5 most recent fabric rolls table.",
    flaskContext: ["stats: dict", "recent: list of rows", "now: datetime"],
    code: `{% extends "base.html" %}
{% block title %}Mill Dashboard | TexFlow ERP{% endblock %}

{% block content %}
<div class="space-y-6">
  <!-- Top Welcome Banner -->
  <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
    <div>
      <div class="flex items-center gap-2 mb-1">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">Mill Live Production Monitoring</span>
      </div>
      <h1 class="text-xl font-bold tracking-tight text-white">Manufacturing Operations & PPC Portal</h1>
      <p class="text-xs text-slate-400 mt-1">Real-time status synchronized with SQLite database.</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <a href="{{ url_for('roll_entry') }}" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors">
        <i class="fa-solid fa-plus mr-1"></i> New Roll Entry
      </a>
      <a href="{{ url_for('machine_sign') }}" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors">
        <i class="fa-solid fa-microchip text-amber-400 mr-1"></i> Machine Sign-In
      </a>
    </div>
  </div>

  <!-- KPI Cards -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      <span class="text-xs font-medium text-slate-500 uppercase tracking-wider block">Total Rolls Produced</span>
      <div class="text-2xl font-bold font-mono text-slate-900 mt-2">{{ stats.total_rolls }}</div>
      <span class="text-[11px] text-emerald-600 font-medium mt-1 block"><i class="fa-solid fa-arrow-trend-up"></i> Live in factory</span>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      <span class="text-xs font-medium text-slate-500 uppercase tracking-wider block">Total Fabric Produced</span>
      <div class="text-2xl font-bold font-mono text-slate-900 mt-2">{{ "%.2f"|format(stats.total_weight) }} <span class="text-sm font-normal text-slate-500">KG</span></div>
      <span class="text-[11px] text-slate-500 mt-1 block">Net produced weight</span>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      <span class="text-xs font-medium text-slate-500 uppercase tracking-wider block">Active Production Plans</span>
      <div class="text-2xl font-bold font-mono text-slate-900 mt-2">{{ stats.active_plans }}</div>
      <span class="text-[11px] text-indigo-600 mt-1 block">Scheduled PPC plans</span>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      <span class="text-xs font-medium text-slate-500 uppercase tracking-wider block">Bags Dispatched</span>
      <div class="text-2xl font-bold font-mono text-slate-900 mt-2">{{ stats.dispatched }}</div>
      <span class="text-[11px] text-amber-700 mt-1 block">Outward shipments</span>
    </div>
  </div>

  <!-- Recent Rolls Activity Table -->
  <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
    <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
      <h2 class="font-bold text-sm text-slate-900"><i class="fa-regular fa-clock mr-1.5 text-slate-500"></i> Recent Fabric Rolls (Last 5 Entries)</h2>
      <a href="{{ url_for('roll_wise') }}" class="text-xs font-medium text-emerald-600 hover:text-emerald-700">View All Rolls &rarr;</a>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[10px] tracking-wider">
          <tr>
            <th class="py-2.5 px-4">Roll Barcode</th>
            <th class="py-2.5 px-4">Lot Name</th>
            <th class="py-2.5 px-4">Weight (KG)</th>
            <th class="py-2.5 px-4">Machine</th>
            <th class="py-2.5 px-4">Created Time</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {% for r in recent %}
          <tr class="hover:bg-slate-50/70 transition-colors">
            <td class="py-2.5 px-4 font-mono font-bold text-slate-900">{{ r['roll_barcode'] or '-' }}</td>
            <td class="py-2.5 px-4 font-medium text-slate-700">{{ r['lot_name'] }}</td>
            <td class="py-2.5 px-4 font-mono font-semibold text-slate-900">{{ "%.2f"|format(r['weight']) }} KG</td>
            <td class="py-2.5 px-4 font-mono"><span class="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{{ r['machine_no'] or 'M-01' }}</span></td>
            <td class="py-2.5 px-4 text-slate-500 font-mono text-[11px]">{{ r['created_at'] }}</td>
          </tr>
          {% else %}
          <tr>
            <td colspan="5" class="py-6 text-center text-slate-400">No recent rolls found.</td>
          </tr>
          {% endfor %}
        </tbody>
      </table>
    </div>
  </div>
</div>
{% endblock %}`
  },
  {
    path: "templates/login.html",
    title: "Login Authentication (login.html)",
    route: "/login",
    description: "Responsive login portal with station ID input, password field, and role assignment hints (c1234, i1234, m1234, admin).",
    flaskContext: ["get_flashed_messages()"],
    code: `{% extends "base.html" %}
{% block title %}Station Sign-In | TexFlow ERP{% endblock %}

{% block content %}
<div class="min-h-[75vh] flex items-center justify-center py-8">
  <div class="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
    <div class="bg-slate-900 p-6 text-white text-center">
      <div class="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
        <i class="fa-solid fa-industry text-xl"></i>
      </div>
      <h1 class="text-xl font-black uppercase tracking-tight">TEXFLOW INDUSTRIAL ERP</h1>
      <p class="text-xs text-slate-400 mt-1">Manufacturing & Garment Management System</p>
    </div>

    <div class="p-6">
      <h2 class="font-bold text-sm text-slate-900 mb-1">Sign In to Your Station</h2>
      <p class="text-xs text-slate-500 mb-4">Role-based security access control</p>

      <form action="{{ url_for('login') }}" method="POST" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Username / Station Code</label>
          <input type="text" name="username" required placeholder="e.g. c1234, i1234, m1234, admin"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden">
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Password</label>
          <input type="password" name="password" required placeholder="••••••••"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden">
        </div>

        <button type="submit" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm mt-2">
          Sign In to Station
        </button>
      </form>

      <div class="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
        <span class="text-[10px] uppercase font-bold text-slate-400 block mb-2">Default Pre-Seeded Accounts:</span>
        <div class="grid grid-cols-2 gap-1 text-[11px] font-mono text-left bg-slate-50 p-2.5 rounded border border-slate-200">
          <div><strong class="text-slate-800">Clerk:</strong> c1234 / cp1234</div>
          <div><strong class="text-slate-800">Incharge:</strong> i1234 / ip1234</div>
          <div><strong class="text-slate-800">Manager:</strong> m1234 / mp1234</div>
          <div><strong class="text-slate-800">Admin:</strong> admin / admin123</div>
        </div>
      </div>
    </div>
  </div>
</div>
{% endblock %}`
  },
  {
    path: "templates/ppc_tree.html",
    title: "PPC Tree & Lots (ppc_tree.html)",
    route: "/ppc",
    description: "Hierarchical Tree view of Work Orders -> Plans -> Bags -> Lots with stable plan weights, remaining balances, and lot target updates.",
    flaskContext: ["work_orders: list with nested plans, bags, lots"],
    code: `{% extends "base.html" %}
{% block title %}PPC Tree Hierarchy | TexFlow ERP{% endblock %}

{% block content %}
<div class="space-y-6">
  <!-- Header & Add WO Action -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
    <div>
      <h1 class="text-lg font-bold text-slate-900">Production Planning & Control (PPC Tree)</h1>
      <p class="text-xs text-slate-500 mt-1">Work Orders &rarr; Plans &rarr; Bags &rarr; Fabric Lots with dynamic weight balances.</p>
    </div>

    <!-- Quick Add Work Order Form -->
    <form action="{{ url_for('add_work_order') }}" method="POST" class="flex items-center gap-2">
      <input type="text" name="work_order" required placeholder="New WO (e.g. WO-2026-901)"
        class="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden">
      <button type="submit" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm">
        + Add WO
      </button>
    </form>
  </div>

  <!-- Tree View -->
  <div class="space-y-4">
    {% for wo in work_orders %}
    <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <!-- WO Level -->
      <div class="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">Work Order</span>
          <span class="font-bold text-sm tracking-wide">{{ wo['work_order'] }}</span>
        </div>

        <div class="flex items-center gap-2">
          <!-- Add Plan Form Inline -->
          <form action="{{ url_for('add_plan', work_order_id=wo['id']) }}" method="POST" class="flex items-center gap-1">
            <input type="text" name="plan_id" required placeholder="Plan ID" class="px-2 py-1 text-slate-900 rounded text-xs font-mono">
            <button type="submit" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold">+ Plan</button>
          </form>
          <a href="{{ url_for('delete_work_order', id=wo['id']) }}" onclick="return confirm('Delete Work Order?')" class="p-1.5 text-slate-400 hover:text-rose-400">
            <i class="fa-solid fa-trash-can"></i>
          </a>
        </div>
      </div>

      <!-- Plans Level -->
      <div class="p-4 space-y-4 bg-slate-50/50">
        {% for plan in wo['plans'] %}
        <div class="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div class="bg-slate-100 px-4 py-2 flex items-center justify-between border-b border-slate-200">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">Plan</span>
              <span class="font-bold text-xs text-slate-900 font-mono">{{ plan['plan_id'] }}</span>
            </div>
            <div class="flex items-center gap-2">
              <a href="{{ url_for('new_bag', plan_id=plan['id']) }}" class="px-2 py-0.5 bg-white border border-slate-300 hover:bg-slate-50 rounded text-xs text-slate-700 font-medium">
                + Add Bag
              </a>
              <a href="{{ url_for('delete_plan', id=plan['id']) }}" onclick="return confirm('Delete Plan?')" class="text-slate-400 hover:text-rose-600">
                <i class="fa-solid fa-trash-can text-xs"></i>
              </a>
            </div>
          </div>

          <!-- Bags Level -->
          <div class="p-3 space-y-3">
            {% for bag in plan['bags'] %}
            <div class="border border-slate-200 rounded-lg bg-slate-50/40 p-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-2 border-b border-slate-200 gap-2">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">Bag</span>
                  <span class="font-bold text-xs text-slate-900 font-mono">{{ bag['bag_number'] }}</span>
                  <span class="text-xs text-slate-600">Shade: <strong>{{ bag['shade'] }}</strong></span>
                </div>
                <div class="flex items-center gap-2">
                  <a href="{{ url_for('new_lot', bag_id=bag['id']) }}" class="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded text-xs font-semibold">
                    + Add Lot
                  </a>
                  <a href="{{ url_for('delete_bag', id=bag['id']) }}" onclick="return confirm('Delete Bag?')" class="text-slate-400 hover:text-rose-600">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                  </a>
                </div>
              </div>

              <!-- Lots Table Level -->
              <div class="overflow-x-auto bg-white rounded border border-slate-200">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-100 text-slate-600 text-[10px] uppercase font-semibold">
                    <tr>
                      <th class="py-2 px-3">Lot Name</th>
                      <th class="py-2 px-3">Needles</th>
                      <th class="py-2 px-3">Job #</th>
                      <th class="py-2 px-3">Plan Target</th>
                      <th class="py-2 px-3">Remaining Balance</th>
                      <th class="py-2 px-3">Length</th>
                      <th class="py-2 px-3 text-right">Quick Update Qty</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    {% for lot in bag['lots'] %}
                    <tr class="hover:bg-slate-50">
                      <td class="py-2 px-3 font-bold font-mono text-slate-900">{{ lot['lot_name'] }}</td>
                      <td class="py-2 px-3 font-mono">{{ lot['needles'] }}</td>
                      <td class="py-2 px-3 font-mono">Job #{{ lot['job_id'] }}</td>
                      <td class="py-2 px-3 font-mono">{{ lot['plan_weight'] or lot['fabric_weight'] }} KG</td>
                      <td class="py-2 px-3 font-mono font-bold {% if lot['fabric_weight'] <= 0 %}text-slate-400{% else %}text-emerald-700{% endif %}">
                        {{ lot['fabric_weight'] }} KG
                      </td>
                      <td class="py-2 px-3 font-mono text-slate-500">{{ lot['fabric_length'] }}m</td>
                      <td class="py-2 px-3 text-right">
                        <!-- Form for /ppc/lot/update-qty/<id> -->
                        <form action="{{ url_for('update_lot_qty', id=lot['id']) }}" method="POST" class="inline-flex items-center gap-1">
                          <input type="number" step="0.1" name="new_weight" value="{{ lot['plan_weight'] or lot['fabric_weight'] }}" class="w-20 px-1.5 py-0.5 border rounded text-xs font-mono font-bold">
                          <button type="submit" class="px-2 py-0.5 bg-slate-900 text-white rounded text-[11px]">Sync</button>
                        </form>
                      </td>
                    </tr>
                    {% else %}
                    <tr>
                      <td colspan="7" class="py-3 text-center text-slate-400">No lots added. Click "+ Add Lot".</td>
                    </tr>
                    {% endfor %}
                  </tbody>
                </table>
              </div>
            </div>
            {% else %}
            <p class="text-center text-xs text-slate-400 py-2">No bags in this plan.</p>
            {% endfor %}
          </div>
        </div>
        {% else %}
        <p class="text-center text-xs text-slate-400 py-2">No plans under this Work Order.</p>
        {% endfor %}
      </div>
    </div>
    {% endfor %}
  </div>
</div>
{% endblock %}`
  },
  {
    path: "templates/machine_sign.html",
    title: "Machine Sign-In (machine_sign.html)",
    route: "/machine-sign",
    description: "Machine Sign-In module generating 5-digit unique code, cascading Work Order -> Shade -> Job selection, and sign-out records.",
    flaskContext: ["work_orders: list"],
    code: `{% extends "base.html" %}
{% block title %}Machine Sign-In & 5-Digit Barcode Generator | TexFlow ERP{% endblock %}

{% block content %}
<div class="space-y-6">
  <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
    <h1 class="text-lg font-bold text-slate-900">Knitting Machine Sign-In (/machine-sign)</h1>
    <p class="text-xs text-slate-500 mt-1">Assigns machine to a Job ID and generates a unique 5-digit code scanned during Roll Entry.</p>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Form -->
    <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <h2 class="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100">Sign-In Form</h2>
      <form action="{{ url_for('machine_sign') }}" method="POST" class="space-y-3.5">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Work Order</label>
          <select id="wo_select" name="work_order" required class="w-full px-3 py-2 border rounded-lg text-xs font-mono bg-white">
            <option value="">-- Choose Work Order --</option>
            {% for wo in work_orders %}
              <option value="{{ wo['work_order'] }}">{{ wo['work_order'] }}</option>
            {% endfor %}
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Fabric Shade</label>
          <select id="shade_select" required class="w-full px-3 py-2 border rounded-lg text-xs bg-white">
            <option value="">-- Choose Shade --</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Job ID</label>
          <select id="job_select" required class="w-full px-3 py-2 border rounded-lg text-xs font-mono bg-white">
            <option value="">-- Job --</option>
          </select>
          <input type="hidden" name="job_text" id="job_text_input">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Needles Spec</label>
            <input type="text" name="needles" id="needles_input" required class="w-full px-3 py-2 border rounded-lg text-xs font-mono uppercase bg-slate-50">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Machine No</label>
            <input type="text" name="machine" required placeholder="e.g. M-01" class="w-full px-3 py-2 border rounded-lg text-xs font-mono uppercase">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Knitting Unit</label>
          <input type="number" name="unit" value="1" required class="w-full px-3 py-2 border rounded-lg text-xs font-mono">
        </div>

        <button type="submit" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider">
          Generate 5-Digit Unique Barcode
        </button>
      </form>
    </div>

    <!-- Live Machines Table -->
    <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <h2 class="font-bold text-sm text-slate-900 mb-3 pb-2 border-b border-slate-100">Signed Machines for Work Order</h2>
      <div id="machines_container" class="overflow-x-auto text-xs text-slate-500">
        Select a Work Order above to fetch real-time assigned machines via /api/assignments-by-wo.
      </div>
    </div>
  </div>
</div>
{% endblock %}

{% block scripts %}
<script>
  const woSelect = document.getElementById('wo_select');
  const shadeSelect = document.getElementById('shade_select');
  const jobSelect = document.getElementById('job_select');
  const jobTextInput = document.getElementById('job_text_input');
  const needlesInput = document.getElementById('needles_input');
  const machinesContainer = document.getElementById('machines_container');

  woSelect.addEventListener('change', async function() {
    const wo = this.value;
    if (!wo) return;

    // 1. Fetch shades
    const res = await fetch('/api/shades-by-wo/' + encodeURIComponent(wo));
    const shades = await res.json();
    shadeSelect.innerHTML = '<option value="">-- Choose Shade --</option>';
    shades.forEach(s => shadeSelect.innerHTML += \`<option value="\${s}">\${s}</option>\`);

    // 2. Fetch assigned machines
    const mRes = await fetch('/api/assignments-by-wo/' + encodeURIComponent(wo));
    const assignments = await mRes.json();
    renderAssignments(assignments);
  });

  shadeSelect.addEventListener('change', async function() {
    const wo = woSelect.value;
    const shade = this.value;
    if (!wo || !shade) return;

    const res = await fetch(\`/api/jobs-by-shade/\${encodeURIComponent(wo)}/\${encodeURIComponent(shade)}\`);
    const jobs = await res.json();
    jobSelect.innerHTML = '<option value="">-- Job --</option>';
    jobs.forEach(j => {
      jobSelect.innerHTML += \`<option value="\${j.job}" data-needles="\${j.needles_ref}">Job #\${j.job} (\${j.needles_ref})</option>\`;
    });
  });

  jobSelect.addEventListener('change', function() {
    const selected = this.options[this.selectedIndex];
    const jobId = this.value;
    const wo = woSelect.value;
    if (jobId && wo) {
      jobTextInput.value = \`\${jobId}/\${wo}\`;
      needlesInput.value = selected.getAttribute('data-needles') || '';
    }
  });

  function renderAssignments(list) {
    if (list.length === 0) {
      machinesContainer.innerHTML = '<p class="p-4 text-center text-slate-400">No machines signed in for this Work Order.</p>';
      return;
    }
    let html = '<table class="w-full text-left text-xs"><thead class="bg-slate-50 uppercase text-[10px] border-b"><tr><th class="p-2">Code</th><th class="p-2">Machine</th><th class="p-2">Job</th><th class="p-2">Needles</th><th class="p-2 text-right">Action</th></tr></thead><tbody class="divide-y">';
    list.forEach(m => {
      html += \`<tr class="hover:bg-slate-50"><td class="p-2 font-mono font-bold text-emerald-700 bg-emerald-50">\${m.unique_code}</td><td class="p-2 font-bold">\${m.machine_no} (Unit \${m.unit_no})</td><td class="p-2 font-mono">\${m.job_full_text}</td><td class="p-2 font-mono">\${m.needles}</td><td class="p-2 text-right"><a href="/machine-sign/delete/\${m.id}" class="text-rose-600 hover:underline">Sign-Out</a></td></tr>\`;
    });
    html += '</tbody></table>';
    machinesContainer.innerHTML = html;
  }
</script>
{% endblock %}`
  },
  {
    path: "templates/roll_entry_select.html",
    title: "Roll Entry & Label Print (roll_entry_select.html)",
    route: "/roll-entry",
    description: "Cascading Work Order -> Plan -> Bag -> Lot selection with Fetch API, machine barcode validation, and roll ticket generation.",
    flaskContext: ["work_orders: list"],
    code: `{% extends "base.html" %}
{% block title %}Roll Entry Station | TexFlow ERP{% endblock %}

{% block content %}
<div class="space-y-6">
  <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
    <h1 class="text-lg font-bold text-slate-900">Knitting Roll Entry Station (/roll-entry)</h1>
    <p class="text-xs text-slate-500 mt-1">Select PPC parameters, validate machine barcodes, and record roll weight with automatic lot balance deduction.</p>
  </div>

  <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">1. Work Order</label>
        <select id="wo_select" class="w-full px-3 py-2 border rounded-lg text-xs font-mono bg-white">
          <option value="">-- Choose Work Order --</option>
          {% for wo in work_orders %}
            <option value="{{ wo }}">{{ wo }}</option>
          {% endfor %}
        </select>
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">2. Production Plan</label>
        <select id="plan_select" disabled class="w-full px-3 py-2 border rounded-lg text-xs font-mono bg-white disabled:bg-slate-100">
          <option value="">-- Choose Plan --</option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">3. Bag (Shade)</label>
        <select id="bag_select" disabled class="w-full px-3 py-2 border rounded-lg text-xs font-mono bg-white disabled:bg-slate-100">
          <option value="">-- Choose Bag --</option>
        </select>
      </div>
    </div>

    <!-- Lots Container -->
    <div id="lots_container" class="mt-6 pt-4 border-t border-slate-100 hidden">
      <h3 class="text-xs font-bold uppercase text-slate-800 mb-2">Select Target Lot for this Roll:</h3>
      <div id="lots_grid" class="grid grid-cols-1 sm:grid-cols-3 gap-3"></div>
    </div>
  </div>

  <!-- Roll Entry Form -->
  <div id="roll_form_card" class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hidden">
    <h2 class="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100">Record Fabric Roll Weight</h2>
    <div id="error_box" class="p-3 mb-3 bg-rose-50 border border-rose-300 rounded text-xs text-rose-800 hidden"></div>

    <form id="save_roll_form" class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Machine Barcode (5-Digit) *</label>
          <input type="text" id="machine_barcode" required placeholder="Scan barcode..." class="w-full px-3 py-2 border rounded-lg text-xs font-mono font-bold uppercase">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Needles Spec</label>
          <input type="text" id="needles_input" readonly class="w-full px-3 py-2 border rounded-lg text-xs font-mono uppercase bg-slate-50">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Roll Weight (KG) *</label>
          <input type="number" step="0.01" id="weight_input" required placeholder="22.50" class="w-full px-3 py-2 border rounded-lg text-xs font-mono font-bold text-slate-900">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Tube No</label>
          <input type="text" id="tube_input" value="T-101" class="w-full px-3 py-2 border rounded-lg text-xs font-mono uppercase">
        </div>
      </div>

      <div class="flex justify-end pt-2">
        <button type="submit" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider">
          Save Roll & Generate Barcode
        </button>
      </div>
    </form>
  </div>
</div>
{% endblock %}

{% block scripts %}
<script>
  let currentWo = '', currentPlan = '', currentBag = '', currentLot = '', currentNeedles = '';

  const woSelect = document.getElementById('wo_select');
  const planSelect = document.getElementById('plan_select');
  const bagSelect = document.getElementById('bag_select');
  const lotsContainer = document.getElementById('lots_container');
  const lotsGrid = document.getElementById('lots_grid');
  const rollFormCard = document.getElementById('roll_form_card');

  woSelect.addEventListener('change', async function() {
    currentWo = this.value;
    planSelect.innerHTML = '<option value="">-- Choose Plan --</option>';
    bagSelect.innerHTML = '<option value="">-- Choose Bag --</option>';
    lotsContainer.classList.add('hidden');
    rollFormCard.classList.add('hidden');
    if (!currentWo) return;

    const res = await fetch('/api/plans/' + encodeURIComponent(currentWo));
    const plans = await res.json();
    plans.forEach(p => planSelect.innerHTML += \`<option value="\${p}">\${p}</option>\`);
    planSelect.disabled = false;
  });

  planSelect.addEventListener('change', async function() {
    currentPlan = this.value;
    bagSelect.innerHTML = '<option value="">-- Choose Bag --</option>';
    lotsContainer.classList.add('hidden');
    rollFormCard.classList.add('hidden');
    if (!currentPlan) return;

    const res = await fetch('/api/bags/' + encodeURIComponent(currentPlan));
    const bags = await res.json();
    bags.forEach(b => bagSelect.innerHTML += \`<option value="\${b}">\${b}</option>\`);
    bagSelect.disabled = false;
  });

  bagSelect.addEventListener('change', async function() {
    currentBag = this.value;
    if (!currentBag) return;

    const res = await fetch('/api/lots/' + encodeURIComponent(currentBag));
    const lots = await res.json();
    lotsGrid.innerHTML = '';
    lots.forEach(lot => {
      const card = document.createElement('div');
      card.className = 'p-3 rounded-lg border border-slate-200 hover:border-emerald-500 cursor-pointer bg-slate-50 hover:bg-white';
      card.innerHTML = \`<div class="flex justify-between font-bold text-xs"><span>\${lot.lot_name}</span><span>\${lot.needles}</span></div><div class="mt-2 text-xs font-mono">Bal: <strong>\${lot.rem_weight.toFixed(1)} KG</strong></div>\`;
      card.onclick = () => {
        currentLot = lot.lot_name;
        currentNeedles = lot.needles;
        document.getElementById('needles_input').value = lot.needles;
        if (lot.barcode) document.getElementById('machine_barcode').value = lot.barcode;
        rollFormCard.classList.remove('hidden');
      };
      lotsGrid.appendChild(card);
    });
    lotsContainer.classList.remove('hidden');
  });

  document.getElementById('save_roll_form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const barcode = document.getElementById('machine_barcode').value;
    const weight = document.getElementById('weight_input').value;
    const tube = document.getElementById('tube_input').value;

    const payload = {
      work_order: currentWo,
      plan_id: currentPlan,
      bag_number: currentBag,
      lot_name: currentLot,
      needles: currentNeedles,
      weight: parseFloat(weight),
      barcode: barcode,
      tube_no: tube
    };

    const res = await fetch('/api/save-roll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) {
      document.getElementById('error_box').innerText = data.message;
      document.getElementById('error_box').classList.remove('hidden');
    } else {
      alert(\`Roll Saved Successfully! Generated Barcode: \${data.sticker_data.roll_barcode}\`);
      window.location.reload();
    }
  });
</script>
{% endblock %}`
  },
  {
    path: "templates/roll_wise.html",
    title: "Roll-Wise Production Tracking (roll_wise.html)",
    route: "/roll-wise",
    description: "Filters by Work Order, Shade, Job, with roll weights, quality inspection results, and locked edit/delete checks for finalized bags.",
    flaskContext: ["results: list of rolls", "stats: dict", "work_orders: list", "selected_wo", "selected_shade", "selected_job"],
    code: `{% extends "base.html" %}
{% block title %}Roll-Wise Production Tracking | TexFlow ERP{% endblock %}

{% block content %}
<div class="space-y-6">
  <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
    <h1 class="text-lg font-bold text-slate-900">Roll-Wise Production Tracking (/roll-wise)</h1>
    <p class="text-xs text-slate-500 mt-1">Roll weight adjustment with automatic lot balance updates. Locked when parent bag is Finalized or Dispatched.</p>
  </div>

  <!-- Filter Form -->
  <form method="GET" action="{{ url_for('roll_wise') }}" class="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Work Order</label>
        <select name="work_order" onchange="this.form.submit()" class="w-full px-3 py-2 border rounded-lg text-xs font-mono bg-white">
          <option value="">-- Choose Work Order --</option>
          {% for w in work_orders %}
            <option value="{{ w['work_order'] }}" {% if selected_wo == w['work_order'] %}selected{% endif %}>{{ w['work_order'] }}</option>
          {% endfor %}
        </select>
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Fabric Shade</label>
        <input type="text" name="shade" value="{{ selected_shade }}" placeholder="e.g. Navy Blue" class="w-full px-3 py-2 border rounded-lg text-xs">
      </div>

      <div class="flex items-end gap-2">
        <div class="flex-1">
          <label class="block text-xs font-semibold text-slate-700 mb-1">Job ID</label>
          <input type="number" name="job" value="{{ selected_job }}" placeholder="e.g. 1" class="w-full px-3 py-2 border rounded-lg text-xs font-mono">
        </div>
        <button type="submit" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold">Filter</button>
      </div>
    </div>

    {% if stats %}
    <div class="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100 text-center text-xs">
      <div class="bg-slate-50 p-2.5 rounded border"><span class="text-slate-500 block">Planned</span><strong>{{ "%.2f"|format(stats.planned) }} KG</strong></div>
      <div class="bg-emerald-50 p-2.5 rounded border"><span class="text-emerald-700 block">Produced</span><strong>{{ "%.2f"|format(stats.produced) }} KG</strong></div>
      <div class="bg-amber-50 p-2.5 rounded border"><span class="text-amber-800 block">Balance</span><strong>{{ "%.2f"|format(stats.balance) }} KG</strong></div>
    </div>
    {% endif %}
  </form>

  <!-- Rolls Table -->
  <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b">
          <tr>
            <th class="py-2.5 px-3">Roll #</th>
            <th class="py-2.5 px-3">Barcode</th>
            <th class="py-2.5 px-3">Needles</th>
            <th class="py-2.5 px-3">Machine</th>
            <th class="py-2.5 px-3">Bag #</th>
            <th class="py-2.5 px-3">PW (Produced)</th>
            <th class="py-2.5 px-3">QW (Quality)</th>
            <th class="py-2.5 px-3">Bag Status</th>
            <th class="py-2.5 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {% for r in results %}
          <tr class="hover:bg-slate-50">
            <td class="py-2.5 px-3 font-mono font-bold">#{{ r['roll_no'] }}</td>
            <td class="py-2.5 px-3 font-mono">{{ r['roll_barcode'] }}</td>
            <td class="py-2.5 px-3 font-mono">{{ r['needles'] }}</td>
            <td class="py-2.5 px-3 font-mono">{{ r['machine_no'] }}</td>
            <td class="py-2.5 px-3 font-mono">{{ r['bag_number'] }}</td>
            <td class="py-2.5 px-3 font-mono font-bold text-slate-900">{{ "%.2f"|format(r['weight']) }} KG</td>
            <td class="py-2.5 px-3 font-mono text-emerald-700 font-bold">
              {% if r['qw'] %}{{ "%.2f"|format(r['qw']) }} KG{% else %}<span class="text-slate-400 font-normal">Pending</span>{% endif %}
            </td>
            <td class="py-2.5 px-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase {% if r['bag_status'] in ['Finalized', 'Dispatched'] %}bg-rose-100 text-rose-900{% else %}bg-slate-100 text-slate-700{% endif %}">
                {{ r['bag_status'] }}
              </span>
            </td>
            <td class="py-2.5 px-3 text-right">
              {% if r['bag_status'] in ['Finalized', 'Dispatched'] %}
                <span class="text-slate-400 text-[11px]"><i class="fa-solid fa-lock"></i> Locked</span>
              {% else %}
                <form action="{{ url_for('edit_roll', roll_id=r['id']) }}" method="POST" class="inline-flex items-center gap-1">
                  <input type="number" step="0.1" name="weight" value="{{ r['weight'] }}" class="w-16 px-1 py-0.5 border rounded text-xs font-mono">
                  <button type="submit" class="px-2 py-0.5 bg-slate-900 text-white rounded text-[11px]">Edit</button>
                </form>
                <form action="{{ url_for('delete_roll', roll_id=r['id']) }}" method="POST" class="inline" onsubmit="return confirm('Delete Roll and restore weight?')">
                  <button type="submit" class="p-1 text-rose-600 hover:text-rose-800"><i class="fa-solid fa-trash-can"></i></button>
                </form>
              {% endif %}
            </td>
          </tr>
          {% else %}
          <tr>
            <td colspan="9" class="p-8 text-center text-slate-400">Select filter criteria above to display roll records.</td>
          </tr>
          {% endfor %}
        </tbody>
      </table>
    </div>
  </div>
</div>
{% endblock %}`
  },
  {
    path: "templates/roll_quality.html",
    title: "Quality Control (roll_quality.html)",
    route: "/roll-quality",
    description: "Quality inspection module supporting Grade-A / Grade-B weight segregation, Quarry search mode, and balance restoration.",
    flaskContext: ["get_flashed_messages()"],
    code: `{% extends "base.html" %}
{% block title %}Roll Quality Inspection | TexFlow ERP{% endblock %}

{% block content %}
<div class="space-y-6">
  <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
    <h1 class="text-lg font-bold text-slate-900">Fabric Roll Quality Inspection (/roll-quality)</h1>
    <p class="text-xs text-slate-500 mt-1">Grade-A vs Grade-B fabric inspection. B-Grade weight is automatically restored to the Lot balance.</p>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Inspection Scan Card -->
    <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <h2 class="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100">Scan Roll Barcode</h2>

      <form id="qc_form" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Roll Barcode (7-Digit) *</label>
          <input type="text" id="roll_id_input" required placeholder="Scan or enter roll barcode..."
            class="w-full px-3 py-2 border rounded-lg text-xs font-mono font-bold tracking-wider uppercase">
        </div>

        <div class="flex items-center gap-4 py-1">
          <label class="flex items-center gap-2 cursor-pointer text-xs">
            <input type="checkbox" id="quarry_mode" class="rounded text-indigo-600">
            <span class="font-semibold text-slate-700">Quarry (Search) Mode</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer text-xs">
            <input type="checkbox" id="same_weight" checked class="rounded text-emerald-600">
            <span class="font-semibold text-slate-700">Same Weight (100% Grade-A)</span>
          </label>
        </div>

        <div id="manual_weight_group" class="hidden">
          <label class="block text-xs font-semibold text-slate-700 mb-1">Manual Grade-A Weight (KG)</label>
          <input type="number" step="0.01" id="manual_weight" placeholder="e.g. 21.0" class="w-full px-3 py-2 border rounded-lg text-xs font-mono font-bold">
          <span class="text-[10px] text-amber-700 mt-1 block">Difference will be restored to Lot Balance.</span>
        </div>

        <button type="submit" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider">
          Verify & Inspect Roll
        </button>
      </form>
    </div>

    <!-- Live Sticker / Inspection Result Card -->
    <div id="sticker_card" class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hidden">
      <h2 class="font-bold text-sm text-slate-900 mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
        <span>Inspection Sticker Result</span>
        <button onclick="window.print()" class="text-xs text-emerald-600 hover:underline"><i class="fa-solid fa-print"></i> Print</button>
      </h2>
      <div id="sticker_content" class="bg-slate-50 p-4 rounded border font-mono text-xs space-y-1"></div>
    </div>
  </div>
</div>
{% endblock %}

{% block scripts %}
<script>
  const sameWeightCheckbox = document.getElementById('same_weight');
  const manualWeightGroup = document.getElementById('manual_weight_group');
  const quarryModeCheckbox = document.getElementById('quarry_mode');

  sameWeightCheckbox.addEventListener('change', function() {
    if (this.checked) {
      manualWeightGroup.classList.add('hidden');
    } else {
      manualWeightGroup.classList.remove('hidden');
    }
  });

  document.getElementById('qc_form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const barcode = document.getElementById('roll_id_input').value;
    const isQuarry = quarryModeCheckbox.checked;
    const sameWeight = sameWeightCheckbox.checked;
    const manualWeight = document.getElementById('manual_weight').value;

    const formData = new FormData();
    formData.append('roll_id', barcode);
    if (isQuarry) formData.append('quarry_mode', 'on');
    if (sameWeight) formData.append('same_weight', 'yes');
    formData.append('manual_weight', manualWeight);

    const res = await fetch('/roll-quality', { method: 'POST', body: formData });
    const data = await res.json();

    if (!data.success) {
      alert(data.message);
    } else {
      const s = data.sticker;
      document.getElementById('sticker_content').innerHTML = \`
        <div class="border-b pb-2 mb-2"><strong>TEXFLOW QUALITY CERTIFIED</strong><br>Roll Barcode: \${s.barcode}</div>
        <div>Bag: \${s.bag} | Lot: \${s.lot}</div>
        <div>Needles: \${s.needles} | Shade: \${s.shade}</div>
        <div>Produced Wt (PW): \${s.pw} KG</div>
        <div class="text-emerald-700 font-bold text-sm mt-1">Grade-A Wt (QW): \${s.qw} KG</div>
      \`;
      document.getElementById('sticker_card').classList.remove('hidden');
    }
  });
</script>
{% endblock %}`
  },
  {
    path: "templates/dispatch.html",
    title: "Dispatch & Outward Records (dispatch.html)",
    route: "/dispatch",
    description: "Dispatch management with verification that bag is finalized, vehicle assignment, and direct gate pass printing.",
    flaskContext: ["available_bags: list", "history: list of dispatch records"],
    code: `{% extends "base.html" %}
{% block title %}Dispatch Management | TexFlow ERP{% endblock %}

{% block content %}
<div class="space-y-6">
  <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
    <h1 class="text-lg font-bold text-slate-900">Dispatch Management & Gate Pass Generation (/dispatch)</h1>
    <p class="text-xs text-slate-500 mt-1">Dispatch finalized bags, assign vehicle/driver details, and issue official Outward Gate Passes.</p>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Form -->
    <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <h2 class="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100">Dispatch Finalized Bag</h2>
      <form action="{{ url_for('dispatch_management') }}" method="POST" class="space-y-3.5">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Select Finalized Bag *</label>
          <select name="bag_number" required class="w-full px-3 py-2 border rounded-lg text-xs font-mono font-bold bg-white">
            <option value="">-- Choose Bag --</option>
            {% for b in available_bags %}
              <option value="{{ b['bag_number'] }}">{{ b['bag_number'] }} ({{ b['total_rolls'] }} rolls &bull; {{ b['total_weight'] }} KG)</option>
            {% endfor %}
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Customer / Consignee Name *</label>
          <input type="text" name="customer" required placeholder="e.g. Sapphire Finishing Mills" class="w-full px-3 py-2 border rounded-lg text-xs">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Vehicle Number *</label>
            <input type="text" name="vehicle" required placeholder="LES-4819" class="w-full px-3 py-2 border rounded-lg text-xs font-mono uppercase">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Driver Name *</label>
            <input type="text" name="driver" required placeholder="Kashif Raza" class="w-full px-3 py-2 border rounded-lg text-xs">
          </div>
        </div>

        <button type="submit" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider">
          Confirm Dispatch & Issue Gate Pass
        </button>
      </form>
    </div>

    <!-- History -->
    <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <h2 class="font-bold text-sm text-slate-900 mb-3 pb-2 border-b border-slate-100">Recent Dispatches (Last 15)</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b">
            <tr>
              <th class="py-2 px-3">Gate Pass #</th>
              <th class="py-2 px-3">Bag #</th>
              <th class="py-2 px-3">Customer</th>
              <th class="py-2 px-3">Vehicle</th>
              <th class="py-2 px-3">Weight (KG)</th>
              <th class="py-2 px-3 text-right">Gate Pass</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {% for d in history %}
            <tr class="hover:bg-slate-50">
              <td class="py-2.5 px-3 font-mono font-bold">{{ d['gate_pass_no'] }}</td>
              <td class="py-2.5 px-3 font-mono">{{ d['bag_number'] }}</td>
              <td class="py-2.5 px-3 font-medium text-slate-900">{{ d['customer_name'] }}</td>
              <td class="py-2.5 px-3 font-mono">{{ d['vehicle_no'] }}</td>
              <td class="py-2.5 px-3 font-mono font-bold">{{ d['total_weight'] }} KG</td>
              <td class="py-2.5 px-3 text-right">
                <a href="{{ url_for('print_gate_pass', bag_no=d['bag_number']) }}" target="_blank" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-[11px]">
                  <i class="fa-solid fa-print"></i> Print
                </a>
              </td>
            </tr>
            {% endfor %}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
{% endblock %}`
  },
  {
    path: "templates/gate_pass_pdf.html",
    title: "Official Gate Pass PDF Template (gate_pass_pdf.html)",
    route: "/print-gate-pass/<bag_no>",
    description: "Print-ready Gate Pass with official company letterhead, vehicle/driver info, rolls grouped by lot with weights, and security signatures.",
    flaskContext: ["d: dispatch record", "rolls: list of fabric rolls joined with quality checks"],
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Gate Pass #{{ d['gate_pass_no'] }} | TexFlow</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      .no-print { display: none !important; }
      body { background: white !important; }
    }
  </style>
</head>
<body class="bg-slate-100 text-slate-900 p-6 font-sans">
  <div class="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-300">
    <!-- Action Bar -->
    <div class="flex justify-between items-center mb-6 pb-4 border-b no-print">
      <span class="text-xs text-slate-500 font-mono">Official Outward Gate Pass Document</span>
      <button onclick="window.print()" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold uppercase tracking-wider">
        Print Gate Pass
      </button>
    </div>

    <!-- Letterhead -->
    <div class="border-b-2 border-black pb-4 mb-6">
      <div class="flex justify-between items-start">
        <div>
          <h1 class="text-2xl font-black uppercase tracking-tight">TEXFLOW TEXTILE INDUSTRIES LTD.</h1>
          <p class="text-xs text-slate-600">Plot 12-B, Industrial Estate, Manga Mandi, Lahore</p>
          <p class="text-[11px] text-slate-500">Phone: +92 42 3591-8800 | Email: dispatch@texflowindustries.com</p>
        </div>
        <div class="text-right border-2 border-black p-2 rounded">
          <span class="block text-[10px] uppercase font-bold text-slate-600">Official</span>
          <span class="text-sm font-black uppercase">OUTWARD GATE PASS</span>
          <span class="block font-mono font-bold text-xs">{{ d['gate_pass_no'] }}</span>
        </div>
      </div>
    </div>

    <!-- Meta Grid -->
    <div class="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded border mb-6 text-xs">
      <div>
        <p><span class="text-slate-500 font-medium">Consignee:</span> <strong>{{ d['customer_name'] }}</strong></p>
        <p><span class="text-slate-500 font-medium">Bag Number:</span> <strong class="font-mono">{{ d['bag_number'] }}</strong></p>
      </div>
      <div>
        <p><span class="text-slate-500 font-medium">Vehicle No:</span> <strong class="font-mono uppercase">{{ d['vehicle_no'] }}</strong></p>
        <p><span class="text-slate-500 font-medium">Driver Name:</span> <strong>{{ d['driver_name'] }}</strong></p>
        <p><span class="text-slate-500 font-medium">Dispatched At:</span> {{ d['dispatched_at'] }}</p>
      </div>
    </div>

    <!-- Rolls Table -->
    <div class="mb-6">
      <h3 class="font-bold text-xs uppercase mb-2">Itemized Roll Breakdown</h3>
      <table class="w-full text-left text-xs border border-slate-300">
        <thead class="bg-slate-100 border-b border-slate-300 font-semibold uppercase text-[10px]">
          <tr>
            <th class="p-2">Roll #</th>
            <th class="p-2">Lot Name</th>
            <th class="p-2">Barcode</th>
            <th class="p-2">Needles</th>
            <th class="p-2 text-right">Net Weight (KG)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          {% for r in rolls %}
          <tr>
            <td class="p-2 font-mono font-bold">#{{ r['roll_no'] }}</td>
            <td class="p-2 font-mono">{{ r['lot_name'] }}</td>
            <td class="p-2 font-mono">{{ r['roll_barcode'] }}</td>
            <td class="p-2 font-mono">{{ r['needles'] }}</td>
            <td class="p-2 font-mono font-bold text-right">{{ "%.2f"|format(r['grade_a_weight']) }} KG</td>
          </tr>
          {% endfor %}
        </tbody>
      </table>
    </div>

    <!-- Summary Box -->
    <div class="flex justify-end mb-12">
      <div class="w-64 bg-slate-50 border border-slate-300 p-3 rounded text-xs space-y-1">
        <div class="flex justify-between"><span>Total Rolls:</span><strong>{{ d['total_rolls'] }} Rolls</strong></div>
        <div class="flex justify-between font-bold border-t pt-1"><span>Total Weight:</span><strong class="font-mono text-sm">{{ d['total_weight'] }} KG</strong></div>
      </div>
    </div>

    <!-- Signatures -->
    <div class="grid grid-cols-4 gap-4 text-center text-[10px] text-slate-600 pt-6 border-t border-slate-300">
      <div><div class="border-b h-10 mb-1"></div><strong>Prepared By</strong><br>{{ d['dispatched_by'] }}</div>
      <div><div class="border-b h-10 mb-1"></div><strong>Store Incharge</strong><br>Verified</div>
      <div><div class="border-b h-10 mb-1"></div><strong>Driver Signature</strong><br>Received</div>
      <div><div class="border-b h-10 mb-1"></div><strong>Security Officer</strong><br>Gate Out Clear</div>
    </div>
  </div>
</body>
</html>`
  },
  {
    path: "templates/hr/staff.html",
    title: "HR Staff Directory (hr/staff.html)",
    route: "/hr/staff",
    description: "Employee directory with department/role tracking (PPC, Lot Making, Fabric Store; Helper, Clerk, Incharge), salary, and ledger links.",
    flaskContext: ["staff: list of staff rows"],
    code: `{% extends "base.html" %}
{% block title %}Staff Directory | TexFlow ERP{% endblock %}

{% block content %}
<div class="space-y-6">
  <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h1 class="text-lg font-bold text-slate-900">Staff Personnel Directory (/hr/staff)</h1>
      <p class="text-xs text-slate-500 mt-1">Manage personnel across PPC, Lot Making, and Fabric Store departments with salary & ledger tracking.</p>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Register Form -->
    <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <h2 class="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100">Add / Update Staff Member</h2>
      <form action="{{ url_for('hr_staff_directory') }}" method="POST" class="space-y-3.5">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Emp Code *</label>
          <input type="text" name="emp_code" required placeholder="e.g. TF-101" class="w-full px-3 py-2 border rounded-lg text-xs font-mono uppercase">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
          <input type="text" name="name" required placeholder="Employee Name" class="w-full px-3 py-2 border rounded-lg text-xs">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
            <select name="dept" required class="w-full px-3 py-2 border rounded-lg text-xs bg-white">
              <option value="PPC">PPC</option>
              <option value="Lot Making">Lot Making</option>
              <option value="Fabric Store">Fabric Store</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Sub-Role *</label>
            <select name="role" required class="w-full px-3 py-2 border rounded-lg text-xs bg-white">
              <option value="Helper">Helper</option>
              <option value="Clerk">Clerk</option>
              <option value="Incharge">Incharge</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">CNIC *</label>
            <input type="text" name="cnic" required placeholder="35201-XXXXXXX-X" class="w-full px-3 py-2 border rounded-lg text-xs font-mono">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
            <input type="text" name="phone" required placeholder="0300-XXXXXXX" class="w-full px-3 py-2 border rounded-lg text-xs font-mono">
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Monthly Salary (Rs.) *</label>
          <input type="number" name="salary" required placeholder="45000" class="w-full px-3 py-2 border rounded-lg text-xs font-mono font-bold">
        </div>
        <button type="submit" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider">
          Save Personnel Record
        </button>
      </form>
    </div>

    <!-- Staff Table -->
    <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <h2 class="font-bold text-sm text-slate-900 mb-3 pb-2 border-b border-slate-100">Personnel Directory</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b">
            <tr>
              <th class="py-2.5 px-3">Emp Code</th>
              <th class="py-2.5 px-3">Name</th>
              <th class="py-2.5 px-3">Department</th>
              <th class="py-2.5 px-3">Role</th>
              <th class="py-2.5 px-3">Salary</th>
              <th class="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {% for s in staff %}
            <tr class="hover:bg-slate-50">
              <td class="py-2.5 px-3 font-mono font-bold">{{ s['emp_code'] }}</td>
              <td class="py-2.5 px-3 font-bold text-slate-900">{{ s['name'] }}</td>
              <td class="py-2.5 px-3"><span class="bg-slate-100 px-2 py-0.5 rounded font-medium">{{ s['department'] }}</span></td>
              <td class="py-2.5 px-3 text-slate-700">{{ s['sub_role'] }}</td>
              <td class="py-2.5 px-3 font-mono font-bold">Rs. {{ s['salary'] }}</td>
              <td class="py-2.5 px-3 text-right space-x-1">
                <a href="{{ url_for('hr_ledger', staff_id=s['id']) }}" class="px-2 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded font-semibold text-[11px]">Ledger</a>
                <a href="{{ url_for('hr_profile', staff_id=s['id']) }}" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-[11px]">Profile</a>
              </td>
            </tr>
            {% endfor %}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
{% endblock %}`
  },
  {
    path: "templates/hr/payroll_report.html",
    title: "Monthly Payroll Report (hr/payroll_report.html)",
    route: "/hr/payroll",
    description: "Payroll report calculating daily rate, worked days, deducting advances/fines, and generating net payable salaries.",
    flaskContext: ["report: list of staff payroll dicts", "month: str"],
    code: `{% extends "base.html" %}
{% block title %}Monthly Payroll Report | TexFlow ERP{% endblock %}

{% block content %}
<div class="space-y-6">
  <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
    <div>
      <h1 class="text-lg font-bold text-slate-900">Monthly Payroll Report (/hr/payroll)</h1>
      <p class="text-xs text-slate-500 mt-1">Formula: (Salary / 30) &times; Present Days &minus; Advances &minus; Fines.</p>
    </div>
    <button onclick="window.print()" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold">
      <i class="fa-solid fa-print mr-1"></i> Print Sheet
    </button>
  </div>

  <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b">
          <tr>
            <th class="py-2.5 px-4">Staff Member</th>
            <th class="py-2.5 px-4">Department</th>
            <th class="py-2.5 px-4 text-right">Base Salary</th>
            <th class="py-2.5 px-4 text-center">Present Days</th>
            <th class="py-2.5 px-4 text-right">Advances</th>
            <th class="py-2.5 px-4 text-right font-bold text-slate-900">Net Payable</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {% for r in report %}
          <tr class="hover:bg-slate-50">
            <td class="py-3 px-4 font-bold text-slate-900">{{ r.name }}</td>
            <td class="py-3 px-4"><span class="bg-slate-100 px-2 py-0.5 rounded font-medium">{{ r.dept }}</span></td>
            <td class="py-3 px-4 font-mono text-right">Rs. {{ r.base }}</td>
            <td class="py-3 px-4 font-mono text-center font-bold">{{ r.present }} days</td>
            <td class="py-3 px-4 font-mono text-right text-amber-800">-Rs. {{ r.advances }}</td>
            <td class="py-3 px-4 font-mono text-right font-black text-sm text-emerald-800">Rs. {{ r.net }}</td>
          </tr>
          {% endfor %}
        </tbody>
      </table>
    </div>
  </div>
</div>
{% endblock %}`
  }
];
