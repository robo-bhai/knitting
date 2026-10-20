"""
TexFlow Industrial Garment ERP - Backend System (GarmentFlow Pro)
Supports SQLite & MySQL Dual-Engine Architecture with Automatic Schema Repair
"""
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session, send_file
import os, sys, time, random, string, io
from datetime import datetime
from functools import wraps
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "garmentflow_secret_key_123_change_in_prod")

# ================= DATABASE CONFIGURATION & DUAL DRIVER =================
DB_TYPE = os.getenv("DB_TYPE", "mysql" if os.getenv("MYSQL_HOST") else "sqlite").lower()
MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DB = os.getenv("MYSQL_DB", "garmentflow_pro")
MYSQL_SSL = os.getenv("MYSQL_SSL", "false").lower() in ("true", "1", "yes")
SQLITE_DB = os.getenv("SQLITE_DB", "database.db")

# Optional MySQL Driver check
MYSQL_AVAILABLE = False
try:
    import pymysql
    import pymysql.cursors
    MYSQL_AVAILABLE = True
except ImportError:
    try:
        import mysql.connector
        MYSQL_AVAILABLE = True
    except ImportError:
        MYSQL_AVAILABLE = False

print(f"[DB] Target DB_TYPE: {DB_TYPE} (MySQL Driver Installed: {MYSQL_AVAILABLE})")

class MySQLCursorWrapper:
    """Translates '?' parameter syntax to '%s' for MySQL and provides dict row access"""
    def __init__(self, raw_cursor):
        self._cur = raw_cursor

    def execute(self, query, params=None):
        # Convert ? placeholders to %s
        q = query.replace('?', '%s')
        if params is not None:
            if isinstance(params, (list, tuple)):
                return self._cur.execute(q, params)
            else:
                return self._cur.execute(q, (params,))
        return self._cur.execute(q)

    def executemany(self, query, seq_of_params):
        q = query.replace('?', '%s')
        return self._cur.executemany(q, seq_of_params)

    def fetchone(self):
        row = self._cur.fetchone()
        return row

    def fetchall(self):
        return self._cur.fetchall()

    @property
    def rowcount(self):
        return self._cur.rowcount

    @property
    def lastrowid(self):
        return self._cur.lastrowid

    def close(self):
        self._cur.close()

class MySQLConnectionWrapper:
    def __init__(self, raw_conn):
        self._conn = raw_conn
        self.row_factory = None

    def cursor(self):
        return MySQLCursorWrapper(self._conn.cursor())

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()

def db():
    """Returns database connection based on environment configuration with SQLite fallback"""
    global DB_TYPE
    if DB_TYPE == "mysql" and MYSQL_AVAILABLE:
        try:
            # First attempt connection to MySQL
            if 'pymysql' in sys.modules:
                ssl_dict = {'ssl': {}} if MYSQL_SSL else {}
                conn = pymysql.connect(
                    host=MYSQL_HOST,
                    port=MYSQL_PORT,
                    user=MYSQL_USER,
                    password=MYSQL_PASSWORD,
                    database=MYSQL_DB,
                    charset='utf8mb4',
                    cursorclass=pymysql.cursors.DictCursor,
                    autocommit=False,
                    **ssl_dict
                )
                return MySQLConnectionWrapper(conn)
        except Exception as e:
            print(f"[DB WARNING] Failed to connect to MySQL ({e}). Falling back to SQLite.")

    # SQLite Connection Fallback
    import sqlite3
    con = sqlite3.connect(SQLITE_DB)
    con.row_factory = sqlite3.Row
    return con

# ================= AUTOMATIC SCHEMA REPAIR & MIGRATION =================
def repair_and_migrate_db():
    """
    Guarantees that all required tables and columns exist in both SQLite and MySQL.
    Fixes:
      - 'table lots has no column named plan_weight'
      - 'no such column: roll_barcode'
      - 'no such column: in_store'
      - 'table finalized_bags does not exist'
    """
    con = db()
    cur = con.cursor()
    is_mysql = (type(con).__name__ == "MySQLConnectionWrapper")

    auto_inc = "AUTO_INCREMENT" if is_mysql else "AUTOINCREMENT"
    text_type = "TEXT" if not is_mysql else "VARCHAR(255)"
    long_text = "TEXT"
    int_pk = "INTEGER PRIMARY KEY" if not is_mysql else "INT PRIMARY KEY"

    # 1. Base Tables Creation
    tables = [
        f"""CREATE TABLE IF NOT EXISTS hr_staff (
            id {int_pk} {auto_inc},
            emp_code {text_type} UNIQUE,
            name {text_type} NOT NULL,
            cnic {text_type} UNIQUE,
            phone {text_type},
            department {text_type},
            sub_role {text_type},
            salary REAL DEFAULT 0,
            address {long_text},
            emergency_name {text_type},
            emergency_phone {text_type},
            blood_group {text_type},
            joining_date {text_type},
            shift {text_type} DEFAULT 'Day',
            status {text_type} DEFAULT 'Active',
            joining_form_path {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS hr_ledger (
            id {int_pk} {auto_inc},
            staff_id INTEGER,
            amount REAL,
            type {text_type},
            description {long_text},
            date {text_type},
            created_by {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS hr_attendance (
            id {int_pk} {auto_inc},
            staff_id INTEGER,
            date {text_type},
            status {text_type},
            marked_by {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS work_orders (
            id {int_pk} {auto_inc},
            work_order {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS plans (
            id {int_pk} {auto_inc},
            work_order_id INTEGER,
            plan_id {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS bags (
            id {int_pk} {auto_inc},
            plan_id INTEGER,
            bag_number {text_type},
            shade {text_type},
            created_at {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS lots (
            id {int_pk} {auto_inc},
            bag_id INTEGER,
            lot_name {text_type},
            fabric_length REAL DEFAULT 0,
            fabric_weight REAL DEFAULT 0,
            plan_weight REAL DEFAULT 0,
            bag_weight REAL DEFAULT 0,
            needles {text_type},
            job_id INTEGER,
            remarks {long_text},
            created_at {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS jobs (
            id {int_pk} {auto_inc},
            job INTEGER,
            work_order_ref {text_type},
            shade_ref {text_type},
            needles_ref {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS fabric_rolls (
            id {int_pk} {auto_inc},
            work_order {text_type},
            plan_id {text_type},
            bag_number {text_type},
            lot_name {text_type},
            roll_no INTEGER,
            weight REAL,
            tube_no {text_type},
            needles {text_type},
            created_at {text_type},
            barcode_used {text_type},
            roll_barcode {text_type},
            machine_no {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS machine_assignments (
            id {int_pk} {auto_inc},
            job_full_text {text_type},
            needles {text_type},
            machine_no {text_type},
            unit_no INTEGER,
            unique_code {text_type} UNIQUE,
            created_at {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS quality_checks (
            id {int_pk} {auto_inc},
            roll_id {text_type} UNIQUE,
            original_weight REAL,
            grade_a_weight REAL,
            grade_b_weight REAL,
            in_store INTEGER DEFAULT 0,
            checked_at {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS finalized_bags (
            id {int_pk} {auto_inc},
            bag_number {text_type} UNIQUE,
            work_order {text_type},
            total_rolls INTEGER DEFAULT 0,
            total_weight REAL DEFAULT 0,
            status {text_type} DEFAULT 'Pending',
            created_at {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS dispatch_records (
            id {int_pk} {auto_inc},
            bag_number {text_type} UNIQUE,
            customer_name {text_type},
            vehicle_no {text_type},
            driver_name {text_type},
            gate_pass_no {text_type},
            total_rolls INTEGER DEFAULT 0,
            total_weight REAL DEFAULT 0,
            dispatched_at {text_type},
            dispatched_by {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS users (
            id {int_pk} {auto_inc},
            username {text_type} UNIQUE,
            password {text_type},
            role {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS rolls (
            id {int_pk} {auto_inc},
            order_no {text_type}, design {text_type}, color {text_type}, job {text_type}, machine {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS downtime (
            id {int_pk} {auto_inc},
            machine {text_type}, reason {text_type}, start {text_type}, end {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS yarn (
            id {int_pk} {auto_inc},
            yarn {text_type}, qty REAL, machine {text_type}, action {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS production (
            id {int_pk} {auto_inc},
            shift {text_type}, machine {text_type}, qty REAL
        )""",
        f"""CREATE TABLE IF NOT EXISTS faults (
            id {int_pk} {auto_inc},
            machine {text_type}, code {text_type}
        )""",
        f"""CREATE TABLE IF NOT EXISTS operators (
            id {int_pk} {auto_inc},
            name {text_type}, start REAL, end REAL, errors INTEGER
        )""",
        f"""CREATE TABLE IF NOT EXISTS samples (
            id {int_pk} {auto_inc},
            sample {text_type}, status {text_type}
        )"""
    ]

    for sql in tables:
        try:
            cur.execute(sql)
        except Exception as e:
            print(f"[DB AUTO-TABLE ERROR] {e}")

    con.commit()

    # 2. Alter Table Logic for Missing Columns
    def get_existing_columns(table_name):
        cols = set()
        try:
            if is_mysql:
                cur.execute(f"SHOW COLUMNS FROM {table_name}")
                rows = cur.fetchall()
                for r in rows:
                    cols.add(r['Field'].lower())
            else:
                cur.execute(f"PRAGMA table_info({table_name})")
                rows = cur.fetchall()
                for r in rows:
                    cols.add(r['name'].lower() if hasattr(r, 'keys') else r[1].lower())
        except Exception:
            pass
        return cols

    # Columns that might be missing in older SQLite/MySQL databases
    alterations = {
        'lots': [
            ('plan_weight', 'REAL DEFAULT 0'),
            ('fabric_weight', 'REAL DEFAULT 0'),
            ('bag_weight', 'REAL DEFAULT 0'),
            ('needles', f'{text_type}'),
            ('job_id', 'INTEGER'),
            ('remarks', f'{long_text}'),
            ('created_at', f'{text_type}')
        ],
        'fabric_rolls': [
            ('roll_barcode', f'{text_type}'),
            ('machine_no', f'{text_type}'),
            ('barcode_used', f'{text_type}')
        ],
        'quality_checks': [
            ('in_store', 'INTEGER DEFAULT 0'),
            ('grade_a_weight', 'REAL DEFAULT 0'),
            ('grade_b_weight', 'REAL DEFAULT 0'),
            ('checked_at', f'{text_type}')
        ],
        'finalized_bags': [
            ('status', f"{text_type} DEFAULT 'Pending'"),
            ('total_rolls', 'INTEGER DEFAULT 0'),
            ('total_weight', 'REAL DEFAULT 0'),
            ('created_at', f'{text_type}')
        ],
        'hr_staff': [
            ('address', f'{long_text}'),
            ('emergency_name', f'{text_type}'),
            ('emergency_phone', f'{text_type}'),
            ('blood_group', f'{text_type}'),
            ('joining_date', f'{text_type}'),
            ('shift', f"{text_type} DEFAULT 'Day'"),
            ('status', f"{text_type} DEFAULT 'Active'"),
            ('joining_form_path', f'{text_type}')
        ],
        'dispatch_records': [
            ('gate_pass_no', f'{text_type}'),
            ('total_rolls', 'INTEGER DEFAULT 0'),
            ('total_weight', 'REAL DEFAULT 0')
        ]
    }

    for table, col_list in alterations.items():
        existing = get_existing_columns(table)
        for col_name, col_def in col_list:
            if col_name.lower() not in existing:
                try:
                    cur.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def}")
                    con.commit()
                    print(f"[DB AUTO-MIGRATED] Added missing column '{col_name}' to table '{table}'")
                except Exception as e:
                    # Ignore duplicate column errors
                    pass

    # 3. Seed Default System Users if empty
    try:
        cur.execute("SELECT COUNT(*) FROM users")
        row = cur.fetchone()
        count = row['COUNT(*)'] if isinstance(row, dict) else (row[0] if row else 0)
        if count == 0:
            users = [
                ('admin', 'admin123', 'admin'),
                ('c1234', 'cp1234', 'clerk'),
                ('i1234', 'ip1234', 'incharge'),
                ('m1234', 'mp1234', 'manager')
            ]
            cur.executemany("INSERT INTO users (username, password, role) VALUES (?,?,?)", users)
            con.commit()
            print("[DB] Default users seeded successfully.")
    except Exception as e:
        print(f"[DB SEED ERROR] {e}")

    con.close()
    print("[DB] Schema repair & verification complete.")

# Run migration on startup
repair_and_migrate_db()

# ================= AUTHENTICATION & DECORATORS =================
def role_required(roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'role' not in session or session['role'] not in roles:
                flash("Unauthorized access! Please login with appropriate credentials.", "danger")
                return redirect(url_for('login'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# ================= API: DB STATUS & MIGRATION INFO =================
@app.route("/api/db-status")
def api_db_status():
    con = db()
    cur = con.cursor()
    is_mysql = (type(con).__name__ == "MySQLConnectionWrapper")

    counts = {}
    for tbl in ['fabric_rolls', 'plans', 'lots', 'quality_checks', 'dispatch_records', 'hr_staff', 'users']:
        try:
            cur.execute(f"SELECT COUNT(*) FROM {tbl}")
            res = cur.fetchone()
            counts[tbl] = res['COUNT(*)'] if isinstance(res, dict) else res[0]
        except Exception:
            counts[tbl] = 0
    con.close()

    return jsonify({
        "db_type": "mysql" if is_mysql else "sqlite",
        "host": MYSQL_HOST if is_mysql else "localhost",
        "database": MYSQL_DB if is_mysql else SQLITE_DB,
        "counts": counts,
        "mysql_driver_installed": MYSQL_AVAILABLE
    })

# ================= HOME & DESKTOP MULTI-WINDOW =================
@app.route("/")
def index():
    if not session.get('user'):
        flash("Please login to access the system.", "warning")
        return redirect(url_for('login'))

    con = db()
    cur = con.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM fabric_rolls")
        r_count = cur.fetchone()
        tot_rolls = r_count['COUNT(*)'] if isinstance(r_count, dict) else r_count[0]

        cur.execute("SELECT SUM(weight) FROM fabric_rolls")
        r_sum = cur.fetchone()
        tot_weight = r_sum['SUM(weight)'] if isinstance(r_sum, dict) else r_sum[0]

        cur.execute("SELECT COUNT(*) FROM plans")
        p_count = cur.fetchone()
        tot_plans = p_count['COUNT(*)'] if isinstance(p_count, dict) else p_count[0]

        cur.execute("SELECT COUNT(*) FROM dispatch_records")
        d_count = cur.fetchone()
        tot_dispatched = d_count['COUNT(*)'] if isinstance(d_count, dict) else d_count[0]

        stats = {
            'total_rolls': tot_rolls or 0,
            'total_weight': round(float(tot_weight or 0), 2),
            'active_plans': tot_plans or 0,
            'dispatched': tot_dispatched or 0
        }

        cur.execute("""
            SELECT roll_barcode, lot_name, weight, machine_no, created_at 
            FROM fabric_rolls 
            ORDER BY id DESC LIMIT 5
        """)
        recent_activity = cur.fetchall()
    except Exception as e:
        print(f"Index Query Error: {e}")
        stats = {'total_rolls': 0, 'total_weight': 0, 'active_plans': 0, 'dispatched': 0}
        recent_activity = []
    finally:
        con.close()

    return render_template("index.html", stats=stats, recent=recent_activity, now=datetime.now())

@app.route("/desktop")
def desktop_workspace():
    """Desktop MDI Multi-Window Interface for simultaneous side-by-side operations"""
    if not session.get('user'):
        flash("Please login to launch the Desktop Multi-Window Workspace.", "warning")
        return redirect(url_for('login'))
    return render_template("desktop_window.html")

# ================= LOGIN & LOGOUT =================
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()
        con = db()
        cur = con.cursor()
        cur.execute("SELECT * FROM users WHERE username=? AND password=?", (username, password))
        user = cur.fetchone()
        con.close()

        if user:
            session['user'] = user['username']
            session['role'] = user['role']
            flash(f"Logged in as {user['role'].capitalize()}", "success")
            return redirect(url_for('index'))
        else:
            flash("Invalid username or password", "danger")

    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    flash("Successfully logged out.", "info")
    return redirect(url_for('login'))

# ================= HR MANAGEMENT MODULE =================
@app.route("/hr/staff", methods=["GET", "POST"])
@role_required(['admin', 'manager'])
def hr_staff_directory():
    con = db()
    cur = con.cursor()
    
    if request.method == "POST":
        emp_code = request.form.get('emp_code', '').strip().upper()
        name = request.form.get('name', '').strip()
        cnic = request.form.get('cnic', '').strip()
        phone = request.form.get('phone', '').strip()
        dept = request.form.get('dept', 'PPC')
        role = request.form.get('role', 'Clerk')
        salary = float(request.form.get('salary', 0) or 0)
        
        try:
            # Check if emp_code exists
            cur.execute("SELECT id FROM hr_staff WHERE emp_code = ?", (emp_code,))
            existing = cur.fetchone()
            if existing:
                cur.execute("""
                    UPDATE hr_staff SET name=?, cnic=?, phone=?, department=?, sub_role=?, salary=?
                    WHERE emp_code=?
                """, (name, cnic, phone, dept, role, salary, emp_code))
            else:
                cur.execute("""
                    INSERT INTO hr_staff (emp_code, name, cnic, phone, department, sub_role, salary, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')
                """, (emp_code, name, cnic, phone, dept, role, salary))
            con.commit()
            flash("Staff record saved successfully", "success")
        except Exception as e:
            con.rollback()
            flash(f"Database Error: {str(e)}", "danger")

    cur.execute("SELECT * FROM hr_staff ORDER BY department ASC, name ASC")
    staff = cur.fetchall()
    con.close()
    return render_template("hr/staff.html", staff=staff)

@app.route("/hr/attendance", methods=["GET", "POST"])
@role_required(['admin', 'manager', 'incharge'])
def hr_attendance():
    con = db()
    cur = con.cursor()
    today = datetime.now().strftime('%Y-%m-%d')
    
    if request.method == "POST":
        staff_ids = request.form.getlist("staff_id")
        statuses = request.form.getlist("status")
        
        for s_id, stat in zip(staff_ids, statuses):
            cur.execute("SELECT id FROM hr_attendance WHERE staff_id=? AND date=?", (s_id, today))
            exist = cur.fetchone()
            if exist:
                cur.execute("UPDATE hr_attendance SET status=?, marked_by=? WHERE staff_id=? AND date=?",
                            (stat, session.get('user', 'admin'), s_id, today))
            else:
                cur.execute("INSERT INTO hr_attendance (staff_id, date, status, marked_by) VALUES (?, ?, ?, ?)",
                            (s_id, today, stat, session.get('user', 'admin')))
        con.commit()
        flash(f"Attendance marked for {today}", "success")

    cur.execute("SELECT * FROM hr_staff WHERE status = 'Active' ORDER BY name ASC")
    staff = cur.fetchall()
    con.close()
    return render_template("hr/attendance.html", staff=staff, today=today)

@app.route("/hr/ledger/<int:staff_id>", methods=["GET", "POST"])
@role_required(['admin', 'manager'])
def hr_ledger(staff_id):
    con = db()
    cur = con.cursor()
    if request.method == "POST":
        amount = float(request.form.get('amount', 0))
        l_type = request.form.get('type', 'Advance')
        desc = request.form.get('description', '')
        
        cur.execute("""
            INSERT INTO hr_ledger (staff_id, amount, type, description, date, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (staff_id, amount, l_type, desc, datetime.now().strftime("%Y-%m-%d"), session.get('user', 'admin')))
        con.commit()
        flash(f"{l_type} of Rs. {amount} recorded successfully", "info")

    cur.execute("SELECT * FROM hr_staff WHERE id = ?", (staff_id,))
    member = cur.fetchone()
    cur.execute("SELECT * FROM hr_ledger WHERE staff_id = ? ORDER BY id DESC", (staff_id,))
    history = cur.fetchall()
    con.close()
    return render_template("hr/ledger.html", member=member, history=history)

@app.route("/hr/payroll")
@role_required(['admin'])
def hr_payroll():
    con = db()
    cur = con.cursor()
    month = datetime.now().strftime('%m')
    year = datetime.now().strftime('%Y')

    cur.execute("SELECT * FROM hr_staff WHERE status = 'Active'")
    staff_list = cur.fetchall()
    
    report = []
    for s in staff_list:
        cur.execute("SELECT COUNT(*) FROM hr_attendance WHERE staff_id = ? AND status = 'Present'", (s['id'],))
        row_p = cur.fetchone()
        p_days = (row_p['COUNT(*)'] if isinstance(row_p, dict) else row_p[0]) or 0
        
        cur.execute("SELECT SUM(amount) FROM hr_ledger WHERE staff_id = ? AND type = 'Advance'", (s['id'],))
        row_adv = cur.fetchone()
        advances = (row_adv['SUM(amount)'] if isinstance(row_adv, dict) else row_adv[0]) or 0
        
        cur.execute("SELECT SUM(amount) FROM hr_ledger WHERE staff_id = ? AND type = 'Fine'", (s['id'],))
        row_fine = cur.fetchone()
        fines = (row_fine['SUM(amount)'] if isinstance(row_fine, dict) else row_fine[0]) or 0

        daily_rate = (s['salary'] or 0) / 30.0
        gross_salary = daily_rate * p_days
        net_salary = gross_salary - advances - fines
        
        report.append({
            'name': s['name'],
            'dept': s['department'],
            'base': s['salary'],
            'present': p_days,
            'advances': advances,
            'net': round(net_salary, 2)
        })

    con.close()
    return render_template("hr/payroll_report.html", report=report, month=month, now=datetime.now())

@app.route("/hr/search", methods=["GET", "POST"])
@role_required(['admin', 'manager', 'incharge'])
def hr_search():
    results = []
    query = request.form.get('query', '')
    if request.method == "POST" and query:
        con = db()
        cur = con.cursor()
        look_for = f"%{query}%"
        cur.execute("""
            SELECT * FROM hr_staff 
            WHERE name LIKE ? OR emp_code LIKE ? OR cnic LIKE ? OR phone LIKE ?
        """, (look_for, look_for, look_for, look_for))
        results = cur.fetchall()
        con.close()
    return render_template("hr/search_profile.html", results=results, query=query)

@app.route("/hr/profile/<int:staff_id>", methods=["GET", "POST"])
@role_required(['admin', 'manager'])
def hr_profile(staff_id):
    con = db()
    cur = con.cursor()

    if request.method == "POST":
        name = request.form.get('name', '').strip()
        phone = request.form.get('phone', '').strip()
        address = request.form.get('address', '').strip()
        e_name = request.form.get('e_name', '').strip()
        e_phone = request.form.get('e_phone', '').strip()
        salary = float(request.form.get('salary', 0) or 0)

        try:
            cur.execute("""
                UPDATE hr_staff SET 
                name=?, phone=?, address=?, emergency_name=?, emergency_phone=?, salary=? 
                WHERE id=?
            """, (name, phone, address, e_name, e_phone, salary, staff_id))
            con.commit()
            flash("Personnel File Updated Successfully!", "success")
        except Exception as e:
            con.rollback()
            flash(f"System Error: {str(e)}", "danger")

    cur.execute("SELECT * FROM hr_staff WHERE id = ?", (staff_id,))
    staff = cur.fetchone()
    con.close()
    
    if not staff:
        flash("Staff member not found.", "warning")
        return redirect(url_for('hr_staff_directory'))
        
    return render_template("hr/profile.html", s=staff)

# ================= PPC MODULE & TREE VIEW =================
@app.route("/ppc")
@role_required(['manager', 'admin'])
def ppc():
    con = db()
    cur = con.cursor()
    cur.execute("SELECT * FROM work_orders ORDER BY id DESC")
    work_orders = cur.fetchall()
    tree = []
    for wo in work_orders:
        cur.execute("SELECT * FROM plans WHERE work_order_id=?", (wo["id"],))
        plans = cur.fetchall()
        plan_list = []
        for p in plans:
            cur.execute("SELECT * FROM bags WHERE plan_id=?", (p["id"],))
            bags = cur.fetchall()
            bag_list = []
            for b in bags:
                cur.execute("SELECT * FROM lots WHERE bag_id=?", (b["id"],))
                lots = cur.fetchall()
                bag_list.append({**dict(b), "lots": [dict(l) for l in lots]})
            plan_list.append({**dict(p), "bags": bag_list})
        tree.append({**dict(wo), "plans": plan_list})
    con.close()
    return render_template("ppc_tree.html", work_orders=tree)

@app.route("/ppc/work-order/add", methods=["POST"])
def add_work_order():
    wo = request.form.get("work_order", "").strip()
    if wo:
        con = db(); cur = con.cursor()
        cur.execute("INSERT INTO work_orders (work_order) VALUES (?)", (wo,))
        con.commit(); con.close()
        flash("Work order added", "success")
    return redirect(url_for("ppc"))

@app.route("/ppc/work-order/delete/<int:id>")
def delete_work_order(id):
    con = db(); cur = con.cursor()
    cur.execute("DELETE FROM work_orders WHERE id=?", (id,))
    con.commit(); con.close()
    flash("Work order deleted", "info")
    return redirect(url_for("ppc"))

@app.route("/ppc/plan/add/<int:work_order_id>", methods=["POST"])
def add_plan(work_order_id):
    plan_id = request.form.get("plan_id", "").strip()
    if plan_id:
        con = db(); cur = con.cursor()
        cur.execute("INSERT INTO plans (work_order_id, plan_id) VALUES (?, ?)", (work_order_id, plan_id))
        con.commit(); con.close()
        flash("Plan added", "success")
    return redirect(url_for("ppc"))

@app.route("/ppc/plan/delete/<int:id>")
def delete_plan(id):
    con = db(); cur = con.cursor()
    cur.execute("DELETE FROM plans WHERE id=?", (id,))
    con.commit(); con.close()
    flash("Plan deleted", "info")
    return redirect(url_for("ppc"))

@app.route("/ppc/bag/new/<int:plan_id>", methods=["GET", "POST"])
def new_bag(plan_id):
    if request.method == "POST":
        con = db(); cur = con.cursor()
        bag_no = request.form.get("bag_number", "").strip()
        shade = request.form.get("shade", "").strip()
        cur.execute("INSERT INTO bags (plan_id, bag_number, shade, created_at) VALUES (?, ?, ?, ?)",
                    (plan_id, bag_no, shade, datetime.now().strftime("%Y-%m-%d")))
        con.commit(); con.close()
        flash("Bag created successfully", "success")
        return redirect(url_for("ppc"))
    return render_template("bag_form.html", bag=None)

@app.route("/ppc/bag/delete/<int:id>")
def delete_bag(id):
    con = db(); cur = con.cursor()
    cur.execute("DELETE FROM bags WHERE id=?", (id,))
    con.commit(); con.close()
    flash("Bag deleted", "info")
    return redirect(url_for("ppc"))

@app.route("/ppc/lot/new/<int:bag_id>", methods=["GET", "POST"])
def new_lot(bag_id):
    con = db(); cur = con.cursor()
    cur.execute("""
        SELECT work_orders.work_order, bags.shade 
        FROM bags 
        JOIN plans ON bags.plan_id = plans.id 
        JOIN work_orders ON plans.work_order_id = work_orders.id 
        WHERE bags.id = ?
    """, (bag_id,))
    info = cur.fetchone()
    curr_wo = info['work_order']
    curr_shade = info['shade']

    if request.method == "POST":
        d = request.form
        needles = d.get("needles", "").strip()
        input_weight = float(d.get("fabric_weight", 0) or 0)
        lot_name = d.get("lot_name", "").strip()
        fabric_length = float(d.get("fabric_length", 0) or 0)
        bag_weight = float(d.get("bag_weight", 0) or 0)
        remarks = d.get("remarks", "")

        # Unique Job ID logic
        cur.execute("""
            SELECT job FROM jobs 
            WHERE work_order_ref = ? AND shade_ref = ? AND needles_ref = ?
        """, (curr_wo, curr_shade, needles))
        existing = cur.fetchone()
        if existing:
            job_no = existing['job']
        else:
            cur.execute("SELECT MAX(job) FROM jobs WHERE work_order_ref = ?", (curr_wo,))
            res = cur.fetchone()
            max_j = (res['MAX(job)'] if isinstance(res, dict) else res[0]) if res else None
            job_no = 1 if max_j is None else max_j + 1
            cur.execute("INSERT INTO jobs (job, work_order_ref, shade_ref, needles_ref) VALUES (?, ?, ?, ?)",
                        (job_no, curr_wo, curr_shade, needles))

        # Save Lot with plan_weight
        cur.execute("""
            INSERT INTO lots
            (bag_id, lot_name, fabric_length, fabric_weight, plan_weight, bag_weight, needles, job_id, remarks, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (bag_id, lot_name, fabric_length, input_weight, input_weight, bag_weight, needles, job_no, remarks,
              datetime.now().strftime("%Y-%m-%d")))
        
        con.commit(); con.close()
        flash(f"Lot Added! (Job #{job_no})", "success")
        return redirect(url_for("ppc"))

    con.close()
    return render_template("lot_form.html", lot=None)

@app.route("/ppc/lot/delete/<int:id>")
def delete_lot(id):
    con = db(); cur = con.cursor()
    cur.execute("DELETE FROM lots WHERE id=?", (id,))
    con.commit(); con.close()
    flash("Lot deleted", "info")
    return redirect(url_for("ppc"))

@app.route("/ppc/lot/update-qty/<int:id>", methods=["POST"])
def update_lot_qty(id):
    new_qty = float(request.form.get("new_weight", 0))
    con = db(); cur = con.cursor()
    try:
        cur.execute("SELECT bag_id FROM lots WHERE id = ?", (id,))
        lot_info = cur.fetchone()
        if lot_info:
            bag_id = lot_info['bag_id']
            cur.execute("UPDATE lots SET fabric_weight = ?, plan_weight = ? WHERE id = ?", (new_qty, new_qty, id))
            cur.execute("SELECT SUM(plan_weight) FROM lots WHERE bag_id = ?", (bag_id,))
            res = cur.fetchone()
            new_bag_total = (res['SUM(plan_weight)'] if isinstance(res, dict) else res[0]) or 0
            cur.execute("UPDATE lots SET bag_weight = ? WHERE bag_id = ?", (new_bag_total, bag_id))
            con.commit()
            flash(f"Updated Lot Target to {new_qty} KG. Bag Total synchronized to {new_bag_total} KG.", "success")
    except Exception as e:
        con.rollback()
        flash(f"Database Error: {str(e)}", "danger")
    finally:
        con.close()
    return redirect(url_for("ppc"))

# ================= MACHINE SIGN-IN MODULE =================
@app.route("/machine-sign", methods=["GET", "POST"])
def machine_sign():
    con = db(); cur = con.cursor()
    if request.method == "POST":
        job_text = request.form.get("job_text")
        needles = request.form.get("needles")
        machine = request.form.get("machine")
        unit = request.form.get("unit", 1)

        while True:
            code = ''.join(random.choices(string.digits, k=5))
            cur.execute("SELECT 1 FROM machine_assignments WHERE unique_code=?", (code,))
            if not cur.fetchone():
                break

        cur.execute("""
            INSERT INTO machine_assignments 
            (job_full_text, needles, machine_no, unit_no, unique_code, created_at) 
            VALUES (?, ?, ?, ?, ?, ?)
        """, (job_text, needles, machine, unit, code, datetime.now().strftime("%Y-%m-%d %H:%M")))
        con.commit()
        flash(f"Machine M#{machine} assigned to {job_text}. Code: {code}", "success")
        return redirect(url_for("machine_sign"))

    cur.execute("SELECT DISTINCT work_order FROM work_orders ORDER BY work_order DESC")
    work_orders = cur.fetchall()
    con.close()
    return render_template("machine_sign.html", work_orders=work_orders)

@app.route("/machine-sign/delete/<int:id>")
def delete_machine_sign(id):
    con = db(); cur = con.cursor()
    cur.execute("DELETE FROM machine_assignments WHERE id = ?", (id,))
    con.commit(); con.close()
    flash("Machine signed out successfully.", "info")
    return redirect(url_for("machine_sign"))

# ================= ROLL ENTRY & BARCODE SYSTEM =================
@app.route("/roll-entry")
@role_required(['clerk', 'incharge', 'manager'])
def roll_entry():
    con = db(); cur = con.cursor()
    cur.execute("SELECT work_order FROM work_orders")
    work_orders = [w["work_order"] for w in cur.fetchall()]
    con.close()
    return render_template("roll_entry_select.html", work_orders=work_orders)

@app.route("/api/plans/<work_order>")
def api_plans(work_order):
    con = db(); cur = con.cursor()
    cur.execute("""
        SELECT plans.plan_id FROM plans
        JOIN work_orders ON plans.work_order_id=work_orders.id
        WHERE work_orders.work_order=?
    """, (work_order,))
    data = [p["plan_id"] for p in cur.fetchall()]
    con.close()
    return jsonify(data)

@app.route("/api/bags/<plan_id>")
def api_bags(plan_id):
    con = db(); cur = con.cursor()
    cur.execute("""
        SELECT b.bag_number 
        FROM bags b
        JOIN plans p ON b.plan_id = p.id
        LEFT JOIN finalized_bags fb ON b.bag_number = fb.bag_number
        WHERE p.plan_id = ? AND fb.bag_number IS NULL
    """, (plan_id,))
    data = [b["bag_number"] for b in cur.fetchall()]
    con.close()
    return jsonify(data)

@app.route("/api/lots/<bag_number>")
def api_lots(bag_number):
    con = db(); cur = con.cursor()
    cur.execute("""
        SELECT 
            l.lot_name, 
            l.needles, 
            l.fabric_weight as rem_weight,
            fr.barcode_used as barcode,
            m.machine_no,
            (SELECT COUNT(*) FROM fabric_rolls fr2 
             WHERE fr2.lot_name = l.lot_name AND fr2.bag_number = b.bag_number) as roll_count
        FROM lots l
        JOIN bags b ON l.bag_id = b.id
        LEFT JOIN fabric_rolls fr ON (fr.bag_number = b.bag_number AND fr.lot_name = l.lot_name)
        LEFT JOIN machine_assignments m ON fr.barcode_used = m.unique_code
        WHERE b.bag_number = ?
        GROUP BY l.lot_name, fr.barcode_used, l.needles, l.fabric_weight, m.machine_no, b.bag_number
    """, (bag_number,))
    rows = cur.fetchall()
    
    data = []
    seen = set()
    for row in rows:
        item = dict(row)
        if item.get('roll_count', 0) == 0:
            item['barcode'] = None
            item['machine_no'] = None
        key = f"{item['lot_name']}_{item.get('barcode')}"
        if key not in seen:
            data.append(item)
            seen.add(key)
    con.close()
    return jsonify(data)

@app.route("/api/shades-by-wo/<wo_name>")
def shades_by_wo(wo_name):
    con = db(); cur = con.cursor()
    cur.execute("""
        SELECT DISTINCT b.shade FROM bags b
        JOIN plans p ON b.plan_id = p.id
        JOIN work_orders wo ON p.work_order_id = wo.id
        WHERE wo.work_order = ?
    """, (wo_name,))
    data = [r['shade'] for r in cur.fetchall()]
    con.close()
    return jsonify(data)

@app.route("/api/jobs-by-shade/<wo_name>/<shade_name>")
def jobs_by_shade(wo_name, shade_name):
    con = db(); cur = con.cursor()
    cur.execute("""
        SELECT job, needles_ref FROM jobs 
        WHERE work_order_ref = ? AND shade_ref = ?
    """, (wo_name, shade_name))
    data = [dict(r) for r in cur.fetchall()]
    con.close()
    return jsonify(data)

@app.route("/api/barcode-details/<barcode>")
def api_barcode_details(barcode):
    con = db(); cur = con.cursor()
    cur.execute("SELECT * FROM machine_assignments WHERE unique_code = ?", (barcode,))
    row = cur.fetchone()
    con.close()
    if row:
        return jsonify(dict(row))
    return jsonify({"error": "Barcode not found"}), 404

@app.route("/api/save-roll", methods=["POST"])
def api_save_roll():
    data = request.json
    con = db(); cur = con.cursor()
    try:
        cur.execute("""
            SELECT b.shade, wo.work_order, b.plan_id
            FROM bags b
            JOIN plans p ON b.plan_id = p.id
            JOIN work_orders wo ON p.work_order_id = wo.id
            WHERE b.bag_number = ?
        """, (data['bag_number'],))
        meta = cur.fetchone()
        if not meta:
            return jsonify({"success": False, "message": "Bag/Work Order not found!"}), 404

        shade = meta['shade']
        wo_val = meta['work_order']

        cur.execute("""
            SELECT job FROM jobs 
            WHERE work_order_ref = ? AND shade_ref = ? AND needles_ref LIKE ?
        """, (wo_val, shade, f"{data['needles']}%"))
        job_row = cur.fetchone()
        if not job_row:
            return jsonify({"success": False, "message": "No Job record found for this Shade/Needles combo!"}), 400

        current_job_id = job_row['job']
        current_job_full = f"{current_job_id}/{wo_val}"

        barcode_scanned = data.get('barcode')
        cur.execute("SELECT machine_no, job_full_text FROM machine_assignments WHERE unique_code = ?", (barcode_scanned,))
        m_row = cur.fetchone()
        if not m_row:
            return jsonify({"success": False, "message": "Invalid Machine Barcode!"}), 400

        machine_no = m_row['machine_no']

        # Generate unique 7-digit roll barcode
        while True:
            unique_roll_id = ''.join(random.choices(string.digits, k=7))
            cur.execute("SELECT 1 FROM fabric_rolls WHERE roll_barcode = ?", (unique_roll_id,))
            if not cur.fetchone():
                break

        # Max roll number
        cur.execute("""
            SELECT MAX(r.roll_no) 
            FROM fabric_rolls r
            JOIN bags b ON r.bag_number = b.bag_number
            WHERE r.work_order = ? AND b.shade = ? AND r.needles LIKE ?
        """, (wo_val, shade, f"{data['needles']}%"))
        res = cur.fetchone()
        max_roll = (res['MAX(r.roll_no)'] if isinstance(res, dict) else res[0]) if res else 0
        new_roll_no = (max_roll or 0) + 1

        cur.execute("""
            INSERT INTO fabric_rolls (
                work_order, plan_id, bag_number, lot_name, roll_no, 
                weight, needles, created_at, barcode_used, roll_barcode, machine_no
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            wo_val, data['plan_id'], data['bag_number'], data['lot_name'],
            new_roll_no, float(data['weight']), data['needles'],
            datetime.now().strftime("%Y-%m-%d %H:%M"),
            barcode_scanned, unique_roll_id, machine_no
        ))

        # Deduct weight from lot balance
        cur.execute("""
            UPDATE lots 
            SET fabric_weight = fabric_weight - ? 
            WHERE lot_name = ? AND needles = ?
        """, (float(data['weight']), data['lot_name'], data['needles']))

        con.commit()
        return jsonify({
            "success": True,
            "sticker_data": {
                "roll_barcode": unique_roll_id,
                "bag": data['bag_number'],
                "lot": data['lot_name'],
                "roll_no": new_roll_no,
                "job_wo": current_job_full,
                "needle": data['needles'],
                "shade": shade,
                "machine": machine_no,
                "weight": data['weight'],
                "date": datetime.now().strftime("%d-%b %H:%M")
            }
        })
    except Exception as e:
        con.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        con.close()

# ================= ROLL-WISE TRACKING =================
@app.route("/roll-wise", methods=["GET", "POST"])
def roll_wise():
    con = db()
    cur = con.cursor()
    results = []
    stats = {"planned": 0, "produced": 0, "balance": 0}

    selected_wo = request.args.get('work_order', '')
    selected_shade = request.args.get('shade', '')
    selected_job = request.args.get('job', '')

    if selected_wo and selected_shade and selected_job:
        cur.execute("""
            SELECT needles_ref FROM jobs 
            WHERE work_order_ref = ? AND shade_ref = ? AND job = ?
        """, (selected_wo, selected_shade, selected_job))
        job_info = cur.fetchone()

        if job_info:
            target_needles = str(job_info['needles_ref']).upper().replace('N', '').strip()
            needle_pattern = f"{target_needles}%"

            cur.execute("""
                SELECT r.id, r.roll_no, r.needles, r.weight, r.created_at, r.lot_name,
                       r.roll_barcode, r.machine_no,
                       b.bag_number, b.shade,
                       COALESCE(fb.status, 'Pending') as bag_status,
                       COALESCE(qc.in_store, 0) as in_store,
                       qc.grade_a_weight as qw,
                       qc.id as qc_id
                FROM fabric_rolls r
                JOIN bags b ON r.bag_number = b.bag_number
                JOIN plans p ON b.plan_id = p.id
                JOIN work_orders wo ON p.work_order_id = wo.id
                LEFT JOIN finalized_bags fb ON b.bag_number = fb.bag_number
                LEFT JOIN quality_checks qc ON r.roll_barcode = qc.roll_id
                WHERE wo.work_order = ? AND b.shade = ? AND r.needles LIKE ?
                ORDER BY r.roll_no ASC
            """, (selected_wo, selected_shade, needle_pattern))
            results = cur.fetchall()

            cur.execute("""
                SELECT SUM(l.fabric_weight) FROM lots l
                JOIN bags b ON l.bag_id = b.id
                JOIN plans p ON b.plan_id = p.id
                JOIN work_orders wo ON p.work_order_id = wo.id
                WHERE wo.work_order = ? AND b.shade = ? AND l.needles LIKE ?
            """, (selected_wo, selected_shade, needle_pattern))
            res = cur.fetchone()
            current_balance = (res['SUM(l.fabric_weight)'] if isinstance(res, dict) else res[0]) or 0
            stats["produced"] = sum(float(r['weight']) for r in results)
            stats["planned"] = stats["produced"] + current_balance
            stats["balance"] = current_balance

    cur.execute("SELECT DISTINCT work_order FROM work_orders")
    work_orders = cur.fetchall()
    con.close()

    return render_template("roll_wise.html", **locals())

@app.route("/api/edit-roll/<int:roll_id>", methods=["POST"])
def edit_roll(roll_id):
    new_weight = float(request.form.get("weight", 0))
    con = db(); cur = con.cursor()
    try:
        cur.execute("SELECT weight, lot_name, needles, bag_number FROM fabric_rolls WHERE id = ?", (roll_id,))
        roll = cur.fetchone()
        if roll:
            old_w = float(roll['weight'])
            diff = old_w - new_weight
            cur.execute("""
                UPDATE lots SET fabric_weight = fabric_weight + ? 
                WHERE lot_name = ? AND needles = ?
            """, (diff, roll['lot_name'], roll['needles']))
            cur.execute("UPDATE fabric_rolls SET weight = ? WHERE id = ?", (new_weight, roll_id))
            con.commit()
            flash("Roll updated. Balance adjusted.", "success")
    except Exception as e:
        con.rollback()
        flash(f"Error: {str(e)}", "danger")
    finally:
        con.close()
    return redirect(request.referrer or url_for('roll_wise'))

@app.route("/api/delete-roll/<int:roll_id>")
def delete_roll(roll_id):
    con = db(); cur = con.cursor()
    try:
        cur.execute("SELECT weight, lot_name, needles FROM fabric_rolls WHERE id = ?", (roll_id,))
        roll = cur.fetchone()
        if roll:
            cur.execute("""
                UPDATE lots SET fabric_weight = fabric_weight + ? 
                WHERE lot_name = ? AND needles = ?
            """, (float(roll['weight']), roll['lot_name'], roll['needles']))
            cur.execute("DELETE FROM fabric_rolls WHERE id = ?", (roll_id,))
            con.commit()
            flash("Roll deleted and balance restored.", "info")
    except Exception as e:
        con.rollback()
        flash(f"Error: {str(e)}", "danger")
    finally:
        con.close()
    return redirect(request.referrer or url_for('roll_wise'))

# ================= QUALITY CONTROL =================
@app.route("/roll-quality", methods=["GET", "POST"])
def roll_quality():
    if request.method == "POST":
        barcode = request.form.get("roll_id", "").strip()
        is_quarry = request.form.get("quarry_mode") == "on"

        con = db(); cur = con.cursor()
        try:
            cur.execute("SELECT grade_a_weight FROM quality_checks WHERE roll_id = ?", (barcode,))
            q_record = cur.fetchone()

            if not is_quarry and q_record:
                return jsonify({"success": False, "message": "Roll already inspected in Quality!"})

            cur.execute("""
                SELECT r.*, b.shade, wo.work_order 
                FROM fabric_rolls r
                JOIN bags b ON r.bag_number = b.bag_number
                JOIN plans p ON b.plan_id = p.id
                JOIN work_orders wo ON p.work_order_id = wo.id
                WHERE r.roll_barcode = ?
            """, (barcode,))
            roll = cur.fetchone()

            if not roll:
                return jsonify({"success": False, "message": "Roll Barcode not found!"})

            pw = float(roll['weight'])

            if is_quarry:
                qw = q_record['grade_a_weight'] if q_record else "Pending"
            else:
                same_weight = request.form.get("same_weight") == "yes"
                manual_weight = request.form.get("manual_weight")
                qw = pw if same_weight else float(manual_weight or pw)
                b_grade = pw - qw

                if qw > pw:
                    return jsonify({"success": False, "message": "QW cannot be greater than PW!"})

                cur.execute("""
                    INSERT INTO quality_checks 
                    (roll_id, original_weight, grade_a_weight, grade_b_weight, checked_at) 
                    VALUES (?, ?, ?, ?, ?)
                """, (barcode, pw, qw, b_grade, datetime.now().strftime("%Y-%m-%d %H:%M")))

                if b_grade > 0:
                    cur.execute("""
                        UPDATE lots SET fabric_weight = fabric_weight + ? 
                        WHERE lot_name = ? AND needles = ?
                    """, (b_grade, roll['lot_name'], roll['needles']))
                con.commit()

            sticker = {
                "bag": roll['bag_number'],
                "lot": roll['lot_name'],
                "roll_no": roll['roll_no'],
                "job_wo": roll['work_order'],
                "shade": roll['shade'],
                "needles": roll['needles'],
                "machine": roll.get('machine_no', '-'),
                "pw": pw,
                "qw": qw,
                "barcode": barcode
            }
            return jsonify({"success": True, "sticker": sticker})
        except Exception as e:
            con.rollback()
            return jsonify({"success": False, "message": str(e)})
        finally:
            con.close()

    return render_template("roll_quality.html")

# ================= FABRIC STORE & DISPATCH =================
@app.route("/fabric-store", methods=["GET"])
@role_required(['clerk', 'incharge', 'manager'])
def fabric_store():
    return render_template("fabric_store.html")

@app.route("/fabric-store/scan-bag", methods=["POST"])
def store_scan_bag():
    bag_no = request.form.get("bag_number", "").strip()
    con = db(); cur = con.cursor()
    cur.execute("""
        SELECT r.roll_no, r.roll_barcode, r.needles, b.shade, q.grade_a_weight as qw
        FROM fabric_rolls r
        JOIN bags b ON r.bag_number = b.bag_number
        JOIN quality_checks q ON r.roll_barcode = q.roll_id
        WHERE r.bag_number = ? AND q.in_store = 0
    """, (bag_no,))
    rolls = cur.fetchall()
    con.close()
    if not rolls:
        return jsonify({"success": False, "message": "No pending quality-cleared rolls found for this bag."})
    return jsonify({"success": True, "rolls": [dict(r) for r in rolls]})

@app.route("/fabric-store/save-stock", methods=["POST"])
def save_store_stock():
    selected_rolls = request.json.get("rolls", [])
    con = db(); cur = con.cursor()
    try:
        for barcode in selected_rolls:
            cur.execute("UPDATE quality_checks SET in_store = 1 WHERE roll_id = ?", (barcode,))
        con.commit()
        return jsonify({"success": True})
    except Exception as e:
        con.rollback()
        return jsonify({"success": False, "message": str(e)})
    finally:
        con.close()

@app.route("/dispatch", methods=["GET", "POST"])
def dispatch_management():
    con = db(); cur = con.cursor()
    if request.method == "POST":
        bag_no = request.form.get("bag_number")
        customer = request.form.get("customer")
        vehicle = request.form.get("vehicle")
        driver = request.form.get("driver")

        cur.execute("SELECT total_weight, total_rolls FROM finalized_bags WHERE bag_number = ?", (bag_no,))
        bag = cur.fetchone()
        if not bag:
            flash(f"Bag {bag_no} is not finalized!", "danger")
            return redirect(url_for('dispatch_management'))

        gp_no = f"GP-{bag_no}-{datetime.now().strftime('%H%M')}"
        try:
            cur.execute("""
                INSERT INTO dispatch_records 
                (bag_number, customer_name, vehicle_no, driver_name, gate_pass_no, total_rolls, total_weight, dispatched_at, dispatched_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (bag_no, customer, vehicle, driver, gp_no, bag['total_rolls'], bag['total_weight'], 
                  datetime.now().strftime("%Y-%m-%d %H:%M"), session.get('user', 'Admin')))
            cur.execute("UPDATE finalized_bags SET status='Dispatched' WHERE bag_number=?", (bag_no,))
            cur.execute("""
                UPDATE quality_checks SET in_store = 2 
                WHERE roll_id IN (SELECT roll_barcode FROM fabric_rolls WHERE bag_number = ?)
            """, (bag_no,))
            con.commit()
            flash(f"Bag {bag_no} dispatched with Gate Pass {gp_no}!", "success")
        except Exception as e:
            con.rollback()
            flash(f"Error: {str(e)}", "danger")

    cur.execute("""
        SELECT bag_number, total_weight, total_rolls 
        FROM finalized_bags 
        WHERE bag_number NOT IN (SELECT bag_number FROM dispatch_records)
        ORDER BY id DESC
    """)
    available_bags = cur.fetchall()
    cur.execute("SELECT * FROM dispatch_records ORDER BY id DESC LIMIT 15")
    history = cur.fetchall()
    con.close()
    return render_template("dispatch.html", available_bags=available_bags, history=history)

@app.route("/print-gate-pass/<bag_no>")
def print_gate_pass(bag_no):
    con = db(); cur = con.cursor()
    cur.execute("SELECT * FROM dispatch_records WHERE bag_number = ?", (bag_no,))
    dispatch = cur.fetchone()
    if not dispatch:
        con.close()
        flash("Gate Pass record not found!", "danger")
        return redirect(url_for('dispatch_management'))

    cur.execute("""
        SELECT r.roll_no, r.roll_barcode, r.needles, r.lot_name, q.grade_a_weight, b.shade
        FROM fabric_rolls r
        JOIN quality_checks q ON r.roll_barcode = q.roll_id
        JOIN bags b ON r.bag_number = b.bag_number
        WHERE r.bag_number = ?
        ORDER BY r.lot_name ASC, r.roll_no ASC
    """, (bag_no,))
    rolls = cur.fetchall()
    con.close()
    return render_template("gate_pass_pdf.html", d=dispatch, rolls=rolls)

@app.route("/plan-status", methods=["GET", "POST"])
def plan_status():
    con = db(); cur = con.cursor()
    if request.method == "POST" and request.form.get("action") == "create_bag":
        bag_no = request.form.get("bag_number")
        wo_no = request.form.get("work_order")
        cur.execute("""
            SELECT COUNT(r.id) as r_cnt, SUM(COALESCE(q.grade_a_weight, 0)) as total_kg
            FROM fabric_rolls r
            LEFT JOIN quality_checks q ON r.roll_barcode = q.roll_id
            WHERE r.bag_number = ?
        """, (bag_no,))
        summary = cur.fetchone()
        rcnt = (summary['r_cnt'] if isinstance(summary, dict) else summary[0]) or 0
        tkg = (summary['total_kg'] if isinstance(summary, dict) else summary[1]) or 0

        if rcnt > 0:
            cur.execute("""
                INSERT INTO finalized_bags (bag_number, work_order, total_rolls, total_weight, status, created_at)
                VALUES (?, ?, ?, ?, 'Finalized', ?)
            """, (bag_no, wo_no, rcnt, tkg, datetime.now().strftime("%Y-%m-%d %H:%M")))
            con.commit()
            flash(f"Bag {bag_no} Finalized!", "success")
        return redirect(url_for('plan_status', work_order=wo_no, bag_number=bag_no))

    selected_wo = request.args.get("work_order", "")
    selected_bag = request.args.get("bag_number", "")
    cur.execute("SELECT DISTINCT work_order FROM work_orders")
    work_orders = cur.fetchall()
    bags = []
    rolls_data = []
    ready_to_finalize = False
    is_already_finalized = False
    bag_status = "Pending"

    if selected_wo:
        cur.execute("""
            SELECT DISTINCT b.bag_number FROM bags b
            JOIN plans p ON b.plan_id = p.id
            JOIN work_orders wo ON p.work_order_id = wo.id
            WHERE wo.work_order = ?
        """, (selected_wo,))
        bags = cur.fetchall()

    if selected_bag:
        cur.execute("SELECT status FROM finalized_bags WHERE bag_number = ?", (selected_bag,))
        fb = cur.fetchone()
        if fb:
            is_already_finalized = True
            bag_status = fb['status']

        cur.execute("""
            SELECT r.roll_no, r.roll_barcode, r.weight as pw, r.needles, b.shade,
                   COALESCE(q.grade_a_weight, 0) as qw, 
                   COALESCE(q.in_store, 0) as in_store, 
                   q.id as qc_id
            FROM fabric_rolls r
            JOIN bags b ON r.bag_number = b.bag_number
            LEFT JOIN quality_checks q ON r.roll_barcode = q.roll_id
            WHERE r.bag_number = ?
            ORDER BY r.roll_no ASC
        """, (selected_bag,))
        rolls_data = cur.fetchall()
        if rolls_data and not is_already_finalized:
            ready_to_finalize = all(r['qc_id'] is not None for r in rolls_data)

    con.close()
    return render_template("plan_status.html", **locals())

@app.route("/admin", methods=["GET", "POST"])
def admin_dashboard():
    if session.get('role') != 'admin':
        flash("Access Denied: Admins only", "danger")
        return redirect(url_for('index'))

    con = db(); cur = con.cursor()
    if request.method == "POST":
        action = request.form.get("action")
        if action == "add_user":
            cur.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                        (request.form.get("username"), request.form.get("password"), request.form.get("role")))
        elif action == "delete_user":
            cur.execute("DELETE FROM users WHERE id = ?", (request.form.get("user_id"),))
        con.commit()

    cur.execute("SELECT SUM(weight) FROM fabric_rolls")
    prod = cur.fetchone()[0] or 0
    cur.execute("SELECT COUNT(*) FROM dispatch_records")
    dispatched = cur.fetchone()[0] or 0
    cur.execute("SELECT COUNT(DISTINCT bag_id) FROM lots")
    plans = cur.fetchone()[0] or 0
    cur.execute("SELECT SUM(grade_a_weight), SUM(grade_b_weight) FROM quality_checks")
    q = cur.fetchone()
    ga = q[0] or 0; gb = q[1] or 0
    cur.execute("SELECT * FROM fabric_rolls ORDER BY id DESC LIMIT 10")
    recent = cur.fetchall()
    cur.execute("SELECT * FROM users")
    users = cur.fetchall()
    con.close()
    return render_template("admin_pro.html", **locals())

@app.route("/reports")
def reports_menu():
    con = db(); cur = con.cursor()
    cur.execute("SELECT DISTINCT work_order FROM work_orders")
    work_orders = cur.fetchall()
    con.close()
    return render_template("reports_menu.html", work_orders=work_orders)

@app.route("/search-roll", methods=["GET", "POST"])
def search_roll():
    roll_data = None
    barcode = request.args.get("roll_id", "")
    if barcode:
        con = db(); cur = con.cursor()
        cur.execute("""
            SELECT r.*, b.shade, wo.work_order, q.grade_a_weight, q.grade_b_weight, q.in_store, q.checked_at
            FROM fabric_rolls r
            JOIN bags b ON r.bag_number = b.bag_number
            JOIN plans p ON b.plan_id = p.id
            JOIN work_orders wo ON p.work_order_id = wo.id
            LEFT JOIN quality_checks q ON r.roll_barcode = q.roll_id
            WHERE r.roll_barcode = ?
        """, (barcode,))
        roll_data = cur.fetchone()
        con.close()
    return render_template("search_roll.html", roll=roll_data, search_query=barcode)

# Fallback routes for other modules
@app.route("/downtime", methods=["GET", "POST"])
def downtime():
    return render_template("downtime.html") if os.path.exists("templates/downtime.html") else redirect(url_for('index'))

@app.route("/yarn", methods=["GET", "POST"])
def yarn():
    return render_template("yarn.html") if os.path.exists("templates/yarn.html") else redirect(url_for('index'))

@app.route("/production", methods=["GET", "POST"])
def production():
    return render_template("production.html") if os.path.exists("templates/production.html") else redirect(url_for('index'))

@app.route("/faults", methods=["GET", "POST"])
def faults():
    return render_template("faults.html") if os.path.exists("templates/faults.html") else redirect(url_for('index'))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"🚀 GarmentFlow Pro Server Starting on port {port}...")
    app.run(debug=False, host='0.0.0.0', port=port)
