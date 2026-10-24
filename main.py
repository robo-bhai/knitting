"""
TexFlow Industrial Garment ERP - Backend System (GarmentFlow Pro)
Supports SQLite & MySQL Dual-Engine Architecture with Automatic Schema Repair
"""
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session, send_file
import os, sys, time, random, string, io
from datetime import datetime
from functools import wraps
from urllib.parse import unquote
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

# Admin credentials loaded from environment / GitHub secrets
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin").strip()
ADMIN_PASSWORDS = os.getenv("ADMIN_PASSWORDS", os.getenv("ADMIN_PASSWORD", "admin123")).strip()

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
        if row is not None and not isinstance(row, dict) and hasattr(self._cur, 'description') and self._cur.description:
            cols = [col[0] for col in self._cur.description]
            return dict(zip(cols, row))
        return row

    def fetchall(self):
        rows = self._cur.fetchall()
        if rows and not isinstance(rows[0], dict) and hasattr(self._cur, 'description') and self._cur.description:
            cols = [col[0] for col in self._cur.description]
            return [dict(zip(cols, r)) for r in rows]
        return rows

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
            # First attempt connection via PyMySQL with fast failover
            try:
                import pymysql
                import pymysql.cursors
                ssl_dict = {'ssl': {}} if MYSQL_SSL else {}
                conn = pymysql.connect(
                    host=MYSQL_HOST,
                    port=MYSQL_PORT,
                    user=MYSQL_USER,
                    password=MYSQL_PASSWORD,
                    database=MYSQL_DB,
                    charset='utf8mb4',
                    cursorclass=pymysql.cursors.DictCursor,
                    autocommit=True,
                    connect_timeout=2,
                    read_timeout=3,
                    write_timeout=3,
                    **ssl_dict
                )
                return MySQLConnectionWrapper(conn)
            except ImportError:
                import mysql.connector
                conn = mysql.connector.connect(
                    host=MYSQL_HOST,
                    port=MYSQL_PORT,
                    user=MYSQL_USER,
                    password=MYSQL_PASSWORD,
                    database=MYSQL_DB,
                    charset='utf8mb4',
                    connection_timeout=2,
                    autocommit=True
                )
                return MySQLConnectionWrapper(conn)
        except Exception as e:
            print(f"[DB WARNING] Failed to connect to MySQL ({e}). Fast switching to SQLite to avoid server overload.")
            DB_TYPE = "sqlite"

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
            created_at {text_type},
            work_order {text_type},
            shade {text_type}
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
            ('barcode_used', f'{text_type}'),
            ('is_merged', 'INTEGER DEFAULT 0'),
            ('merge_count', 'INTEGER DEFAULT 0')
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
        ],
        'machine_assignments': [
            ('work_order', f'{text_type}'),
            ('shade', f'{text_type}')
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

    # Auto-backfill machine_assignments work_order from job_full_text if missing
    try:
        cur.execute("SELECT id, job_full_text FROM machine_assignments WHERE work_order IS NULL OR work_order = ''")
        unfilled = cur.fetchall()
        for u in unfilled:
            u_dict = dict(u) if isinstance(u, dict) else {'id': u[0], 'job_full_text': u[1]}
            jtext = u_dict.get('job_full_text') or ''
            if '/' in jtext:
                wo_part = jtext.split('/', 1)[1].strip()
                cur.execute("UPDATE machine_assignments SET work_order = ? WHERE id = ?", (wo_part, u_dict['id']))
        con.commit()
    except Exception as e:
        pass

    # 3. Seed ONLY default Admin user from environment / GitHub secrets if not exists
    try:
        cur.execute("SELECT id, password FROM users WHERE username = ?", (ADMIN_USERNAME,))
        admin_row = cur.fetchone()
        if not admin_row:
            cur.execute("INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')", (ADMIN_USERNAME, ADMIN_PASSWORDS))
            con.commit()
            print(f"[DB] Initial Admin user '{ADMIN_USERNAME}' created successfully from environment/secrets.")
        else:
            # Sync password if updated in secrets
            cur.execute("UPDATE users SET password = ? WHERE username = ? AND role = 'admin'", (ADMIN_PASSWORDS, ADMIN_USERNAME))
            con.commit()
            print(f"[DB] Admin user '{ADMIN_USERNAME}' verified and synced with environment secrets.")
    except Exception as e:
        print(f"[DB SEED ERROR] {e}")

    # 4. Seamless Data Recovery: If connected to MySQL and local SQLite (database.db) has existing records, migrate all data into MySQL
    if is_mysql and os.path.exists(SQLITE_DB) and os.path.getsize(SQLITE_DB) > 0:
        try:
            import sqlite3
            s_con = sqlite3.connect(SQLITE_DB)
            s_con.row_factory = sqlite3.Row
            s_cur = s_con.cursor()

            s_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            sqlite_tables = [r[0] for r in s_cur.fetchall()]

            for tbl in ['users', 'hr_staff', 'hr_ledger', 'hr_attendance', 'work_orders', 'plans', 'bags', 'lots', 'jobs', 'fabric_rolls', 'machine_assignments', 'quality_checks', 'finalized_bags', 'dispatch_records', 'rolls', 'downtime', 'yarn', 'production', 'faults', 'operators', 'samples']:
                if tbl in sqlite_tables:
                    try:
                        cur.execute(f"SELECT COUNT(*) FROM {tbl}")
                        m_cnt = cur.fetchone()
                        m_count = m_cnt['COUNT(*)'] if isinstance(m_cnt, dict) else m_cnt[0]

                        s_cur.execute(f"SELECT COUNT(*) FROM {tbl}")
                        s_cnt = s_cur.fetchone()
                        s_count = s_cnt['COUNT(*)'] if isinstance(s_cnt, dict) else s_cnt[0]

                        if s_count > 0 and (m_count == 0 or (tbl == 'users' and m_count <= 1)):
                            s_cur.execute(f"SELECT * FROM {tbl}")
                            s_rows = s_cur.fetchall()
                            migrated_count = 0
                            for row in s_rows:
                                row_dict = dict(row)
                                cols = list(row_dict.keys())
                                vals = list(row_dict.values())
                                placeholders = ", ".join(["%s"] * len(cols))
                                col_names = ", ".join([f"`{c}`" for c in cols])
                                if tbl == 'users':
                                    cur.execute(f"INSERT INTO {tbl} ({col_names}) VALUES ({placeholders}) ON DUPLICATE KEY UPDATE password=VALUES(password), role=VALUES(role)", vals)
                                else:
                                    cur.execute(f"INSERT IGNORE INTO {tbl} ({col_names}) VALUES ({placeholders})", vals)
                                migrated_count += 1
                            con.commit()
                            print(f"[DB MIGRATION] Safely imported {migrated_count} records from SQLite into MySQL for table '{tbl}'.")
                    except Exception as err:
                        print(f"[DB MIGRATION NOTICE] Table {tbl}: {err}")
            s_con.close()
        except Exception as e:
            print(f"[DB MIGRATION WARNING] Failed auto-sync from SQLite to MySQL: {e}")

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

@app.route("/ppc/work-order/edit/<int:id>", methods=["GET", "POST"])
@role_required(['manager', 'admin'])
def edit_work_order(id):
    con = db(); cur = con.cursor()
    if request.method == "POST":
        new_wo = request.form.get("work_order", "").strip()
        if new_wo:
            cur.execute("UPDATE work_orders SET work_order = ? WHERE id = ?", (new_wo, id))
            con.commit(); con.close()
            flash("Work order updated successfully", "success")
            return redirect(url_for("ppc"))
    cur.execute("SELECT * FROM work_orders WHERE id = ?", (id,))
    wo = cur.fetchone()
    con.close()
    if not wo:
        flash("Work order not found", "danger")
        return redirect(url_for("ppc"))
    return render_template("edit_work_order.html", wo=wo)

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

@app.route("/ppc/plan/edit/<int:id>", methods=["GET", "POST"])
@role_required(['manager', 'admin'])
def edit_plan(id):
    con = db(); cur = con.cursor()
    if request.method == "POST":
        p_id = request.form.get("plan_id", "").strip()
        if p_id:
            cur.execute("UPDATE plans SET plan_id = ? WHERE id = ?", (p_id, id))
            con.commit(); con.close()
            flash("Plan updated successfully", "success")
            return redirect(url_for("ppc"))
    cur.execute("SELECT * FROM plans WHERE id = ?", (id,))
    plan = cur.fetchone()
    con.close()
    if not plan:
        flash("Plan not found", "danger")
        return redirect(url_for("ppc"))
    return render_template("edit_plan.html", plan=plan)

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

@app.route("/ppc/bag/edit/<int:id>", methods=["GET", "POST"])
@role_required(['manager', 'admin'])
def edit_bag(id):
    con = db(); cur = con.cursor()
    if request.method == "POST":
        bag_no = request.form.get("bag_number", "").strip()
        shade = request.form.get("shade", "").strip()
        if bag_no:
            cur.execute("UPDATE bags SET bag_number = ?, shade = ? WHERE id = ?", (bag_no, shade, id))
            con.commit(); con.close()
            flash("Bag updated successfully", "success")
            return redirect(url_for("ppc"))
    cur.execute("SELECT * FROM bags WHERE id = ?", (id,))
    bag = cur.fetchone()
    con.close()
    if not bag:
        flash("Bag not found", "danger")
        return redirect(url_for("ppc"))
    return render_template("edit_bag.html", bag=bag)

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
        job_text = (request.form.get("job_text") or "").strip()
        work_order = (request.form.get("work_order") or "").strip()
        shade = (request.form.get("shade") or "").strip()
        job_id = (request.form.get("job_id") or "").strip()
        needles = (request.form.get("needles") or "24N").strip()
        machine = (request.form.get("machine") or "").strip()
        unit = request.form.get("unit", 1)

        # Build fallback job_text if client JS did not compose it
        if not job_text:
            j_clean = job_id if job_id else "1"
            if work_order:
                job_text = f"{j_clean}/{work_order}"
            else:
                job_text = f"Job-{j_clean}"

        # Ensure Job record exists in jobs table so Roll Entry finds it without failing
        if work_order and shade:
            try:
                cur.execute("""
                    SELECT id FROM jobs 
                    WHERE LOWER(TRIM(work_order_ref)) = LOWER(TRIM(?)) 
                      AND LOWER(TRIM(shade_ref)) = LOWER(TRIM(?)) 
                      AND LOWER(TRIM(needles_ref)) = LOWER(TRIM(?))
                """, (work_order, shade, needles))
                if not cur.fetchone():
                    try:
                        j_num = int(job_id) if job_id.isdigit() else 1
                    except Exception:
                        j_num = 1
                    cur.execute("""
                        INSERT INTO jobs (job, work_order_ref, shade_ref, needles_ref)
                        VALUES (?, ?, ?, ?)
                    """, (j_num, work_order, shade, needles))
                    con.commit()
            except Exception as e:
                print(f"[WARN] Error ensuring jobs record: {e}")

        while True:
            code = ''.join(random.choices(string.digits, k=5))
            cur.execute("SELECT 1 FROM machine_assignments WHERE unique_code=?", (code,))
            if not cur.fetchone():
                break

        cur.execute("""
            INSERT INTO machine_assignments 
            (job_full_text, needles, machine_no, unit_no, unique_code, created_at, work_order, shade) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (job_text, needles, machine, unit, code, datetime.now().strftime("%Y-%m-%d %H:%M"), work_order, shade))
        con.commit()
        flash(f"Machine M#{machine} assigned to {job_text}. 5-Digit Barcode: {code}", "success")
        con.close()
        return redirect(url_for("machine_sign"))

    cur.execute("SELECT DISTINCT work_order FROM work_orders ORDER BY work_order DESC")
    work_orders = cur.fetchall()

    cur.execute("SELECT * FROM machine_assignments ORDER BY id DESC LIMIT 50")
    recent_assignments = cur.fetchall()
    con.close()
    return render_template("machine_sign.html", work_orders=work_orders, assignments=recent_assignments)

@app.route("/machine-sign/delete/<int:id>")
def delete_machine_sign(id):
    con = db(); cur = con.cursor()
    cur.execute("DELETE FROM machine_assignments WHERE id = ?", (id,))
    con.commit(); con.close()
    flash("Machine signed out successfully.", "info")
    return redirect(url_for("machine_sign"))

# ================= ROLL ENTRY & BARCODE SYSTEM =================
def get_ready_work_orders(cur):
    """
    Returns Work Orders from PPC so the user can easily select any active Work Order.
    Prioritizes complete-series work orders (WO -> Plan -> Bag -> Lot -> Machine Assignment).
    """
    try:
        # First priority: Complete series
        cur.execute("""
            SELECT DISTINCT wo.work_order
            FROM work_orders wo
            JOIN plans p ON p.work_order_id = wo.id
            JOIN bags b ON b.plan_id = p.id
            JOIN lots l ON l.bag_id = b.id
            JOIN machine_assignments m ON (
                (m.work_order IS NOT NULL AND LOWER(TRIM(m.work_order)) = LOWER(TRIM(wo.work_order)))
                OR (m.job_full_text LIKE CONCAT('%', wo.work_order, '%'))
            )
            WHERE m.unique_code IS NOT NULL AND LENGTH(TRIM(m.unique_code)) = 5
            ORDER BY wo.work_order DESC
        """)
        ready = [r['work_order'] if isinstance(r, dict) else r[0] for r in cur.fetchall() if (r['work_order'] if isinstance(r, dict) else r[0])]

        # Also include all work orders that have plans created in PPC
        cur.execute("""
            SELECT DISTINCT wo.work_order
            FROM work_orders wo
            JOIN plans p ON p.work_order_id = wo.id
            ORDER BY wo.work_order DESC
        """)
        with_plans = [r['work_order'] if isinstance(r, dict) else r[0] for r in cur.fetchall() if (r['work_order'] if isinstance(r, dict) else r[0])]

        # Merge deduplicated
        seen = set()
        result = []
        for w in ready + with_plans:
            w_str = str(w).strip()
            if w_str and w_str not in seen:
                seen.add(w_str)
                result.append(w_str)

        if not result:
            cur.execute("SELECT DISTINCT work_order FROM work_orders ORDER BY work_order DESC")
            for r in cur.fetchall():
                w_str = (r['work_order'] if isinstance(r, dict) else r[0] or '').strip()
                if w_str and w_str not in seen:
                    seen.add(w_str)
                    result.append(w_str)
        return result
    except Exception as e:
        print(f"[WARN] Error fetching ready work orders: {e}")
        return []

@app.route("/api/machine-barcode/<code>")
@app.route("/api/machine-barcode")
def api_machine_barcode(code=None):
    if not code:
        code = request.args.get("code") or request.args.get("barcode") or ""
    code = str(code).strip()
    if not code:
        return jsonify({"found": False, "message": "5-Digit Machine Barcode is required."}), 400

    con = db(); cur = con.cursor()
    try:
        cur.execute("""
            SELECT m.*, j.shade_ref
            FROM machine_assignments m
            LEFT JOIN jobs j ON m.job_full_text LIKE CONCAT('%', j.job, '%')
            WHERE TRIM(m.unique_code) = ?
            ORDER BY m.id DESC LIMIT 1
        """, (code,))
        row = cur.fetchone()
        if not row:
            return jsonify({
                "found": False,
                "message": f"5-Digit Barcode '{code}' registered nahi hai! Pehle Machine Sign-In (/machine-sign) karein."
            }), 404

        item = dict(row) if isinstance(row, dict) else {
            'id': row[0], 'job_full_text': row[1], 'needles': row[2], 'machine_no': row[3],
            'unit_no': row[4], 'unique_code': row[5], 'created_at': row[6],
            'work_order': row[7] if len(row) > 7 else '', 'shade': row[8] if len(row) > 8 else ''
        }

        wo = item.get('work_order')
        if not wo and item.get('job_full_text') and '/' in item['job_full_text']:
            wo = item['job_full_text'].split('/', 1)[1].strip()

        shade = item.get('shade') or item.get('shade_ref') or ''

        return jsonify({
            "found": True,
            "unique_code": item.get('unique_code'),
            "machine_no": item.get('machine_no'),
            "unit_no": item.get('unit_no'),
            "needles": item.get('needles'),
            "work_order": wo or '',
            "shade": shade,
            "job_full_text": item.get('job_full_text')
        })
    except Exception as e:
        return jsonify({"found": False, "message": str(e)}), 500
    finally:
        con.close()

@app.route("/roll-entry")
@role_required(['clerk', 'incharge', 'manager'])
def roll_entry():
    con = db(); cur = con.cursor()
    work_orders = get_ready_work_orders(cur)
    con.close()
    return render_template("roll_entry_select.html", work_orders=work_orders)

@app.route("/api/plans")
@app.route("/api/plans/<path:work_order>")
def api_plans(work_order=None):
    if not work_order:
        work_order = request.args.get("wo") or request.args.get("work_order") or ""
    work_order = unquote(work_order).strip() if work_order else ""
    con = db(); cur = con.cursor()
    plans_list = []
    seen = set()

    if work_order:
        clean_wo = work_order.split('/')[-1].strip()
        try:
            cur.execute("""
                SELECT p.id, p.plan_id, p.work_order_id, wo.work_order
                FROM plans p
                LEFT JOIN work_orders wo ON p.work_order_id = wo.id
                WHERE LOWER(TRIM(COALESCE(wo.work_order, ''))) = LOWER(TRIM(?))
                   OR LOWER(TRIM(COALESCE(wo.work_order, ''))) = LOWER(TRIM(?))
                   OR CAST(wo.id AS CHAR) = ?
                   OR CAST(p.work_order_id AS CHAR) = ?
                   OR (wo.work_order IS NOT NULL AND LOWER(TRIM(wo.work_order)) LIKE LOWER(TRIM(?)))
                ORDER BY p.id ASC
            """, (work_order, clean_wo, clean_wo, clean_wo, f"%{clean_wo}%"))
            for r in cur.fetchall():
                p_id = r.get('id') if isinstance(r, dict) else r[0]
                p_code = r.get('plan_id') if isinstance(r, dict) else (r[1] if len(r) > 1 else None)
                final_code = (p_code or '').strip() or f"Plan-{p_id}"
                if final_code not in seen:
                    seen.add(final_code)
                    plans_list.append(final_code)
        except Exception as e:
            print(f"[WARN] api_plans error: {e}")

    # Fallback directly on plans table if work_order_id matches numeric or string
    if not plans_list and work_order:
        try:
            clean_wo = work_order.split('/')[-1].strip()
            cur.execute("""
                SELECT id, plan_id FROM plans 
                WHERE CAST(work_order_id AS CHAR) = ? 
                   OR LOWER(TRIM(CAST(work_order_id AS CHAR))) = LOWER(TRIM(?))
                   OR LOWER(TRIM(COALESCE(plan_id, ''))) = LOWER(TRIM(?))
            """, (clean_wo, clean_wo, clean_wo))
            for r in cur.fetchall():
                p_id = r.get('id') if isinstance(r, dict) else r[0]
                p_code = r.get('plan_id') if isinstance(r, dict) else (r[1] if len(r) > 1 else None)
                final_code = (p_code or '').strip() or f"Plan-{p_id}"
                if final_code not in seen:
                    seen.add(final_code)
                    plans_list.append(final_code)
        except Exception as e:
            print(f"[WARN] api_plans fallback error: {e}")

    # Extra relaxed fallback: match alphanumeric tokens
    if not plans_list and work_order:
        try:
            alphanumeric_wo = ''.join(c for c in work_order if c.isalnum()).lower()
            cur.execute("""
                SELECT p.id, p.plan_id, wo.work_order
                FROM plans p
                LEFT JOIN work_orders wo ON p.work_order_id = wo.id
            """)
            for r in cur.fetchall():
                p_id = r.get('id') if isinstance(r, dict) else r[0]
                p_code = r.get('plan_id') if isinstance(r, dict) else (r[1] if len(r) > 1 else None)
                wo_name = (r.get('work_order') if isinstance(r, dict) else (r[2] if len(r) > 2 else '')) or ''
                p_clean = ''.join(c for c in (p_code or '') if c.isalnum()).lower()
                wo_clean = ''.join(c for c in wo_name if c.isalnum()).lower()
                if alphanumeric_wo and (alphanumeric_wo in p_clean or alphanumeric_wo in wo_clean or (wo_clean and wo_clean in alphanumeric_wo)):
                    final_code = (p_code or '').strip() or f"Plan-{p_id}"
                    if final_code not in seen:
                        seen.add(final_code)
                        plans_list.append(final_code)
        except Exception:
            pass

    con.close()
    return jsonify(plans_list)

@app.route("/api/bags")
@app.route("/api/bags/<path:plan_id>")
def api_bags(plan_id=None):
    if not plan_id:
        plan_id = request.args.get("plan_id") or request.args.get("plan") or ""
    plan_id = unquote(plan_id).strip() if plan_id else ""
    con = db(); cur = con.cursor()
    data = []
    if plan_id:
        try:
            cur.execute("""
                SELECT b.id, b.bag_number, b.shade, p.plan_id 
                FROM bags b
                JOIN plans p ON b.plan_id = p.id
                LEFT JOIN finalized_bags fb ON LOWER(TRIM(b.bag_number)) = LOWER(TRIM(fb.bag_number))
                WHERE (LOWER(TRIM(COALESCE(p.plan_id, ''))) = LOWER(TRIM(?))
                   OR CAST(p.id AS CHAR) = ? 
                   OR CAST(b.plan_id AS CHAR) = ?
                   OR LOWER(TRIM(COALESCE(p.plan_id, ''))) LIKE ?)
                  AND fb.bag_number IS NULL
                ORDER BY b.id ASC
            """, (plan_id, plan_id, plan_id, f"%{plan_id}%"))
            for b in cur.fetchall():
                b_id = b.get('id') if isinstance(b, dict) else b[0]
                bag_no = b.get('bag_number') if isinstance(b, dict) else b[1]
                shade = b.get('shade') if isinstance(b, dict) else b[2]
                shade_str = (shade or "").strip()
                label = f"{bag_no} ({shade_str})" if shade_str else str(bag_no)
                data.append({"id": b_id, "bag_number": str(bag_no), "shade": shade_str, "label": label})
        except Exception as e:
            print(f"[WARN] api_bags error: {e}")
    con.close()
    return jsonify(data)

@app.route("/api/lots")
@app.route("/api/lots/<path:bag_number>")
def api_lots(bag_number=None):
    if not bag_number:
        bag_number = request.args.get("bag_number") or request.args.get("bag") or ""
    bag_id_param = request.args.get("bag_id") or ""
    bag_number = unquote(bag_number).strip() if bag_number else ""
    con = db(); cur = con.cursor()
    data = []

    clean_bag = bag_number.split('(')[0].strip() if bag_number else ""

    try:
        matched_bag_ids = set()
        matched_bag_numbers = set()

        if bag_id_param and str(bag_id_param).strip().isdigit():
            matched_bag_ids.add(int(bag_id_param))

        if clean_bag:
            matched_bag_numbers.add(clean_bag)
            matched_bag_numbers.add(clean_bag.lower())

            # Find bag(s) in bags table
            cur.execute("""
                SELECT id, bag_number FROM bags 
                WHERE LOWER(TRIM(bag_number)) = LOWER(TRIM(?))
                   OR LOWER(TRIM(bag_number)) = LOWER(TRIM(?))
                   OR CAST(id AS CHAR) = ?
                   OR LOWER(TRIM(bag_number)) LIKE LOWER(TRIM(?))
            """, (bag_number, clean_bag, clean_bag, f"%{clean_bag}%"))
            for r in cur.fetchall():
                b_id = r.get('id') if isinstance(r, dict) else r[0]
                b_no = r.get('bag_number') if isinstance(r, dict) else (r[1] if len(r) > 1 else None)
                if b_id is not None:
                    matched_bag_ids.add(b_id)
                if b_no:
                    matched_bag_numbers.add(str(b_no))
                    matched_bag_numbers.add(str(b_no).lower())

        if clean_bag and clean_bag.isdigit():
            matched_bag_ids.add(int(clean_bag))

        raw_lots = []
        seen_lot_ids = set()

        # Query lots directly by bag_id (same reliable query as PPC)
        for b_id in matched_bag_ids:
            cur.execute("""
                SELECT id, bag_id, lot_name, fabric_length, fabric_weight, plan_weight, bag_weight, needles, job_id, remarks
                FROM lots
                WHERE bag_id = ?
                ORDER BY id ASC
            """, (b_id,))
            for l in cur.fetchall():
                l_dict = dict(l)
                if l_dict['id'] not in seen_lot_ids:
                    seen_lot_ids.add(l_dict['id'])
                    raw_lots.append(l_dict)

        # Fallback: query lots by lot_name if still empty
        if not raw_lots and clean_bag:
            cur.execute("""
                SELECT id, bag_id, lot_name, fabric_length, fabric_weight, plan_weight, bag_weight, needles, job_id, remarks
                FROM lots
                WHERE LOWER(TRIM(lot_name)) = LOWER(TRIM(?))
                ORDER BY id ASC
            """, (clean_bag,))
            for l in cur.fetchall():
                l_dict = dict(l)
                if l_dict['id'] not in seen_lot_ids:
                    seen_lot_ids.add(l_dict['id'])
                    raw_lots.append(l_dict)

        # Build response with roll count and last barcode
        for l in raw_lots:
            lot_name = l.get('lot_name')
            b_id = l.get('bag_id')

            cur.execute("""
                SELECT barcode_used, machine_no
                FROM fabric_rolls
                WHERE LOWER(TRIM(lot_name)) = LOWER(TRIM(?))
                ORDER BY id DESC LIMIT 1
            """, (lot_name,))
            last_roll = cur.fetchone()

            cur.execute("""
                SELECT COUNT(*) as cnt FROM fabric_rolls 
                WHERE LOWER(TRIM(lot_name)) = LOWER(TRIM(?))
            """, (lot_name,))
            rc_res = cur.fetchone()
            rc = (rc_res.get('cnt') if isinstance(rc_res, dict) else rc_res[0]) if rc_res else 0

            weight_val = float(l.get('fabric_weight') or 0)
            plan_val = float(l.get('plan_weight') or weight_val)

            item = {
                "id": l.get('id'),
                "bag_id": b_id,
                "lot_name": lot_name,
                "needles": l.get('needles') or '24N',
                "fabric_weight": weight_val,
                "rem_weight": weight_val,
                "plan_weight": plan_val,
                "barcode": (last_roll.get('barcode_used') if isinstance(last_roll, dict) else last_roll[0]) if last_roll and rc > 0 else None,
                "machine_no": (last_roll.get('machine_no') if isinstance(last_roll, dict) else (last_roll[1] if len(last_roll) > 1 else None)) if last_roll and rc > 0 else None,
                "roll_count": rc
            }
            data.append(item)

    except Exception as e:
        print(f"[ERROR] api_lots error: {e}")
        try:
            if clean_bag:
                cur.execute("SELECT * FROM lots WHERE LOWER(TRIM(lot_name)) = LOWER(TRIM(?)) OR CAST(bag_id AS CHAR) = ?", (clean_bag, clean_bag))
                for l in cur.fetchall():
                    ld = dict(l)
                    w = float(ld.get('fabric_weight') or 0)
                    data.append({
                        "id": ld.get('id'),
                        "bag_id": ld.get('bag_id'),
                        "lot_name": ld.get('lot_name'),
                        "needles": ld.get('needles') or '24N',
                        "fabric_weight": w,
                        "rem_weight": w,
                        "plan_weight": float(ld.get('plan_weight') or w),
                        "barcode": None,
                        "machine_no": None,
                        "roll_count": 0
                    })
        except Exception:
            pass

    con.close()
    return jsonify(data)

@app.route("/api/shades-by-wo")
@app.route("/api/shades-by-wo/<path:wo_name>")
def shades_by_wo(wo_name=None):
    if not wo_name:
        wo_name = request.args.get("wo") or request.args.get("work_order") or ""
    wo_name = unquote(wo_name).strip() if wo_name else ""

    con = db(); cur = con.cursor()
    shades = []
    seen = set()

    def add_shade(val):
        if val is not None:
            s = str(val).strip()
            if s and s.lower() not in ('none', 'null', '') and s.lower() not in seen:
                seen.add(s.lower())
                shades.append(s)

    if wo_name:
        # 1. STRICTLY: Shades belonging to this specific Work Order's Plans & Bags
        try:
            cur.execute("""
                SELECT DISTINCT b.shade FROM bags b
                JOIN plans p ON b.plan_id = p.id
                JOIN work_orders wo ON p.work_order_id = wo.id
                WHERE LOWER(TRIM(wo.work_order)) = LOWER(TRIM(?))
                ORDER BY b.shade ASC
            """, (wo_name,))
            for r in cur.fetchall():
                val = r['shade'] if isinstance(r, dict) or hasattr(r, '__getitem__') else r[0]
                add_shade(val)
        except Exception as e:
            print(f"[WARN] bags shade query error: {e}")

        # 2. Also check jobs specifically linked to this Work Order
        try:
            cur.execute("""
                SELECT DISTINCT shade_ref FROM jobs 
                WHERE LOWER(TRIM(work_order_ref)) = LOWER(TRIM(?))
                ORDER BY shade_ref ASC
            """, (wo_name,))
            for r in cur.fetchall():
                val = r['shade_ref'] if isinstance(r, dict) or hasattr(r, '__getitem__') else r[0]
                add_shade(val)
        except Exception as e:
            print(f"[WARN] jobs shade query error: {e}")

    con.close()
    return jsonify(shades)

@app.route("/api/jobs-by-shade")
@app.route("/api/jobs-by-shade/<path:subpath>")
def jobs_by_shade(subpath=None):
    wo_name = request.args.get("wo") or request.args.get("work_order")
    shade_name = request.args.get("shade")
    if subpath and not (wo_name and shade_name):
        parts = subpath.split('/')
        if len(parts) >= 2:
            wo_name = "/".join(parts[:-1])
            shade_name = parts[-1]
        elif len(parts) == 1:
            wo_name = parts[0]
            shade_name = ""

    wo_name = unquote(wo_name).strip() if wo_name else ""
    shade_name = unquote(shade_name).strip() if shade_name else ""

    con = db(); cur = con.cursor()
    data = []

    if wo_name and shade_name:
        try:
            cur.execute("""
                SELECT job, needles_ref FROM jobs 
                WHERE LOWER(TRIM(work_order_ref)) = LOWER(TRIM(?)) 
                  AND LOWER(TRIM(shade_ref)) = LOWER(TRIM(?))
                ORDER BY job ASC
            """, (wo_name, shade_name))
            rows = cur.fetchall()
            for r in rows:
                data.append(dict(r))
        except Exception as e:
            print(f"[WARN] jobs query error: {e}")

    # Fallback to check lots if not yet in jobs
    if not data and wo_name and shade_name:
        try:
            cur.execute("""
                SELECT DISTINCT l.needles, l.job_id FROM lots l
                JOIN bags b ON l.bag_id = b.id
                JOIN plans p ON b.plan_id = p.id
                JOIN work_orders wo ON p.work_order_id = wo.id
                WHERE LOWER(TRIM(wo.work_order)) = LOWER(TRIM(?)) 
                  AND LOWER(TRIM(b.shade)) = LOWER(TRIM(?))
            """, (wo_name, shade_name))
            rows = cur.fetchall()
            for r in rows:
                item = dict(r)
                job_num = item.get('job_id') or 1
                needles_val = item.get('needles') or '24N'
                data.append({"job": job_num, "needles_ref": needles_val})
        except Exception:
            pass

    # Ensure at least one viable job entry so user can sign in immediately
    if not data:
        data.append({"job": 1, "needles_ref": "24N"})

    con.close()
    return jsonify(data)

@app.route("/api/assignments-by-wo")
@app.route("/api/assignments-by-wo/<path:wo_name>")
def assignments_by_wo(wo_name=None):
    if not wo_name:
        wo_name = request.args.get("wo") or request.args.get("work_order") or ""
    wo_name = unquote(wo_name).strip() if wo_name else ""

    con = db(); cur = con.cursor()
    try:
        if wo_name:
            cur.execute("""
                SELECT id, unique_code, machine_no, unit_no, job_full_text, needles, created_at
                FROM machine_assignments
                WHERE job_full_text LIKE ? OR job_full_text LIKE ?
                ORDER BY id DESC
            """, (f"%/{wo_name}", f"%{wo_name}%"))
        else:
            cur.execute("""
                SELECT id, unique_code, machine_no, unit_no, job_full_text, needles, created_at
                FROM machine_assignments
                ORDER BY id DESC LIMIT 50
            """)
        rows = [dict(r) for r in cur.fetchall()]
    except Exception as e:
        print(f"[WARN] assignments query error: {e}")
        rows = []
    finally:
        con.close()
    return jsonify(rows)

@app.route("/api/barcode-details/<barcode>")
def api_barcode_details(barcode):
    con = db(); cur = con.cursor()
    cur.execute("SELECT * FROM machine_assignments WHERE unique_code = ?", (barcode,))
    row = cur.fetchone()
    con.close()
    if row:
        return jsonify(dict(row))
    return jsonify({"error": "Barcode not found"}), 404

@app.route("/api/validate-roll-match", methods=["GET", "POST"])
def api_validate_roll_match():
    """Validates whether machine assignment barcode matches the chosen lot, shade, and work order"""
    if request.method == "POST":
        d = request.json or {}
    else:
        d = request.args

    barcode = str(d.get("barcode") or d.get("code") or "").strip()
    wo_val = str(d.get("work_order") or "").strip()
    shade_val = str(d.get("shade") or "").strip()
    needles_val = str(d.get("needles") or "").strip()

    if not barcode:
        return jsonify({"valid": False, "mismatch_type": "empty_barcode", "message": "5-Digit Machine Barcode is required."}), 400

    con = db(); cur = con.cursor()
    try:
        cur.execute("""
            SELECT m.*, j.shade_ref
            FROM machine_assignments m
            LEFT JOIN jobs j ON m.job_full_text LIKE CONCAT('%', j.job, '%')
            WHERE TRIM(m.unique_code) = ?
            ORDER BY m.id DESC LIMIT 1
        """, (barcode,))
        m_row = cur.fetchone()
        if not m_row:
            return jsonify({
                "valid": False,
                "mismatch_type": "barcode_not_found",
                "message": f"5-Digit Barcode '{barcode}' system mein registered nahi hai! Pehle Machine Sign-In (/machine-sign) karein."
            }), 404

        m_dict = dict(m_row) if isinstance(m_row, dict) else {
            'machine_no': m_row[3], 'needles': m_row[2], 'work_order': m_row[7] if len(m_row) > 7 else '',
            'shade': m_row[8] if len(m_row) > 8 else '', 'job_full_text': m_row[1]
        }

        m_needles = (m_dict.get('needles') or '').strip().upper()
        m_shade = (m_dict.get('shade') or m_dict.get('shade_ref') or '').strip().lower()
        m_wo = (m_dict.get('work_order') or '').strip().upper()
        if not m_wo and '/' in m_dict.get('job_full_text', ''):
            m_wo = m_dict['job_full_text'].split('/', 1)[1].strip().upper()

        machine_spec = {
            "unique_code": barcode,
            "machine_no": m_dict.get('machine_no', 'M-01'),
            "needles": m_needles,
            "shade": m_dict.get('shade') or m_dict.get('shade_ref') or '',
            "work_order": m_wo
        }

        # 1. Needles validation
        if needles_val and m_needles and needles_val.strip().upper() != m_needles:
            return jsonify({
                "valid": False,
                "mismatch_type": "needles",
                "message": f"Needles Mismatch! Machine Sign Barcode ki Needles ({m_needles}) chuni hui Lot ki Needles ({needles_val}) se match nahi kar rahi!",
                "machine_spec": machine_spec,
                "lot_spec": {"needles": needles_val, "shade": shade_val, "work_order": wo_val}
            }), 400

        # 2. Work Order validation
        if wo_val and m_wo and wo_val.strip().upper() != m_wo:
            return jsonify({
                "valid": False,
                "mismatch_type": "work_order",
                "message": f"Work Order Mismatch! Ye 5-digit barcode Work Order '{m_wo}' ke liye signed hai, jabke chuna gaya Work Order '{wo_val}' hai!",
                "machine_spec": machine_spec,
                "lot_spec": {"needles": needles_val, "shade": shade_val, "work_order": wo_val}
            }), 400

        # 3. Shade validation
        if shade_val and m_shade and shade_val.strip().lower() != m_shade:
            return jsonify({
                "valid": False,
                "mismatch_type": "shade",
                "message": f"Shade Mismatch! Machine Sign Barcode ka Shade '{m_dict.get('shade') or m_dict.get('shade_ref')}' Bag ke Shade '{shade_val}' se match nahi kar raha!",
                "machine_spec": machine_spec,
                "lot_spec": {"needles": needles_val, "shade": shade_val, "work_order": wo_val}
            }), 400

        return jsonify({
            "valid": True,
            "message": "All specifications match!",
            "machine_spec": machine_spec
        })
    except Exception as e:
        return jsonify({"valid": False, "message": str(e)}), 500
    finally:
        con.close()

@app.route("/api/lot-rolls")
def api_lot_rolls():
    wo = (request.args.get("wo") or request.args.get("work_order") or "").strip()
    bag = (request.args.get("bag") or request.args.get("bag_number") or "").strip()
    lot = (request.args.get("lot") or request.args.get("lot_name") or "").strip()

    con = db(); cur = con.cursor()
    rolls = []
    summary = {
        "total_rolls": 0,
        "total_weight": 0.0,
        "next_roll_no": 1,
        "lot_needles": "24N",
        "bag_shade": "",
        "work_order": wo,
        "rem_weight": 0.0,
        "plan_weight": 0.0,
        "latest_roll": None
    }

    try:
        # Fetch lot and bag info
        cur.execute("""
            SELECT l.needles, l.fabric_weight as rem_weight, l.plan_weight, b.shade, wo_tbl.work_order
            FROM lots l
            JOIN bags b ON l.bag_id = b.id
            JOIN plans p ON b.plan_id = p.id
            JOIN work_orders wo_tbl ON p.work_order_id = wo_tbl.id
            WHERE LOWER(TRIM(b.bag_number)) = LOWER(TRIM(?)) 
              AND LOWER(TRIM(l.lot_name)) = LOWER(TRIM(?))
            LIMIT 1
        """, (bag, lot))
        lot_meta = cur.fetchone()
        if lot_meta:
            m_dict = dict(lot_meta) if isinstance(lot_meta, dict) else {
                'needles': lot_meta[0], 'rem_weight': lot_meta[1], 'plan_weight': lot_meta[2],
                'shade': lot_meta[3], 'work_order': lot_meta[4]
            }
            summary["lot_needles"] = m_dict.get('needles') or '24N'
            summary["bag_shade"] = m_dict.get('shade') or ''
            summary["rem_weight"] = float(m_dict.get('rem_weight') or 0)
            summary["plan_weight"] = float(m_dict.get('plan_weight') or 0)
            if not summary["work_order"] and m_dict.get('work_order'):
                summary["work_order"] = m_dict.get('work_order')

        # Fetch all rolls for this bag and lot
        cur.execute("""
            SELECT r.id, r.roll_no, r.weight, r.tube_no, r.created_at, 
                   r.barcode_used, r.roll_barcode, r.machine_no, r.needles,
                   COALESCE(r.is_merged, 0) as is_merged,
                   COALESCE(r.merge_count, 0) as merge_count
            FROM fabric_rolls r
            WHERE LOWER(TRIM(r.bag_number)) = LOWER(TRIM(?))
              AND LOWER(TRIM(r.lot_name)) = LOWER(TRIM(?))
            ORDER BY r.roll_no ASC, r.id ASC
        """, (bag, lot))
        rows = cur.fetchall()
        max_roll_no = 0
        total_w = 0.0

        for r in rows:
            item = dict(r) if isinstance(r, dict) else {
                'id': r[0], 'roll_no': r[1], 'weight': r[2], 'tube_no': r[3],
                'created_at': r[4], 'barcode_used': r[5], 'roll_barcode': r[6],
                'machine_no': r[7], 'needles': r[8], 'is_merged': r[9] if len(r) > 9 else 0,
                'merge_count': r[10] if len(r) > 10 else 0
            }
            w = float(item.get('weight') or 0)
            total_w += w
            r_no = int(item.get('roll_no') or 0)
            if r_no > max_roll_no:
                max_roll_no = r_no
            rolls.append(item)

        summary["total_rolls"] = len(rolls)
        summary["total_weight"] = round(total_w, 2)
        summary["next_roll_no"] = max_roll_no + 1 if max_roll_no > 0 else 1

        if rolls:
            latest = rolls[-1]
            summary["latest_roll"] = {
                "roll_no": latest.get("roll_no"),
                "barcode": latest.get("roll_barcode"),
                "machine_barcode": latest.get("barcode_used"),
                "machine_no": latest.get("machine_no") or "M-01",
                "weight": latest.get("weight"),
                "tube_no": latest.get("tube_no") or "T-101",
                "created_at": latest.get("created_at"),
                "shade": summary.get("bag_shade"),
                "job_wo": f"{summary.get('work_order', '')}"
            }

    except Exception as e:
        print(f"[WARN] api_lot_rolls error: {e}")
    finally:
        con.close()

    return jsonify({"success": True, "rolls": rolls, "summary": summary})

@app.route("/api/save-roll", methods=["POST"])
def api_save_roll():
    data = request.json or {}
    con = db(); cur = con.cursor()
    try:
        cur.execute("""
            SELECT b.shade, wo.work_order, b.plan_id
            FROM bags b
            JOIN plans p ON b.plan_id = p.id
            JOIN work_orders wo ON p.work_order_id = wo.id
            WHERE LOWER(TRIM(b.bag_number)) = LOWER(TRIM(?))
        """, (data.get('bag_number'),))
        meta = cur.fetchone()
        if not meta:
            return jsonify({"success": False, "message": "Bag/Work Order not found!"}), 404

        shade = (meta['shade'] or '')
        wo_val = meta['work_order']

        barcode_scanned = str(data.get('barcode', '')).strip()
        if not barcode_scanned:
            return jsonify({"success": False, "message": "5-Digit Machine Barcode is required!"}), 400

        cur.execute("""
            SELECT m.*, j.shade_ref
            FROM machine_assignments m
            LEFT JOIN jobs j ON m.job_full_text LIKE CONCAT('%', j.job, '%')
            WHERE TRIM(m.unique_code) = ?
            ORDER BY m.id DESC LIMIT 1
        """, (barcode_scanned,))
        m_row = cur.fetchone()
        if not m_row:
            return jsonify({
                "success": False,
                "mismatch_type": "barcode_not_found",
                "message": f"5-Digit Machine Barcode '{barcode_scanned}' system mein registered nahi hai! Pehle Machine Sign-In (/machine-sign) karein."
            }), 400

        m_dict = dict(m_row) if isinstance(m_row, dict) else {
            'machine_no': m_row[3], 'needles': m_row[2], 'work_order': m_row[7] if len(m_row) > 7 else '',
            'shade': m_row[8] if len(m_row) > 8 else '', 'job_full_text': m_row[1]
        }

        # 1. Needles match validation
        m_needles = (m_dict.get('needles') or '').strip().upper()
        lot_needles = str(data.get('needles', '')).strip().upper()
        if m_needles and lot_needles and m_needles != lot_needles:
            return jsonify({
                "success": False,
                "mismatch_type": "needles",
                "message": f"Needles Mismatch! Machine Sign Barcode ki Needles ({m_needles}) chuni hui Lot ki Needles ({lot_needles}) se match nahi kar rahi!"
            }), 400

        # 2. Work Order match validation
        m_wo = (m_dict.get('work_order') or '').strip().upper()
        if not m_wo and '/' in m_dict.get('job_full_text', ''):
            m_wo = m_dict['job_full_text'].split('/', 1)[1].strip().upper()
        if m_wo and wo_val and m_wo != wo_val.strip().upper():
            return jsonify({
                "success": False,
                "mismatch_type": "work_order",
                "message": f"Work Order Mismatch! Ye 5-digit barcode Work Order '{m_wo}' ke liye signed hai, jabke selected Work Order '{wo_val}' hai!"
            }), 400

        # 3. Shade match validation
        m_shade = (m_dict.get('shade') or m_dict.get('shade_ref') or '').strip().lower()
        b_shade = shade.strip().lower()
        if m_shade and b_shade and m_shade != b_shade:
            return jsonify({
                "success": False,
                "mismatch_type": "shade",
                "message": f"Shade Mismatch! Machine Sign Barcode ka Shade '{m_dict.get('shade') or m_dict.get('shade_ref')}' Bag ke Shade '{shade}' se match nahi kar raha!"
            }), 400

        machine_no = m_dict.get('machine_no', 'M-01')

        # Auto-create or fetch job record
        cur.execute("""
            SELECT job FROM jobs 
            WHERE LOWER(TRIM(work_order_ref)) = LOWER(TRIM(?)) 
              AND LOWER(TRIM(shade_ref)) = LOWER(TRIM(?))
        """, (wo_val, shade))
        job_row = cur.fetchone()
        current_job_id = job_row['job'] if job_row else 1
        current_job_full = f"{current_job_id}/{wo_val}"

        # Check user-entered roll number for merge or manual assignment
        input_roll_no = str(data.get('roll_no') or '').strip()
        target_roll_no = int(input_roll_no) if (input_roll_no and input_roll_no.isdigit() and int(input_roll_no) > 0) else None

        # Check if this roll already exists in the lot (Merge behavior)
        existing_roll = None
        if target_roll_no is not None:
            cur.execute("""
                SELECT id, weight, roll_barcode, tube_no, merge_count
                FROM fabric_rolls
                WHERE LOWER(TRIM(work_order)) = LOWER(TRIM(?))
                  AND LOWER(TRIM(bag_number)) = LOWER(TRIM(?))
                  AND LOWER(TRIM(lot_name)) = LOWER(TRIM(?))
                  AND roll_no = ?
            """, (wo_val, data['bag_number'], data['lot_name'], target_roll_no))
            existing_roll = cur.fetchone()

        if existing_roll:
            # MERGE ROLL WEIGHT
            old_w = float(existing_roll['weight'])
            add_w = float(data['weight'])
            merged_w = round(old_w + add_w, 2)
            new_merge_cnt = int(existing_roll.get('merge_count') or 0) + 1
            roll_barcode = existing_roll['roll_barcode'] or f"R-{data['bag_number']}-{target_roll_no:02d}"

            cur.execute("""
                UPDATE fabric_rolls 
                SET weight = ?, tube_no = ?, barcode_used = ?, machine_no = ?, is_merged = 1, merge_count = ?
                WHERE id = ?
            """, (merged_w, data.get('tube_no', 'T-101'), barcode_scanned, machine_no, new_merge_cnt, existing_roll['id']))

            # Deduct added weight from lot balance
            cur.execute("""
                UPDATE lots 
                SET fabric_weight = fabric_weight - ? 
                WHERE lot_name = ? AND needles = ?
            """, (add_w, data['lot_name'], data['needles']))

            con.commit()
            return jsonify({
                "success": True,
                "is_merged": True,
                "message": f"Roll #{target_roll_no} already exists! Merged +{add_w} KG into Roll #{target_roll_no}. New Weight: {merged_w} KG",
                "sticker_data": {
                    "roll_barcode": roll_barcode,
                    "bag": data['bag_number'],
                    "lot": data['lot_name'],
                    "roll_no": target_roll_no,
                    "job_wo": current_job_full,
                    "needle": data['needles'],
                    "shade": shade,
                    "machine": machine_no,
                    "weight": merged_w,
                    "date": datetime.now().strftime("%d-%b %H:%M"),
                    "is_merged": True,
                    "merged_added": add_w
                }
            })

        # New Roll: Determine sequential roll number
        if target_roll_no is not None:
            new_roll_no = target_roll_no
        else:
            cur.execute("""
                SELECT MAX(r.roll_no) 
                FROM fabric_rolls r
                WHERE LOWER(TRIM(r.work_order)) = LOWER(TRIM(?))
                  AND LOWER(TRIM(r.bag_number)) = LOWER(TRIM(?))
                  AND LOWER(TRIM(r.lot_name)) = LOWER(TRIM(?))
            """, (wo_val, data['bag_number'], data['lot_name']))
            res = cur.fetchone()
            max_roll = (res['MAX(r.roll_no)'] if isinstance(res, dict) else res[0]) if res else 0
            new_roll_no = (max_roll or 0) + 1

        # Series-wise barcode: 1 k bad 2 k bad 3: e.g. R-B01-01, R-B01-02
        clean_bag = str(data['bag_number']).replace(' ', '')
        unique_roll_id = f"R-{clean_bag}-{new_roll_no:02d}"

        cur.execute("""
            INSERT INTO fabric_rolls (
                work_order, plan_id, bag_number, lot_name, roll_no, 
                weight, tube_no, needles, created_at, barcode_used, roll_barcode, machine_no, is_merged, merge_count
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
        """, (
            wo_val, data['plan_id'], data['bag_number'], data['lot_name'],
            new_roll_no, float(data['weight']), data.get('tube_no', 'T-101'), data['needles'],
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
            "is_merged": False,
            "sticker_data": {
                "roll_barcode": unique_roll_id,
                "bag": data['bag_number'],
                "lot": data['lot_name'],
                "roll_no": new_roll_no,
                "job_wo": current_job_full,
                "needle": data['needles'],
                "shade": shade,
                "machine": machine_no,
                "weight": float(data['weight']),
                "date": datetime.now().strftime("%d-%b %H:%M"),
                "is_merged": False
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
        return redirect(url_for('login'))

    con = db(); cur = con.cursor()
    try:
        if request.method == "POST":
            action = request.form.get("action")
            try:
                if action == "add_user":
                    uname = request.form.get("username", "").strip()
                    pword = request.form.get("password", "").strip()
                    role_val = request.form.get("role", "clerk").strip()
                    if not uname or not pword:
                        flash("Username and password are required!", "warning")
                    else:
                        cur.execute("SELECT id FROM users WHERE username = ?", (uname,))
                        if cur.fetchone():
                            flash(f"User '{uname}' already exists! Please choose another username.", "warning")
                        else:
                            cur.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                                        (uname, pword, role_val))
                            con.commit()
                            flash(f"User '{uname}' ({role_val}) created successfully!", "success")
                elif action == "delete_user":
                    u_id = request.form.get("user_id")
                    if u_id:
                        cur.execute("DELETE FROM users WHERE id = ?", (u_id,))
                        con.commit()
                        flash("User deleted successfully.", "info")
            except Exception as fe:
                con.rollback()
                flash(f"Action error: {str(fe)}", "danger")

        def get_val(row, key_name, default=0):
            if not row:
                return default
            if isinstance(row, dict):
                return row.get(key_name, default)
            try:
                return row[0] if row[0] is not None else default
            except (IndexError, KeyError):
                return default

        cur.execute("SELECT COALESCE(SUM(weight), 0) as total_prod FROM fabric_rolls")
        prod = get_val(cur.fetchone(), 'total_prod', 0)
        cur.execute("SELECT COUNT(*) as cnt FROM dispatch_records")
        dispatched = get_val(cur.fetchone(), 'cnt', 0)
        cur.execute("SELECT COUNT(DISTINCT bag_id) as cnt FROM lots")
        plans = get_val(cur.fetchone(), 'cnt', 0)
        cur.execute("SELECT COALESCE(SUM(grade_a_weight), 0) as ga, COALESCE(SUM(grade_b_weight), 0) as gb FROM quality_checks")
        q = cur.fetchone()
        ga = q.get('ga', 0) if isinstance(q, dict) else (q[0] if q else 0)
        gb = q.get('gb', 0) if isinstance(q, dict) else (q[1] if q else 0)

        cur.execute("SELECT * FROM fabric_rolls ORDER BY id DESC LIMIT 10")
        recent = cur.fetchall()
        cur.execute("SELECT id, username, role FROM users ORDER BY id DESC")
        users = cur.fetchall()

        return render_template("admin_pro.html",
                               prod=float(prod or 0),
                               dispatched=int(dispatched or 0),
                               plans=int(plans or 0),
                               ga=float(ga or 0),
                               gb=float(gb or 0),
                               recent=recent,
                               users=users)
    except Exception as e:
        print(f"[ADMIN DASHBOARD ERROR] {e}")
        con.rollback()
        flash(f"Notice: {str(e)}", "danger")
        return render_template("admin_pro.html",
                               prod=0.0, dispatched=0, plans=0, ga=0.0, gb=0.0,
                               recent=[], users=[])
    finally:
        con.close()

# ================= EXCEL / CSV REPORT GENERATOR =================
def generate_plan_excel(wo_name=None, bag_number=None):
    con = db(); cur = con.cursor()
    query = """
        SELECT r.roll_barcode, r.roll_no, r.work_order, r.plan_id, r.bag_number, 
               b.shade, r.lot_name, r.needles, r.machine_no, r.weight as gross_weight,
               q.grade_a_weight, q.grade_b_weight,
               CASE 
                   WHEN q.in_store = 2 THEN 'Dispatched'
                   WHEN q.in_store = 1 THEN 'In Store'
                   WHEN q.grade_a_weight IS NOT NULL THEN 'Checked / QC Done'
                   ELSE 'Knitted / Pending QC'
               END as status,
               q.checked_at
        FROM fabric_rolls r
        LEFT JOIN bags b ON r.bag_number = b.bag_number
        LEFT JOIN quality_checks q ON r.roll_barcode = q.roll_id
    """
    params = []
    if bag_number:
        query += " WHERE r.bag_number = ? ORDER BY r.roll_no ASC"
        params.append(bag_number)
        filename_prefix = f"plan_{bag_number}"
    elif wo_name:
        query += " WHERE r.work_order = ? ORDER BY r.bag_number ASC, r.roll_no ASC"
        params.append(wo_name)
        filename_prefix = f"plan_report_{wo_name}"
    else:
        query += " ORDER BY r.id DESC LIMIT 500"
        filename_prefix = "plan_report_all"

    cur.execute(query, tuple(params))
    rows = cur.fetchall()
    con.close()

    try:
        import xlsxwriter
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet('Plan Report')

        header_fmt = workbook.add_format({
            'bold': True, 'bg_color': '#0f172a', 'font_color': '#ffffff',
            'border': 1, 'align': 'center', 'valign': 'vcenter'
        })
        num_fmt = workbook.add_format({'num_format': '#,##0.00', 'border': 1})
        text_fmt = workbook.add_format({'border': 1})
        date_fmt = workbook.add_format({'border': 1, 'align': 'center'})

        headers = [
            "Roll Barcode", "Roll #", "Work Order", "Plan ID", "Bag #",
            "Shade", "Lot Name", "Needles", "Machine", "Gross Weight (KG)",
            "Grade A (KG)", "Grade B (KG)", "Status", "QC Timestamp"
        ]
        for col_idx, h in enumerate(headers):
            worksheet.write(0, col_idx, h, header_fmt)

        row_idx = 1
        for r in rows:
            worksheet.write(row_idx, 0, r['roll_barcode'] or '', text_fmt)
            worksheet.write(row_idx, 1, r['roll_no'] or 0, text_fmt)
            worksheet.write(row_idx, 2, r['work_order'] or '', text_fmt)
            worksheet.write(row_idx, 3, r['plan_id'] or '', text_fmt)
            worksheet.write(row_idx, 4, r['bag_number'] or '', text_fmt)
            worksheet.write(row_idx, 5, r['shade'] or '', text_fmt)
            worksheet.write(row_idx, 6, r['lot_name'] or '', text_fmt)
            worksheet.write(row_idx, 7, r['needles'] or '', text_fmt)
            worksheet.write(row_idx, 8, r['machine_no'] or '-', text_fmt)
            worksheet.write_number(row_idx, 9, float(r['gross_weight'] or 0), num_fmt)
            worksheet.write_number(row_idx, 10, float(r['grade_a_weight'] or 0), num_fmt)
            worksheet.write_number(row_idx, 11, float(r['grade_b_weight'] or 0), num_fmt)
            worksheet.write(row_idx, 12, r['status'] or '', text_fmt)
            worksheet.write(row_idx, 13, str(r['checked_at'] or ''), date_fmt)
            row_idx += 1

        worksheet.set_column('A:A', 16)
        worksheet.set_column('B:B', 8)
        worksheet.set_column('C:E', 14)
        worksheet.set_column('F:H', 12)
        worksheet.set_column('I:L', 14)
        worksheet.set_column('M:N', 18)

        workbook.close()
        output.seek(0)
        return send_file(
            output,
            download_name=f"{filename_prefix}.xlsx",
            as_attachment=True,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception:
        import csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Roll Barcode", "Roll #", "Work Order", "Plan ID", "Bag #",
            "Shade", "Lot Name", "Needles", "Machine", "Gross Weight (KG)",
            "Grade A (KG)", "Grade B (KG)", "Status", "QC Timestamp"
        ])
        for r in rows:
            writer.writerow([
                r['roll_barcode'], r['roll_no'], r['work_order'], r['plan_id'], r['bag_number'],
                r['shade'], r['lot_name'], r['needles'], r['machine_no'], r['gross_weight'],
                r['grade_a_weight'], r['grade_b_weight'], r['status'], r['checked_at']
            ])
        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            download_name=f"{filename_prefix}.csv",
            as_attachment=True,
            mimetype="text/csv"
        )

@app.route("/reports/export-plan", methods=["POST"])
def export_plan_report():
    wo = request.form.get("work_order", "").strip()
    return generate_plan_excel(wo_name=wo)

@app.route("/reports/export-plan-excel")
def export_plan_excel():
    bag = request.args.get("bag_number", "").strip()
    return generate_plan_excel(bag_number=bag)

@app.route("/roll-entry/form", methods=["GET", "POST"])
@role_required(['clerk', 'incharge', 'manager', 'admin'])
def roll_entry_form():
    con = db(); cur = con.cursor()
    try:
        if request.method == "POST":
            d = request.form
            wo = d.get("work_order", "").strip()
            plan = d.get("plan_id", "").strip()
            bag = d.get("bag", "").strip()
            lot = d.get("lot", "").strip()
            weight = float(d.get("weight", 0) or 0)
            tube = d.get("tube", "").strip()
            needles = d.get("needles", "").strip()
            bc_needles = d.get("barcode_needles", "").strip() or needles
            barcode_scanned = (d.get("barcode") or d.get("machine_barcode") or "").strip()

            if not barcode_scanned:
                flash("5-Digit Machine Barcode lazmi hai!", "danger")
                work_orders = get_ready_work_orders(cur)
                return render_template("roll_entry_form.html", work_orders=work_orders)

            # Verify Machine Assignment
            cur.execute("""
                SELECT m.*, j.shade_ref
                FROM machine_assignments m
                LEFT JOIN jobs j ON m.job_full_text LIKE CONCAT('%', j.job, '%')
                WHERE TRIM(m.unique_code) = ?
                ORDER BY m.id DESC LIMIT 1
            """, (barcode_scanned,))
            m_row = cur.fetchone()
            if not m_row:
                flash(f"5-Digit Machine Barcode '{barcode_scanned}' registered nahi hai! Pehle Machine Sign-In karein.", "danger")
                work_orders = get_ready_work_orders(cur)
                return render_template("roll_entry_form.html", work_orders=work_orders)

            m_dict = dict(m_row) if isinstance(m_row, dict) else {
                'machine_no': m_row[3], 'needles': m_row[2], 'work_order': m_row[7] if len(m_row) > 7 else '',
                'shade': m_row[8] if len(m_row) > 8 else '', 'job_full_text': m_row[1]
            }

            # 1. Needles check
            m_needles = (m_dict.get('needles') or '').strip().upper()
            if m_needles and needles.upper() != m_needles:
                flash(f"Needles Mismatch! Machine Sign Barcode ki Needles ({m_needles}) chuni hui Lot ki Needles ({needles}) se match nahi kar rahi!", "danger")
                work_orders = get_ready_work_orders(cur)
                return render_template("roll_entry_form.html", work_orders=work_orders)

            # 2. Work Order check
            m_wo = (m_dict.get('work_order') or '').strip().upper()
            if not m_wo and '/' in m_dict.get('job_full_text', ''):
                m_wo = m_dict['job_full_text'].split('/', 1)[1].strip().upper()
            if m_wo and wo.upper() != m_wo:
                flash(f"Work Order Mismatch! Ye 5-digit barcode Work Order '{m_wo}' ka hai, jabke selected Work Order '{wo}' hai!", "danger")
                work_orders = get_ready_work_orders(cur)
                return render_template("roll_entry_form.html", work_orders=work_orders)

            # 3. Shade check
            cur.execute("SELECT shade FROM bags WHERE bag_number = ?", (bag,))
            b_row = cur.fetchone()
            bag_shade = (b_row['shade'] if isinstance(b_row, dict) else (b_row[0] if b_row else '')) or ''
            m_shade = (m_dict.get('shade') or m_dict.get('shade_ref') or '').strip().lower()
            if m_shade and bag_shade and m_shade != bag_shade.strip().lower():
                flash(f"Shade Mismatch! Machine Sign Barcode ka Shade '{m_dict.get('shade') or m_dict.get('shade_ref')}' Bag ke Shade '{bag_shade}' se match nahi kar raha!", "danger")
                work_orders = get_ready_work_orders(cur)
                return render_template("roll_entry_form.html", work_orders=work_orders)

            machine_no = m_dict.get('machine_no', 'M-01')

            # Check for existing roll number for merge behavior
            input_roll_no = str(d.get("roll_no") or "").strip()
            target_roll = int(input_roll_no) if (input_roll_no and input_roll_no.isdigit() and int(input_roll_no) > 0) else None

            existing_r = None
            if target_roll is not None:
                cur.execute("""
                    SELECT id, weight, roll_barcode, merge_count FROM fabric_rolls 
                    WHERE LOWER(TRIM(work_order)) = LOWER(TRIM(?))
                      AND LOWER(TRIM(bag_number)) = LOWER(TRIM(?))
                      AND LOWER(TRIM(lot_name)) = LOWER(TRIM(?))
                      AND roll_no = ?
                """, (wo, bag, lot, target_roll))
                existing_r = cur.fetchone()

            if existing_r:
                # MERGE ROLL WEIGHT
                old_w = float(existing_r['weight'])
                new_tot = round(old_w + weight, 2)
                m_cnt = int(existing_r.get('merge_count') or 0) + 1
                cur.execute("""
                    UPDATE fabric_rolls 
                    SET weight = ?, tube_no = ?, barcode_used = ?, machine_no = ?, is_merged = 1, merge_count = ?
                    WHERE id = ?
                """, (new_tot, tube, barcode_scanned, machine_no, m_cnt, existing_r['id']))
                cur.execute("UPDATE lots SET fabric_weight = fabric_weight - ? WHERE lot_name = ? AND needles = ?", (weight, lot, needles))
                con.commit()
                flash(f"Roll #{target_roll} already existed! Merged +{weight} KG into Roll #{target_roll}. New Total: {new_tot} KG", "success")
            else:
                if target_roll is not None:
                    next_roll = target_roll
                else:
                    cur.execute("""
                        SELECT MAX(roll_no) FROM fabric_rolls 
                        WHERE LOWER(TRIM(work_order)) = LOWER(TRIM(?))
                          AND LOWER(TRIM(bag_number)) = LOWER(TRIM(?))
                          AND LOWER(TRIM(lot_name)) = LOWER(TRIM(?))
                    """, (wo, bag, lot))
                    row = cur.fetchone()
                    max_no = (row['MAX(roll_no)'] if isinstance(row, dict) else row[0]) if row else None
                    next_roll = 1 if max_no is None else (max_no + 1)
                
                clean_bag = str(bag).replace(' ', '')
                barcode = f"R-{clean_bag}-{next_roll:02d}"

                cur.execute("""
                    INSERT INTO fabric_rolls (work_order, plan_id, bag_number, lot_name, roll_no, weight, tube_no, needles, created_at, barcode_used, roll_barcode, machine_no, is_merged, merge_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
                """, (wo, plan, bag, lot, next_roll, weight, tube, bc_needles, datetime.now().strftime("%Y-%m-%d %H:%M"), barcode_scanned, barcode, machine_no))

                cur.execute("UPDATE lots SET fabric_weight = fabric_weight - ? WHERE lot_name = ? AND needles = ?", (weight, lot, needles))
                con.commit()
                flash(f"Roll #{next_roll} ({barcode}) added successfully! Machine: {machine_no}", "success")

        work_orders = get_ready_work_orders(cur)
        return render_template("roll_entry_form.html", work_orders=work_orders)
    finally:
        con.close()

@app.route("/view-barcode", methods=["GET"])
@role_required(['clerk', 'incharge', 'manager', 'admin'])
def view_barcode():
    search_query = request.args.get("work_order", "").strip()
    con = db(); cur = con.cursor()
    if search_query:
        cur.execute("""
            SELECT m.*, j.shade_ref
            FROM machine_assignments m
            LEFT JOIN jobs j ON m.job_full_text LIKE CONCAT('%', j.job, '%')
            WHERE m.job_full_text LIKE ?
            ORDER BY m.id DESC
        """, (f"%{search_query}%",))
    else:
        cur.execute("""
            SELECT m.*, j.shade_ref
            FROM machine_assignments m
            LEFT JOIN jobs j ON m.job_full_text LIKE CONCAT('%', j.job, '%')
            ORDER BY m.id DESC LIMIT 50
        """)
    results = cur.fetchall()
    con.close()
    return render_template("view_barcode.html", results=results, search_query=search_query)

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

# Factory floor operation routes
@app.route("/downtime", methods=["GET", "POST"])
def downtime():
    con = db(); cur = con.cursor()
    if request.method == "POST":
        m = request.form.get("machine", "").strip()
        r = request.form.get("reason", "").strip()
        s = request.form.get("start", "").strip()
        e = request.form.get("end", "").strip()
        cur.execute("INSERT INTO downtime (machine, reason, start, end) VALUES (?, ?, ?, ?)", (m, r, s, e))
        con.commit()
        flash("Downtime logged successfully", "success")
        con.close()
        return redirect(url_for("downtime"))
    cur.execute("SELECT * FROM downtime ORDER BY id DESC LIMIT 25")
    logs = cur.fetchall()
    con.close()
    return render_template("downtime.html", logs=logs)

@app.route("/yarn", methods=["GET", "POST"])
def yarn():
    con = db(); cur = con.cursor()
    if request.method == "POST":
        y = request.form.get("yarn", "").strip()
        q = float(request.form.get("qty", 0) or 0)
        m = request.form.get("machine", "").strip()
        a = request.form.get("action", "").strip()
        cur.execute("INSERT INTO yarn (yarn, qty, machine, action) VALUES (?, ?, ?, ?)", (y, q, m, a))
        con.commit()
        flash("Yarn record saved", "success")
        con.close()
        return redirect(url_for("yarn"))
    cur.execute("SELECT * FROM yarn ORDER BY id DESC LIMIT 25")
    logs = cur.fetchall()
    con.close()
    return render_template("yarn.html", logs=logs)

@app.route("/production", methods=["GET", "POST"])
def production():
    con = db(); cur = con.cursor()
    if request.method == "POST":
        s = request.form.get("shift", "").strip()
        m = request.form.get("machine", "").strip()
        q = float(request.form.get("qty", 0) or 0)
        cur.execute("INSERT INTO production (shift, machine, qty) VALUES (?, ?, ?)", (s, m, q))
        con.commit()
        flash("Production record logged", "success")
        con.close()
        return redirect(url_for("production"))
    cur.execute("SELECT * FROM production ORDER BY id DESC LIMIT 25")
    logs = cur.fetchall()
    con.close()
    return render_template("production.html", logs=logs)

@app.route("/faults", methods=["GET", "POST"])
def faults():
    con = db(); cur = con.cursor()
    if request.method == "POST":
        m = request.form.get("machine", "").strip()
        c = request.form.get("code", "").strip()
        cur.execute("INSERT INTO faults (machine, code) VALUES (?, ?)", (m, c))
        con.commit()
        flash("Fabric defect recorded", "success")
        con.close()
        return redirect(url_for("faults"))
    cur.execute("SELECT * FROM faults ORDER BY id DESC LIMIT 25")
    logs = cur.fetchall()
    con.close()
    return render_template("faults.html", logs=logs)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"🚀 GarmentFlow Pro Server Starting on port {port}...")
    app.run(debug=False, host='0.0.0.0', port=port)
