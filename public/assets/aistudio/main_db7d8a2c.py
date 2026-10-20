from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import sqlite3, time
from datetime import datetime
from functools import wraps
app = Flask(__name__)
app.secret_key = "secret123"

DB = "database.db"

# ================= DATABASE =================
def db():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con

def init_db():
    con = db()
    cur = con.cursor()


    # HR Staff Table (Department & Role Tracking)
    cur.execute("""CREATE TABLE IF NOT EXISTS hr_staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        emp_code TEXT UNIQUE,
        name TEXT NOT NULL,
        cnic TEXT UNIQUE,
        phone TEXT,
        department TEXT, -- 'PPC', 'Lot Making', 'Fabric Store'
        sub_role TEXT,    -- 'Helper', 'Clerk', 'Incharge'
        salary REAL,      -- Fixed Monthly Salary
        joining_date TEXT DEFAULT CURRENT_DATE,
        status TEXT DEFAULT 'Active'
    )""")

    # Secure Financial Ledger (Advances/Fines)
    cur.execute("""CREATE TABLE IF NOT EXISTS hr_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER,
        amount REAL,
        type TEXT, -- 'Advance', 'Fine', 'Bonus'
        description TEXT,
        date TEXT DEFAULT CURRENT_DATE,
        created_by TEXT,
        FOREIGN KEY(staff_id) REFERENCES hr_staff(id)
    )""")

    # Advanced Attendance with Department tagging
    cur.execute("""CREATE TABLE IF NOT EXISTS hr_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER,
        date TEXT,
        status TEXT, -- 'Present', 'Absent', 'Half-Day'
        marked_by TEXT,
        FOREIGN KEY(staff_id) REFERENCES hr_staff(id)
    )""")

    # -------- CORE MODULES ----------
    cur.execute("""CREATE TABLE IF NOT EXISTS rolls(
        id INTEGER PRIMARY KEY,
        order_no TEXT, design TEXT, color TEXT, job TEXT, machine TEXT
    )""")

    cur.execute("""CREATE TABLE IF NOT EXISTS downtime(
        id INTEGER PRIMARY KEY,
        machine TEXT, reason TEXT, start TEXT, end TEXT
    )""")

    cur.execute("""CREATE TABLE IF NOT EXISTS yarn(
        id INTEGER PRIMARY KEY,
        yarn TEXT, qty REAL, machine TEXT, action TEXT
    )""")


    # Add this new table
    cur.execute("""CREATE TABLE IF NOT EXISTS quality_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        roll_id TEXT UNIQUE,
        original_weight REAL,
        grade_a_weight REAL,
        grade_b_weight REAL,
        checked_at TEXT
    )""")
    

    # -------- DISPATCH MODULE ----------
    cur.execute("""CREATE TABLE IF NOT EXISTS dispatch_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bag_number TEXT UNIQUE,
        customer_name TEXT,
        vehicle_no TEXT,
        driver_name TEXT,
        gate_pass_no TEXT,
        total_rolls INTEGER,
        total_weight REAL,
        dispatched_at TEXT,
        dispatched_by TEXT,
        FOREIGN KEY(bag_number) REFERENCES finalized_bags(bag_number)
    )""")    
    cur.execute("""CREATE TABLE IF NOT EXISTS production(
        id INTEGER PRIMARY KEY,
        shift TEXT, machine TEXT, qty REAL
    )""")

    cur.execute("""CREATE TABLE IF NOT EXISTS faults(
        id INTEGER PRIMARY KEY,
        machine TEXT, code TEXT
    )""")

    # jobs table tracks components for uniqueness
    cur.execute("""CREATE TABLE IF NOT EXISTS jobs(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job INTEGER,
        work_order_ref TEXT,
        shade_ref TEXT,
        needles_ref TEXT
    )""")

    cur.execute("""CREATE TABLE IF NOT EXISTS operators(
        id INTEGER PRIMARY KEY,
        name TEXT, start REAL, end REAL, errors INTEGER
    )""")

    cur.execute("""CREATE TABLE IF NOT EXISTS samples(
        id INTEGER PRIMARY KEY,
        sample TEXT, status TEXT
    )""")

    # -------- PPC MODULE ----------
    cur.execute("""CREATE TABLE IF NOT EXISTS work_orders(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_order TEXT
    )""")

    cur.execute("""CREATE TABLE IF NOT EXISTS plans(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_order_id INTEGER,
        plan_id TEXT
    )""")

    cur.execute("""CREATE TABLE IF NOT EXISTS bags(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER,
        bag_number TEXT,
        shade TEXT,
        created_at TEXT
    )""")

    cur.execute("""CREATE TABLE IF NOT EXISTS lots(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bag_id INTEGER,
        lot_name TEXT,
        fabric_length REAL,
        fabric_weight REAL,
        bag_weight REAL,
        needles TEXT,
        job_id INTEGER,
        remarks TEXT,
        created_at TEXT
    )""")

    # -------- ROLL ENTRY ----------
    cur.execute("""CREATE TABLE IF NOT EXISTS fabric_rolls(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_order TEXT,
        plan_id TEXT,
        bag_number TEXT,
        lot_name TEXT,
        roll_no INTEGER,
        weight REAL,
        tube_no TEXT,
        needles TEXT,
        created_at TEXT
    )""")

    # -------- NEW: MACHINE SIGN MODULE ----------
    cur.execute("""CREATE TABLE IF NOT EXISTS machine_assignments(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_full_text TEXT,   -- Stores Job/WorkOrder string
        needles TEXT,
        machine_no TEXT,
        unit_no INTEGER,
        unique_code TEXT UNIQUE, -- The 5-digit unique code
        created_at TEXT
    )""")
    
    # Optional: Index for faster lookup of the unique code
    cur.execute("CREATE INDEX IF NOT EXISTS idx_unique_code ON machine_assignments(unique_code)")





    # New Table for Users
    cur.execute("""CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT
    )""")

    # Seed Users (only if table is empty)
    cur.execute("SELECT COUNT(*) FROM users")
    if cur.fetchone()[0] == 0:
        users = [
            ('c1234', 'cp1234', 'clerk'),
            ('i1234', 'ip1234', 'incharge'),
            ('m1234', 'mp1234', 'manager')
        ]
        cur.executemany("INSERT INTO users (username, password, role) VALUES (?,?,?)", users)




    con.commit()
    con.close()

init_db()

def fix_database_column():
    con = db()
    cur = con.cursor()
    try:
        # This adds the status column if it doesn't exist
        cur.execute("ALTER TABLE finalized_bags ADD COLUMN status TEXT DEFAULT 'Pending'")
        con.commit()
        print("Column 'status' added successfully!")
    except Exception as e:
        # If the column already exists, it will just skip this
        print("Status column already exists or other error:", e)
    finally:
        con.close()

# Call it once to fix the table
fix_database_column()

# ================= HOME =================
def role_required(roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'role' not in session or session['role'] not in roles:
                flash("Unauthorized access!", "danger")
                return redirect(url_for('login'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator
    
from flask import session  # Ensure session is imported

@app.route("/")
def index():
    # SECURITY: If no user is in session, redirect to login page
    if not session.get('user'):
        flash("Please login to access the dashboard.", "warning")
        return redirect(url_for('login'))

    con = db()
    cur = con.cursor()
    
    # Fetch real summary counts
    try:
        stats = {
            'total_rolls': cur.execute("SELECT COUNT(*) FROM fabric_rolls").fetchone()[0] or 0,
            'total_weight': cur.execute("SELECT SUM(weight) FROM fabric_rolls").fetchone()[0] or 0,
            'active_plans': cur.execute("SELECT COUNT(*) FROM plans").fetchone()[0] or 0,
            'dispatched': cur.execute("SELECT COUNT(*) FROM dispatch_records").fetchone()[0] or 0
        }
        
        # Fetch the 5 most recent rolls
        cur.execute("""
            SELECT roll_barcode, lot_name, weight, machine_no, created_at 
            FROM fabric_rolls 
            ORDER BY id DESC LIMIT 5
        """)
        recent_activity = cur.fetchall()
    except Exception as e:
        print(f"Database Error: {e}")
        stats = {'total_rolls': 0, 'total_weight': 0, 'active_plans': 0, 'dispatched': 0}
        recent_activity = []
    finally:
        con.close()
    
    return render_template("index.html", 
                         stats=stats, 
                         recent=recent_activity, 
                         now=datetime.now())


# 1. SEARCH PAGE ROUTE
@app.route("/hr/search", methods=["GET", "POST"])
@role_required(['admin', 'manager', 'incharge'])
def hr_search():
    results = []
    query = request.form.get('query', '')
    if request.method == "POST" and query:
        con = db()
        con.row_factory = sqlite3.Row
        cur = con.cursor()
        # Search by Name, Code, CNIC or Phone
        look_for = f"%{query}%"
        cur.execute("""SELECT * FROM hr_staff WHERE 
                       name LIKE ? OR emp_code LIKE ? OR cnic LIKE ? OR phone LIKE ?""", 
                    (look_for, look_for, look_for, look_for))
        results = cur.fetchall()
        con.close()
    return render_template("hr/search_profile.html", results=results, query=query)

# 2. PROFILE & EDIT ROUTE
@app.route("/hr/profile/<int:staff_id>", methods=["GET", "POST"])
@role_required(['admin', 'manager'])
def hr_profile(staff_id):
    con = db()
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    if request.method == "POST":
        # Capture form values with defaults to prevent 'None' errors
        # .strip() removes accidental spaces which cause DB issues
        name = request.form.get('name', '').strip()
        phone = request.form.get('phone', '').strip()
        address = request.form.get('address', '').strip()
        e_name = request.form.get('e_name', '').strip()
        e_phone = request.form.get('e_phone', '').strip()
        salary = request.form.get('salary', '0').strip()

        # VALIDATION: Check for 'NOT NULL' violations before SQL runs
        if not name:
            flash("Error: Staff Name is mandatory!", "danger")
        else:
            try:
                # 1. Update Text Records
                cur.execute("""UPDATE hr_staff SET 
                               name=?, phone=?, address=?, 
                               emergency_name=?, emergency_phone=?, salary=? 
                               WHERE id=?""", 
                            (name, phone, address, e_name, e_phone, salary, staff_id))
                
                # 2. Handle Document Upload (Joining Form)
                file = request.files.get('joining_form')
                if file and file.filename != '':
                    filename = secure_filename(f"staff_{staff_id}_join_{file.filename}")
                    # Ensure path exists: static/uploads/hr_docs
                    upload_path = os.path.join('static/uploads/hr_docs', filename)
                    file.save(upload_path)
                    cur.execute("UPDATE hr_staff SET joining_form_path=? WHERE id=?", (filename, staff_id))
                
                con.commit()
                flash("Personnel File Updated Successfully!", "success")
            except Exception as e:
                con.rollback()
                flash(f"System Error: {str(e)}", "danger")

    # Fetch fresh data for display
    cur.execute("SELECT * FROM hr_staff WHERE id = ?", (staff_id,))
    staff = cur.fetchone()
    con.close()
    
    if not staff:
        flash("Staff member not found.", "warning")
        return redirect("/hr/staff")
        
    return render_template("hr/profile.html", s=staff)





from functools import wraps
from flask import session, redirect, url_for, flash

# 1. Define the decorator FIRST
def role_required(roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'role' not in session or session['role'] not in roles:
                flash("Unauthorized access!", "danger")
                return redirect(url_for('login'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def safe_init_db():
    con = db()
    cur = con.cursor()
    
    # 1. Create the table if it doesn't exist at all
    cur.execute("""CREATE TABLE IF NOT EXISTS hr_staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        emp_code TEXT UNIQUE,
        name TEXT NOT NULL,
        salary REAL
    )""")
    
    # 2. List of advanced columns to add safely
    # If the column already exists, the 'try' block will fail and skip it
    new_cols = [
        ('cnic', 'TEXT'),
        ('phone', 'TEXT'),
        ('address', 'TEXT'),
        ('emergency_name', 'TEXT'),
        ('emergency_phone', 'TEXT'),
        ('department', 'TEXT'),
        ('sub_role', 'TEXT'),
        ('joining_date', 'TEXT'),
        ('status', 'TEXT DEFAULT "Active"')
    ]
    
    for col_name, col_type in new_cols:
        try:
            cur.execute(f"ALTER TABLE hr_staff ADD COLUMN {col_name} {col_type}")
            print(f"Added column: {col_name}")
        except sqlite3.OperationalError:
            # This skips the error if the column is already there
            pass 

    con.commit()
    con.close()


@app.route("/hr/staff", methods=["GET", "POST"])
@role_required(['admin', 'manager'])
def hr_staff_directory():
    con = db()
    # This line is crucial! It allows you to use s['name'] instead of s[2] in HTML
    con.row_factory = sqlite3.Row 
    cur = con.cursor()
    
    if request.method == "POST":
        # We use .strip() to remove accidental spaces at start/end
        # We use .upper() for emp_code so "rb-101" becomes "RB-101"
        data = (
            request.form['emp_code'].strip().upper(), 
            request.form['name'].strip(), 
            request.form['cnic'].strip(),
            request.form['phone'].strip(), 
            request.form['dept'], 
            request.form['role'], 
            request.form['salary']
        )
        
        try:
            # Using INSERT OR REPLACE solves the "Already Exists" error.
            # If the Code/CNIC exists, it updates the record. If not, it creates it.
            cur.execute("""INSERT OR REPLACE INTO hr_staff 
                           (emp_code, name, cnic, phone, department, sub_role, salary) 
                           VALUES (?, ?, ?, ?, ?, ?, ?)""", data)
            con.commit()
            flash("Staff record saved/updated successfully", "success")
        except Exception as e:
            # This will tell you the ACTUAL error if something else goes wrong
            flash(f"Database Error: {str(e)}", "danger")

    # Fetch all staff ordered by department
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
    
    # Logic: Incharges only see their own department
    role = session.get('role')
    dept_filter = ""
    # Assuming session contains the department for Incharges
    # For now, let's allow them to see their assigned teams
    
    if request.method == "POST":
        staff_ids = request.form.getlist("staff_id")
        statuses = request.form.getlist("status") # List of statuses
        
        for s_id, stat in zip(staff_ids, statuses):
            cur.execute("INSERT OR REPLACE INTO hr_attendance (staff_id, date, status, marked_by) VALUES (?, ?, ?, ?)",
                        (s_id, today, stat, session['user']))
        con.commit()
        flash(f"Attendance marked for {today}", "success")

    cur.execute("SELECT * FROM hr_staff WHERE status = 'Active'")
    staff = cur.fetchall()
    con.close()
    return render_template("hr/attendance.html", staff=staff, today=today)



@app.route("/hr/ledger/<int:staff_id>", methods=["GET", "POST"])
@role_required(['admin', 'manager'])
def hr_ledger(staff_id):
    con = db()
    cur = con.cursor()
    if request.method == "POST":
        amount = request.form['amount']
        l_type = request.form['type'] # Advance/Fine/Bonus
        desc = request.form['description']
        
        cur.execute("INSERT INTO hr_ledger (staff_id, amount, type, description, created_by) VALUES (?,?,?,?,?)",
                    (staff_id, amount, l_type, desc, session['user']))
        con.commit()
        flash(f"{l_type} recorded successfully", "info")

    cur.execute("SELECT * FROM hr_staff WHERE id = ?", (staff_id,))
    member = cur.fetchone()
    cur.execute("SELECT * FROM hr_ledger WHERE staff_id = ? ORDER BY date DESC", (staff_id,))
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
        # 1. Count Attendance
        cur.execute("SELECT COUNT(*) FROM hr_attendance WHERE staff_id = ? AND status = 'Present' AND strftime('%m', date) = ?", (s['id'], month))
        p_days = cur.fetchone()[0] or 0
        
        # 2. Sum Advances/Fines
        cur.execute("SELECT SUM(amount) FROM hr_ledger WHERE staff_id = ? AND type = 'Advance' AND strftime('%m', date) = ?", (s['id'], month))
        advances = cur.fetchone()[0] or 0
        
        cur.execute("SELECT SUM(amount) FROM hr_ledger WHERE staff_id = ? AND type = 'Fine' AND strftime('%m', date) = ?", (s['id'], month))
        fines = cur.fetchone()[0] or 0

        # 3. Calculation Logic
        daily_rate = s['salary'] / 30
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
    return render_template("hr/payroll_report.html", report=report, month=month)





@app.route("/admin", methods=["GET", "POST"])
def admin_dashboard():
    if session.get('role') != 'admin':
        flash("🚫 Access Denied", "danger")
        return redirect(url_for('index'))

    con = db()
    cur = con.cursor()

    # --- POST Actions (User Management) ---
    if request.method == "POST":
        action = request.form.get("action")
        if action == "add_user":
            cur.execute("INSERT INTO users (username, password, role) VALUES (?,?,?)",
                        (request.form.get("username"), request.form.get("password"), request.form.get("role")))
        elif action == "delete_user":
            cur.execute("DELETE FROM users WHERE id = ?", (request.form.get("user_id"),))
        elif action == "update_pass":
            cur.execute("UPDATE users SET password = ? WHERE id = ?", 
                        (request.form.get("new_pass"), request.form.get("user_id")))
        con.commit()

    # --- ADVANCED MONITORING DATA ---
    # 1. KPIs
    total_production = cur.execute("SELECT SUM(weight) FROM fabric_rolls").fetchone()[0] or 0
    total_dispatched = cur.execute("SELECT COUNT(*) FROM dispatch_records").fetchone()[0]
    active_plans = cur.execute("SELECT COUNT(DISTINCT bag_id) FROM lots").fetchone()[0]
    
    # 2. Quality Ratio
    q_data = cur.execute("SELECT SUM(grade_a_weight), SUM(grade_b_weight) FROM quality_checks").fetchone()
    grade_a = q_data[0] or 0
    grade_b = q_data[1] or 0

    # 3. Recent Activity (Last 10 Rolls)
    cur.execute("SELECT * FROM fabric_rolls ORDER BY id DESC LIMIT 10")
    recent_rolls = cur.fetchall()

    # 4. User List
    cur.execute("SELECT * FROM users")
    all_users = cur.fetchall()

    con.close()
    return render_template("admin_pro.html", 
                           users=all_users, 
                           prod=total_production, 
                           dispatched=total_dispatched, 
                           plans=active_plans,
                           ga=grade_a, gb=grade_b,
                           recent=recent_rolls)




@app.route("/dispatch", methods=["GET", "POST"])
def dispatch_management():
    con = db()
    cur = con.cursor()
    
    if request.method == "POST":
        bag_no = request.form.get("bag_number")
        customer = request.form.get("customer")
        vehicle = request.form.get("vehicle")
        driver = request.form.get("driver")
        
        # 1. Verification: Is bag finalized?
        cur.execute("SELECT total_weight, total_rolls FROM finalized_bags WHERE bag_number = ?", (bag_no,))
        bag = cur.fetchone()
        
        if not bag:
            flash(f"❌ Error: Bag {bag_no} is not finalized or does not exist!", "danger")
            return redirect(url_for('dispatch_management'))

        # 2. Check if already dispatched (Safety check)
        cur.execute("SELECT 1 FROM dispatch_records WHERE bag_number = ?", (bag_no,))
        if cur.fetchone():
            flash(f"⚠️ Bag {bag_no} has already been dispatched!", "warning")
            return redirect(url_for('dispatch_management'))

        # 3. Save Dispatch Record
        try:
            cur.execute("""
                INSERT INTO dispatch_records 
                (bag_number, customer_name, vehicle_no, driver_name, total_rolls, total_weight, dispatched_at, dispatched_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (bag_no, customer, vehicle, driver, bag['total_rolls'], bag['total_weight'], 
                  datetime.now().strftime("%Y-%m-%d %H:%M"), "Admin"))
            
            # 4. Mark associated rolls as 'Dispatched' (in_store = 2)
            # This helps in inventory reporting to know rolls are no longer in the warehouse
            cur.execute("""
                UPDATE quality_checks 
                SET in_store = 2 
                WHERE roll_id IN (SELECT roll_barcode FROM fabric_rolls WHERE bag_number = ?)
            """, (bag_no,))
            
            con.commit()
            flash(f"✅ Bag {bag_no} dispatched successfully!", "success")
        except Exception as e:
            con.rollback()
            flash(f"❌ Database Error: {str(e)}", "danger")

    # --- UPDATED: Fetch only bags from Plan Status that are NOT yet dispatched ---
    cur.execute("""
        SELECT bag_number, total_weight, total_rolls 
        FROM finalized_bags 
        WHERE bag_number NOT IN (SELECT bag_number FROM dispatch_records)
        ORDER BY id DESC
    """)
    available_bags = cur.fetchall()

    # Fetch history for the UI table
    cur.execute("SELECT * FROM dispatch_records ORDER BY id DESC LIMIT 15")
    history = cur.fetchall()
    
    con.close()
    return render_template("dispatch.html", available_bags=available_bags, history=history)

# API for frontend validation (used for the dropdown info box)
@app.route("/api/verify-bag-dispatch/<bag_no>")
def verify_bag_api(bag_no):
    con = db()
    cur = con.cursor()
    cur.execute("SELECT total_weight, total_rolls FROM finalized_bags WHERE bag_number = ?", (bag_no,))
    bag = cur.fetchone()
    con.close()
    
    if bag:
        return jsonify({
            "success": True, 
            "weight": bag['total_weight'], 
            "rolls": bag['total_rolls']
        })
    return jsonify({"success": False, "message": "Bag not found or not finalized."})


#

@app.route("/fabric-store", methods=["GET"])
@role_required(['clerk', 'incharge', 'manager'])
def fabric_store():
    return render_template("fabric_store.html")

@app.route("/fabric-store/scan-bag", methods=["POST"])
def store_scan_bag():
    bag_no = request.form.get("bag_number")
    con = db(); cur = con.cursor()
    
    # Get rolls that HAVE been quality checked but ARE NOT yet in store
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
    
    # Convert to list of dicts for JSON
    roll_list = [dict(row) for row in rolls]
    return jsonify({"success": True, "rolls": roll_list})

@app.route("/fabric-store/save-stock", methods=["POST"])
def save_store_stock():
    selected_rolls = request.json.get("rolls") # List of barcodes
    if not selected_rolls:
        return jsonify({"success": False, "message": "No rolls selected!"})
    
    con = db(); cur = con.cursor()
    try:
        for barcode in selected_rolls:
            cur.execute("UPDATE quality_checks SET in_store = 1 WHERE roll_id = ?", (barcode,))
        con.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})
    finally:
        con.close()



@app.route("/plan-status", methods=["GET", "POST"])
def plan_status():
    con = db()
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    
    # --- AUTO-SYNC DISPATCH STATUS ---
    try:
        cur.execute("""
            UPDATE finalized_bags 
            SET status = 'Dispatched' 
            WHERE bag_number IN (SELECT bag_number FROM dispatch_records)
        """)
        con.commit()
    except:
        pass 

    # --- POST ACTION: CREATE/FINALIZE BAG ---
    if request.method == "POST" and request.form.get("action") == "create_bag":
        bag_no = request.form.get("bag_number")
        wo_no = request.form.get("work_order")
        
        # We sum grade_a_weight. If it's NULL, we use 0.
        summary = cur.execute("""
            SELECT COUNT(r.id) as rolls_count, SUM(COALESCE(q.grade_a_weight, 0)) as total_kg
            FROM fabric_rolls r
            LEFT JOIN quality_checks q ON r.roll_barcode = q.roll_id
            WHERE r.bag_number = ?
        """, (bag_no,)).fetchone()

        if summary['rolls_count'] > 0:
            try:
                cur.execute("""
                    INSERT INTO finalized_bags (bag_number, work_order, total_rolls, total_weight, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (bag_no, wo_no, summary['rolls_count'], summary['total_kg'], 'Pending', 
                      datetime.now().strftime("%Y-%m-%d %H:%M")))
                con.commit()
                flash(f"Bag {bag_no} Finalized!", "success")
            except Exception as e:
                con.rollback()
                flash("Finalization error: " + str(e), "danger")
        return redirect(url_for('plan_status', work_order=wo_no, bag_number=bag_no))

    # --- GET LOGIC ---
    selected_wo = request.args.get("work_order", "")
    selected_bag = request.args.get("bag_number", "")
    
    work_orders = cur.execute("SELECT DISTINCT work_order FROM work_orders").fetchall()
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
        final_check = cur.execute("""
            SELECT COALESCE(status, 'Pending') as status 
            FROM finalized_bags WHERE bag_number = ?
        """, (selected_bag,)).fetchone()
        
        if final_check:
            is_already_finalized = True
            bag_status = final_check['status']

        # Use COALESCE to ensure qw and in_store are NEVER None (fixes sum error)
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
        
        # LOGIC FIX: Check if all rolls have been scanned by Quality
        if rolls_data and not is_already_finalized:
            # All rolls must have an entry in the quality_checks table
            ready_to_finalize = all(row['qc_id'] is not None for row in rolls_data)

    con.close()
    return render_template("plan_status.html", **locals())





@app.route("/print-gate-pass/<bag_no>")
def print_gate_pass(bag_no):
    con = db()
    cur = con.cursor()
    try:
        # 1. Fetch the master dispatch record
        cur.execute("SELECT * FROM dispatch_records WHERE bag_number = ?", (bag_no,))
        dispatch = cur.fetchone()
        
        if not dispatch:
            flash("❌ Gate Pass record not found!", "danger")
            return redirect(url_for('dispatch_management'))

        # 2. Get the detailed list with Needles and Lot Name
        # Added lot_name and needles to the selection
        cur.execute("""
            SELECT 
                r.roll_no, 
                r.roll_barcode, 
                r.needles,
                r.lot_name,
                q.grade_a_weight, 
                b.shade
            FROM fabric_rolls r
            JOIN quality_checks q ON r.roll_barcode = q.roll_id
            JOIN bags b ON r.bag_number = b.bag_number
            WHERE r.bag_number = ?
            ORDER BY r.lot_name ASC, r.roll_no ASC
        """, (bag_no,))
        rolls = cur.fetchall()
        
        # We pass the raw 'rolls' list; the template will handle the grouping
        return render_template("gate_pass_pdf.html", d=dispatch, rolls=rolls)
        
    except Exception as e:
        return f"System Error: {str(e)}", 500
    finally:
        con.close()




@app.route("/bag-receipt", methods=["GET", "POST"])
def bag_receipt():
    con = db()
    cur = con.cursor()
    bag_no = request.args.get("bag_number")
    
    bag_data = None
    rolls_dict = {}
    total_w = 0
    total_r = 0
    
    if bag_no:
        # 1. Fetch Bag Details (Work Order, Job, Shade)
        # Adjust column names if your table uses 'work_order' instead of 'job_no'
        cur.execute("SELECT * FROM bags WHERE bag_number = ?", (bag_no,))
        bag_data = cur.fetchone()
        
        if bag_data:
            # 2. Fetch Rolls joined with Quality for weight
            cur.execute("""
                SELECT 
                    r.roll_no, 
                    r.roll_barcode,
                    r.needles, 
                    r.lot_name,
                    q.grade_a_weight
                FROM fabric_rolls r
                LEFT JOIN quality_checks q ON r.roll_barcode = q.roll_id
                WHERE r.bag_number = ?
                ORDER BY r.lot_name ASC, r.roll_no ASC
            """, (bag_no,))
            all_rolls = cur.fetchall()

            for row in all_rolls:
                lot = row['lot_name'] or 'UNASSIGNED'
                weight = row['grade_a_weight'] or 0
                total_w += weight
                total_r += 1
                
                if lot not in rolls_dict:
                    rolls_dict[lot] = []
                rolls_dict[lot].append(row)
    
    con.close()
    return render_template("bag_receipt.html", 
                           bag=bag_data, 
                           rolls_dict=rolls_dict, 
                           total_w=round(total_w, 2), 
                           total_r=total_r)







from flask import session, abort
from functools import wraps
from functools import wraps # Make sure this is at the top of main.py

@app.route("/roll-quality", methods=["GET", "POST"])
#@role_required(['incharge', 'manager'])
def roll_quality():
    if request.method == "POST":
        barcode = request.form.get("roll_id")
        # Check if user is in Search (Quarry) mode
        is_quarry = request.form.get("quarry_mode") == "on"
        
        con = db(); cur = con.cursor()
        try:
            # 1. First, check if this roll has already been inspected
            cur.execute("SELECT grade_a_weight FROM quality_checks WHERE roll_id = ?", (barcode,))
            q_record = cur.fetchone()

            # Logic: If NOT in search mode and already scanned, stop.
            if not is_quarry and q_record:
                return jsonify({"success": False, "message": "❌ Roll already scanned in Quality!"})

            # 2. Get original production data
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
                return jsonify({"success": False, "message": "❌ Roll ID not found!"})

            pw = float(roll['weight'])
            
            # 3. Handle based on Mode
            if is_quarry:
                # SEARCH MODE: Just get the weight. If inspected, show QW, else show "Pending"
                qw = q_record['grade_a_weight'] if q_record else "Pending"
            else:
                # QUALITY MODE: Process new inspection
                same_weight = request.form.get("same_weight") == "yes"
                manual_weight = request.form.get("manual_weight")
                
                qw = pw if same_weight else float(manual_weight)
                b_grade = pw - qw

                if qw > pw:
                    return jsonify({"success": False, "message": "❌ QW cannot be greater than PW!"})

                # Save the inspection
                cur.execute("""INSERT INTO quality_checks 
                    (roll_id, original_weight, grade_a_weight, grade_b_weight, checked_at) 
                    VALUES (?, ?, ?, ?, ?)""",
                    (barcode, pw, qw, b_grade, datetime.now().strftime("%Y-%m-%d %H:%M")))

                # Restore balance if B-Grade was found
                if b_grade > 0:
                    cur.execute("""
                        UPDATE lots SET fabric_weight = fabric_weight + ? 
                        WHERE lot_name = ? AND needles = ? 
                        AND bag_id = (SELECT id FROM bags WHERE bag_number = ?)
                    """, (b_grade, roll['lot_name'], roll['needles'], roll['bag_number']))
                
                con.commit()

            # 4. Return data to the frontend (works for both modes)
            sticker = {
                "bag": roll['bag_number'],
                "lot": roll['lot_name'],
                "roll_no": roll['roll_no'],
                "job_wo": roll['work_order'],
                "shade": roll['shade'],
                "needles": roll['needles'],
                "machine": roll['machine_no'],
                "pw": pw,
                "qw": qw,
                "barcode": barcode
            }
            return jsonify({"success": True, "sticker": sticker})

        except Exception as e:
            con.rollback()
            return jsonify({"success": False, "message": f"❌ Error: {str(e)}"})
        finally:
            con.close()

    return render_template("roll_quality.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        con = db(); cur = con.cursor()
        cur.execute("SELECT * FROM users WHERE username=? AND password=?", (username, password))
        user = cur.fetchone()
        con.close()
        
        if user:
            session['user'] = user['username']
            session['role'] = user['role']
            flash(f"Logged in as {user['role'].capitalize()}")
            return redirect(url_for('index'))
        else:
            flash("Invalid credentials")
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for('login'))


@app.route("/search-roll", methods=["GET", "POST"])
#@role_required(['clerk', 'incharge', 'manager'])
def search_roll():
    roll_data = None
    search_query = request.args.get('roll_id', '')

    if search_query:
        con = db()
        cur = con.cursor()
        # Fetching all details in one go by joining relevant tables
        cur.execute("""
            SELECT r.*, b.shade, wo.work_order, b.plan_id
            FROM fabric_rolls r
            JOIN bags b ON r.bag_number = b.bag_number
            JOIN plans p ON b.plan_id = p.id
            JOIN work_orders wo ON p.work_order_id = wo.id
            WHERE r.roll_barcode = ?
        """, (search_query,))
        roll_data = cur.fetchone()
        con.close()
        
        if not roll_data and search_query:
            flash(f"No roll found with ID: {search_query}")

    return render_template("search_roll.html", roll=roll_data, search_query=search_query)


# ================= CORE MODULE ROUTES =================
@app.route("/roll", methods=["GET","POST"])
def roll():
    if request.method=="POST":
        d=request.form
        con=db();cur=con.cursor()
        cur.execute("INSERT INTO rolls VALUES(NULL,?,?,?,?,?)",
                    (d["order"],d["design"],d["color"],d["job"],d["machine"]))
        con.commit();con.close()
        flash("Saved")
    return render_template("roll.html")

import random, string

import random, string

@app.route("/machine-sign", methods=["GET", "POST"])
def machine_sign():
    con = db(); cur = con.cursor()
    
    if request.method == "POST":
        # Capture form data
        job_text = request.form.get("job_text")
        needles = request.form.get("needles")
        machine = request.form.get("machine")
        unit = request.form.get("unit")

        # 1. Generate Unique 5-Digit Code (Numeric)
        while True:
            code = ''.join(random.choices(string.digits, k=5))
            cur.execute("SELECT 1 FROM machine_assignments WHERE unique_code=?", (code,))
            if not cur.fetchone():
                break
        
        # 2. Insert Assignment (Allows multiple machines for one Job ID)
        cur.execute("""INSERT INTO machine_assignments 
            (job_full_text, needles, machine_no, unit_no, unique_code, created_at) 
            VALUES (?,?,?,?,?,?)""",
            (job_text, needles, machine, unit, code, datetime.now().strftime("%Y-%m-%d %H:%M")))
        
        con.commit()
        flash(f"✅ Machine M#{machine} assigned to {job_text}. Code: {code}")
        return redirect(url_for("machine_sign"))

    # GET: Load Work Orders
    cur.execute("SELECT DISTINCT work_order FROM work_orders ORDER BY work_order DESC")
    work_orders = cur.fetchall()
    con.close()
    return render_template("machine_sign.html", work_orders=work_orders)

# --- API SECTION ---

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

# NEW: API to get already signed machines for a specific Work Order
@app.route("/api/assignments-by-wo/<wo_name>")
def assignments_by_wo(wo_name):
    con = db(); cur = con.cursor()
    # We search the job_full_text for the Work Order reference
    cur.execute("""
        SELECT * FROM machine_assignments 
        WHERE job_full_text LIKE ? 
        ORDER BY created_at DESC
    """, (f"%/{wo_name}",))
    data = [dict(r) for r in cur.fetchall()]
    con.close()
    return jsonify(data)

# NEW: Route to delete/sign-out a machine
@app.route("/machine-sign/delete/<int:id>")
def delete_machine_sign(id):
    con = db(); cur = con.cursor()
    cur.execute("DELETE FROM machine_assignments WHERE id = ?", (id,))
    con.commit()
    con.close()
    flash("✅ Machine signed out successfully.")
    return redirect(url_for("machine_sign"))



@app.route("/downtime", methods=["GET","POST"])
def downtime():
    if request.method=="POST":
        d=request.form
        con=db();cur=con.cursor()
        cur.execute("INSERT INTO downtime VALUES(NULL,?,?,?,?)",
                    (d["machine"],d["reason"],d["start"],d["end"]))
        con.commit();con.close()
        flash("Saved")
    return render_template("downtime.html")

@app.route("/yarn", methods=["GET","POST"])
def yarn():
    if request.method=="POST":
        d=request.form
        con=db();cur=con.cursor()
        cur.execute("INSERT INTO yarn VALUES(NULL,?,?,?,?)",
                    (d["yarn"],d["qty"],d["machine"],d["action"]))
        con.commit();con.close()
        flash("Saved")
    return render_template("yarn.html")

@app.route("/production", methods=["GET","POST"])
def production():
    if request.method=="POST":
        d=request.form
        con=db();cur=con.cursor()
        cur.execute("INSERT INTO production VALUES(NULL,?,?,?)",
                    (d["shift"],d["machine"],d["qty"]))
        con.commit();con.close()
        flash("Saved")
    return render_template("production.html")

@app.route("/faults", methods=["GET","POST"])
def faults():
    if request.method=="POST":
        d=request.form
        con=db();cur=con.cursor()
        cur.execute("INSERT INTO faults VALUES(NULL,?,?)",
                    (d["machine"],d["code"]))
        con.commit();con.close()
        flash("Saved")
    return render_template("faults.html")

@app.route("/job", methods=["GET","POST"])
def job():
    msg=None
    if request.method=="POST":
        d=request.form
        con=db();cur=con.cursor()
        cur.execute("SELECT 1 FROM jobs WHERE job=? AND needles_ref=?",
                    (d["job"], d["needles"]))
        if cur.fetchone():
            msg="⚠ DUPLICATE JOB"
        else:
            # Note: This is a simplified fallback for the manual job alert page
            cur.execute("INSERT INTO jobs (job, needles_ref) VALUES(?,?)",
                        (d["job"], d["needles"]))
            con.commit()
        con.close()
    return render_template("job_alert.html", msg=msg)

@app.route("/operator", methods=["GET","POST"])
def operator():
    if request.method=="POST":
        d=request.form
        con=db();cur=con.cursor()
        cur.execute("INSERT INTO operators VALUES(NULL,?,?,?,?)",
                    (d["name"],time.time(),time.time(),int(d["errors"])))
        con.commit();con.close()
        flash("Saved")
    return render_template("operator.html")

@app.route("/sample", methods=["GET","POST"])
def sample():
    if request.method=="POST":
        d=request.form
        con=db();cur=con.cursor()
        cur.execute("INSERT INTO samples VALUES(NULL,?,?)",
                    (d["sample"],d["status"]))
        con.commit();con.close()
        flash("Saved")
    return render_template("sample.html")

# ================= PPC TREE VIEW =================
@app.route("/ppc")
@role_required(['manager','admin'])
def ppc():
    con=db();cur=con.cursor()
    cur.execute("SELECT * FROM work_orders")
    work_orders=cur.fetchall()
    tree=[]
    for wo in work_orders:
        cur.execute("SELECT * FROM plans WHERE work_order_id=?", (wo["id"],))
        plans=cur.fetchall()
        plan_list=[]
        for p in plans:
            cur.execute("SELECT * FROM bags WHERE plan_id=?", (p["id"],))
            bags=cur.fetchall()
            bag_list=[]
            for b in bags:
                cur.execute("SELECT * FROM lots WHERE bag_id=?", (b["id"],))
                bag_list.append({**dict(b),"lots":[dict(l) for l in cur.fetchall()]})
            plan_list.append({**dict(p),"bags":bag_list})
        tree.append({**dict(wo),"plans":plan_list})
    con.close()
    return render_template("ppc_tree.html", work_orders=tree)

# ================= PPC CRUD =================
@app.route("/ppc/work-order/add", methods=["POST"])
def add_work_order():
    con=db();cur=con.cursor()
    cur.execute("INSERT INTO work_orders(work_order) VALUES(?)",
                (request.form["work_order"],))
    con.commit();con.close()
    flash("Work order added")
    return redirect(url_for("ppc"))

@app.route("/ppc/work-order/edit/<int:id>", methods=["GET","POST"])
def edit_work_order(id):
    con=db();cur=con.cursor()
    if request.method=="POST":
        cur.execute("UPDATE work_orders SET work_order=? WHERE id=?",
                    (request.form["work_order"],id))
        con.commit();con.close()
        flash("Updated")
        return redirect(url_for("ppc"))
    cur.execute("SELECT * FROM work_orders WHERE id=?", (id,))
    wo=cur.fetchone();con.close()
    return render_template("simple_form.html",title="Edit Work Order",
                           name="work_order",value=wo["work_order"])

@app.route("/ppc/work-order/delete/<int:id>")
def delete_work_order(id):
    con=db();cur=con.cursor()
    cur.execute("DELETE FROM work_orders WHERE id=?", (id,))
    con.commit();con.close()
    flash("Deleted")
    return redirect(url_for("ppc"))

@app.route("/ppc/plan/add/<int:work_order_id>", methods=["POST"])
def add_plan(work_order_id):
    con=db();cur=con.cursor()
    cur.execute("INSERT INTO plans(work_order_id,plan_id) VALUES(?,?)",
                (work_order_id,request.form["plan_id"]))
    con.commit();con.close()
    flash("Plan added")
    return redirect(url_for("ppc"))

@app.route("/ppc/plan/edit/<int:id>", methods=["GET","POST"])
def edit_plan(id):
    con=db();cur=con.cursor()
    if request.method=="POST":
        cur.execute("UPDATE plans SET plan_id=? WHERE id=?",
                    (request.form["plan_id"],id))
        con.commit();con.close()
        flash("Updated")
        return redirect(url_for("ppc"))
    cur.execute("SELECT * FROM plans WHERE id=?", (id,))
    p=cur.fetchone();con.close()
    return render_template("simple_form.html",title="Edit Plan",
                           name="plan_id",value=p["plan_id"])

@app.route("/ppc/plan/delete/<int:id>")
def delete_plan(id):
    con=db();cur=con.cursor()
    cur.execute("DELETE FROM plans WHERE id=?", (id,))
    con.commit();con.close()
    flash("Deleted")
    return redirect(url_for("ppc"))

@app.route("/ppc/bag/new/<int:plan_id>", methods=["GET","POST"])
def new_bag(plan_id):
    if request.method=="POST":
        con=db();cur=con.cursor()
        cur.execute("INSERT INTO bags(plan_id,bag_number,shade,created_at) VALUES(?,?,?,?)",
                    (plan_id,request.form["bag_number"],request.form["shade"],
                     datetime.now().strftime("%Y-%m-%d")))
        con.commit();con.close()
        flash("Bag added")
        return redirect(url_for("ppc"))
    return render_template("bag_form.html",bag=None)

@app.route("/ppc/bag/edit/<int:id>", methods=["GET","POST"])
def edit_bag(id):
    con=db();cur=con.cursor()
    if request.method=="POST":
        cur.execute("UPDATE bags SET bag_number=?, shade=? WHERE id=?",
                    (request.form["bag_number"],request.form["shade"],id))
        con.commit();con.close()
        flash("Updated")
        return redirect(url_for("ppc"))
    cur.execute("SELECT * FROM bags WHERE id=?", (id,))
    bag=cur.fetchone();con.close()
    return render_template("bag_form.html",bag=bag)

@app.route("/ppc/bag/delete/<int:id>")
def delete_bag(id):
    con=db();cur=con.cursor()
    cur.execute("DELETE FROM bags WHERE id=?", (id,))
    con.commit();con.close()
    flash("Deleted")
    return redirect(url_for("ppc"))

@app.route("/ppc/lot/new/<int:bag_id>", methods=["GET","POST"])
def new_lot(bag_id):
    con=db();cur=con.cursor()
    # Fetch WO and Shade info for Job generation logic
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

    if request.method=="POST":
        d=request.form
        needles = d["needles"]
        input_weight = float(d["fabric_weight"]) # Capture the PPC planned weight

        # --- UNIQUE JOB ID LOGIC ---
        cur.execute("""
            SELECT job FROM jobs 
            WHERE work_order_ref = ? AND shade_ref = ? AND needles_ref = ?
        """, (curr_wo, curr_shade, needles))
        
        existing = cur.fetchone()
        if existing:
            job_no = existing['job']
        else:
            cur.execute("SELECT MAX(job) FROM jobs WHERE work_order_ref = ?", (curr_wo,))
            res = cur.fetchone()[0]
            job_no = 1 if res is None else res + 1
            
            cur.execute("""
                INSERT INTO jobs (job, work_order_ref, shade_ref, needles_ref) 
                VALUES (?, ?, ?, ?)
            """, (job_no, curr_wo, curr_shade, needles))

        # --- SAVE LOT (With Stable Plan Weight) ---
        cur.execute("""INSERT INTO lots
        (bag_id, lot_name, fabric_length, fabric_weight, plan_weight, bag_weight, needles, job_id, remarks, created_at)
        VALUES(?,?,?,?,?,?,?,?,?,?)""",
        (bag_id, d["lot_name"], d["fabric_length"], 
         input_weight,   # This column will decrease during production (Balance)
         input_weight,   # This column remains STABLE (Plan Weight)
         d["bag_weight"], needles, job_no, d["remarks"],
         datetime.now().strftime("%Y-%m-%d")))
        
        con.commit();con.close()
        flash(f"Lot Added! (Job #{job_no})")
        return redirect(url_for("ppc"))
    
    con.close()
    return render_template("lot_form.html", lot=None)


@app.route("/ppc/lot/edit/<int:id>", methods=["GET","POST"])
def edit_lot(id):
    con=db();cur=con.cursor()
    if request.method=="POST":
        d=request.form
        cur.execute("""UPDATE lots SET
        lot_name=?,fabric_length=?,fabric_weight=?,bag_weight=?,needles=?,remarks=?
        WHERE id=?""",
        (d["lot_name"],d["fabric_length"],d["fabric_weight"],
         d["bag_weight"],d["needles"],d["remarks"],id))
        con.commit();con.close()
        flash("Updated")
        return redirect(url_for("ppc"))
    cur.execute("SELECT * FROM lots WHERE id=?", (id,))
    lot=cur.fetchone();con.close()
    return render_template("lot_form.html",lot=lot)

@app.route("/ppc/lot/delete/<int:id>")
def delete_lot(id):
    con=db();cur=con.cursor()
    cur.execute("DELETE FROM lots WHERE id=?", (id,))
    con.commit();con.close()
    flash("Deleted")
    return redirect(url_for("ppc"))

# ================= ROLL ENTRY =================
@app.route("/roll-entry")
@role_required(['clerk', 'incharge', 'manager'])
def roll_entry():
    con=db();cur=con.cursor()
    cur.execute("SELECT work_order FROM work_orders")
    work_orders=[w["work_order"] for w in cur.fetchall()]
    con.close()
    return render_template("roll_entry_select.html", work_orders=work_orders)

@app.route("/api/plans/<work_order>")
def api_plans(work_order):
    con=db();cur=con.cursor()
    cur.execute("""
        SELECT plans.plan_id FROM plans
        JOIN work_orders ON plans.work_order_id=work_orders.id
        WHERE work_orders.work_order=?
    """,(work_order,))
    data=[p["plan_id"] for p in cur.fetchall()]
    con.close()
    return jsonify(data)

@app.route("/api/bags/<plan_id>")
def api_bags(plan_id):
    con = db()
    cur = con.cursor()
    # Logic: Select bags belonging to the plan, but ONLY if they are NOT in finalized_bags
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
    
    # This query selects ALL lots for the bag.
    # It attempts to find a barcode/machine ONLY if a roll has been saved with one.
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
        -- We LEFT JOIN fabric_rolls to ensure the Lot shows even if rolls = 0
        LEFT JOIN fabric_rolls fr ON (
            fr.bag_number = b.bag_number 
            AND fr.lot_name = l.lot_name
        )
        -- We LEFT JOIN machine_assignments to get details only if a barcode was used
        LEFT JOIN machine_assignments m ON fr.barcode_used = m.unique_code
        WHERE b.bag_number = ?
        GROUP BY l.lot_name, fr.barcode_used
    """, (bag_number,))
    
    rows = cur.fetchall()
    
    # Process results to handle the "Barcode Visibility" logic
    data = []
    seen_lots = set() # To prevent duplicates when a lot has multiple different machine entries

    for row in rows:
        item = dict(row)
        
        # LOGIC: If no rolls are fed yet, ensure barcode and machine are null
        if item['roll_count'] == 0:
            item['barcode'] = None
            item['machine_no'] = None
        
        # Prevent showing a "null barcode" row AND a "fed barcode" row for the same lot
        lot_key = f"{item['lot_name']}_{item['barcode']}"
        if lot_key not in seen_lots:
            data.append(item)
            seen_lots.add(lot_key)

    con.close()
    return jsonify(data)




@app.route("/view-barcode", methods=["GET", "POST"])
def view_barcode():
    con = db(); cur = con.cursor()
    results = []
    search_query = request.args.get('work_order', '')

    if search_query:
        # Join assignments with jobs table to get shade and needles
        cur.execute("""
            SELECT 
                m.*, 
                j.shade_ref, 
                j.needles_ref 
            FROM machine_assignments m
            LEFT JOIN jobs j ON (j.job || '/' || j.work_order_ref) = m.job_full_text
            WHERE m.job_full_text LIKE ? 
            ORDER BY m.created_at DESC
        """, ('%' + search_query + '%',))
        results = cur.fetchall()

    con.close()
    return render_template("view_barcode.html", results=results, search_query=search_query)

@app.route("/api/barcode-details/<barcode>")
def api_barcode_details(barcode):
    con = db(); cur = con.cursor()
    # Detailed API including job references
    cur.execute("""
        SELECT 
            m.*, 
            j.shade_ref, 
            j.needles_ref 
        FROM machine_assignments m
        LEFT JOIN jobs j ON (j.job || '/' || j.work_order_ref) = m.job_full_text
        WHERE m.unique_code = ?
    """, (barcode,))
    row = cur.fetchone()
    con.close()
    if row:
        return jsonify(dict(row))
    return jsonify({"error": "Barcode not found"}), 404


@app.route("/roll-entry/form", methods=["POST", "GET"])
def roll_entry_form():
    if request.method == "POST":
        d = request.form
        con = db(); cur = con.cursor()
        
        # Validation: Check if Needles match
        # d["lot_needles"] comes from the hidden input, d["barcode_needles"] from JS
        if d["needles"] != d["barcode_needles"]:
            flash("❌ ERROR: Needle mismatch! Barcode does not match Lot specs.")
            return redirect(url_for("roll_entry"))

        # 1. Calculate Roll Number automatically
        cur.execute("SELECT MAX(roll_no) FROM fabric_rolls WHERE lot_name=? AND needles=?",
                    (d["lot"], d["needles"]))
        last = cur.fetchone()[0]
        roll_no = 1 if last is None else last + 1

        # 2. Insert the Roll
        cur.execute("""
            INSERT INTO fabric_rolls
            (work_order, plan_id, bag_number, lot_name, roll_no, weight, tube_no, needles, created_at)
            VALUES(?,?,?,?,?,?,?,?,?)
        """, (d["work_order"], d["plan_id"], d["bag"], d["lot"], roll_no, 
              d["weight"], d["tube"], d["needles"], datetime.now().strftime("%Y-%m-%d %H:%M")))

        # 3. DEDUCT WEIGHT FROM LOT
        # We find the lot and subtract the weight entered
        cur.execute("""
            UPDATE lots SET fabric_weight = fabric_weight - ? 
            WHERE lot_name = ? AND needles = ?
        """, (float(d["weight"]), d["lot"], d["needles"]))

        con.commit(); con.close()
        flash(f"✅ Roll #{roll_no} saved. Remaining Lot weight updated.")
        return redirect(url_for("roll_entry"))
        
    return render_template("roll_entry_form.html")


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

            # UPDATED QUERY: Using grade_a_weight as qw and qc.id as qc_id
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

            # Stats calculation logic
            cur.execute("""
                SELECT SUM(l.fabric_weight) FROM lots l
                JOIN bags b ON l.bag_id = b.id
                JOIN plans p ON b.plan_id = p.id
                JOIN work_orders wo ON p.work_order_id = wo.id
                WHERE wo.work_order = ? AND b.shade = ? AND l.needles LIKE ?
            """, (selected_wo, selected_shade, needle_pattern))
            
            current_balance = cur.fetchone()[0] or 0
            stats["produced"] = sum(r['weight'] for r in results)
            stats["planned"] = stats["produced"] + current_balance
            stats["balance"] = current_balance

    cur.execute("SELECT DISTINCT work_order FROM work_orders")
    work_orders = cur.fetchall()
    con.close()
    
    return render_template("roll_wise.html", **locals())



@app.route("/api/edit-roll/<int:roll_id>", methods=["POST"])
def edit_roll(roll_id):
    new_weight_str = request.form.get("weight")
    if not new_weight_str:
        flash("❌ Error: No weight provided")
        return redirect(request.referrer)
        
    new_weight = float(new_weight_str)
    con = db(); cur = con.cursor()
    try:
        # SECURITY CHECK: Verify if bag is finalized or dispatched
        cur.execute("""
            SELECT fb.status FROM fabric_rolls r
            JOIN finalized_bags fb ON r.bag_number = fb.bag_number
            WHERE r.id = ?
        """, (roll_id,))
        lock_status = cur.fetchone()
        
        if lock_status and lock_status['status'] in ['Finalized', 'Dispatched']:
            flash(f"❌ Cannot edit: Bag is {lock_status['status']}", "danger")
            return redirect(request.referrer)

        # Proceed with edit if not locked
        cur.execute("SELECT weight, lot_name, needles, bag_number FROM fabric_rolls WHERE id = ?", (roll_id,))
        roll = cur.fetchone()
        
        if roll:
            old_weight = roll['weight']
            diff = old_weight - new_weight 
            
            cur.execute("""
                UPDATE lots SET fabric_weight = fabric_weight + ? 
                WHERE id = (
                    SELECT l.id FROM lots l
                    JOIN bags b ON l.bag_id = b.id
                    WHERE l.lot_name = ? AND l.needles = ? AND b.bag_number = ?
                )
            """, (diff, roll['lot_name'], roll['needles'], roll['bag_number']))
            
            cur.execute("UPDATE fabric_rolls SET weight = ? WHERE id = ?", (new_weight, roll_id))
            con.commit()
            flash(f"✅ Roll updated. Balance adjusted.")
            
    except Exception as e:
        con.rollback()
        flash(f"❌ Error: {str(e)}")
    finally:
        con.close()
    return redirect(request.referrer)

@app.route("/api/delete-roll/<int:roll_id>", methods=["POST"])
def delete_roll(roll_id):
    con = db(); cur = con.cursor()
    try:
        # SECURITY CHECK: Verify if bag is finalized or dispatched
        cur.execute("""
            SELECT fb.status FROM fabric_rolls r
            JOIN finalized_bags fb ON r.bag_number = fb.bag_number
            WHERE r.id = ?
        """, (roll_id,))
        lock_status = cur.fetchone()
        
        if lock_status and lock_status['status'] in ['Finalized', 'Dispatched']:
            flash(f"❌ Cannot delete: Bag is {lock_status['status']}", "danger")
            return redirect(request.referrer)

        cur.execute("SELECT weight, lot_name, needles, bag_number FROM fabric_rolls WHERE id = ?", (roll_id,))
        roll = cur.fetchone()
        
        if roll:
            roll_weight = roll['weight']
            cur.execute("""
                UPDATE lots SET fabric_weight = fabric_weight + ? 
                WHERE id = (
                    SELECT l.id FROM lots l
                    JOIN bags b ON l.bag_id = b.id
                    WHERE l.lot_name = ? AND l.needles = ? AND b.bag_number = ?
                )
            """, (roll_weight, roll['lot_name'], roll['needles'], roll['bag_number']))
            
            cur.execute("DELETE FROM fabric_rolls WHERE id = ?", (roll_id,))
            con.commit()
            flash("✅ Roll deleted and balance restored.")
            
    except Exception as e:
        con.rollback()
        flash(f"❌ Error: {str(e)}")
    finally:
        con.close()
    return redirect(request.referrer)





import random
import string

@app.route("/api/save-roll", methods=["POST"])
def api_save_roll():
    data = request.json
    con = db()
    cur = con.cursor()
    
    try:
        # --- 1. FETCH METADATA FOR THE CURRENT LOT (Shade, WO) ---
        cur.execute("""
            SELECT b.shade, wo.work_order, b.plan_id
            FROM bags b
            JOIN plans p ON b.plan_id = p.id
            JOIN work_orders wo ON p.work_order_id = wo.id
            WHERE b.bag_number = ?
        """, (data['bag_number'],))
        meta = cur.fetchone()
        
        if not meta:
            return jsonify({"success": False, "message": "❌ Bag/Work Order not found!"}), 404
            
        shade = meta['shade']
        wo_val = meta['work_order']

        # --- 2. IDENTIFY THE CURRENT JOB ID ---
        cur.execute("""
            SELECT job FROM jobs 
            WHERE work_order_ref = ? AND shade_ref = ? AND needles_ref LIKE ?
        """, (wo_val, shade, f"{data['needles']}%"))
        job_row = cur.fetchone()
        
        if not job_row:
            return jsonify({"success": False, "message": "❌ No Job record found for this Shade/Needles combo!"}), 400
            
        current_job_id = job_row['job']
        current_job_full = f"{current_job_id}/{wo_val}" # Format matches machine_assignments

        # --- 3. VALIDATE SCANNED MACHINE BARCODE ---
        barcode_scanned = data.get('barcode')
        if not barcode_scanned:
            return jsonify({"success": False, "message": "❌ Machine Barcode is required!"}), 400

        cur.execute("""
            SELECT machine_no, job_full_text 
            FROM machine_assignments 
            WHERE unique_code = ?
        """, (barcode_scanned,))
        m_row = cur.fetchone()

        if not m_row:
            return jsonify({"success": False, "message": "❌ Invalid Machine Barcode!"}), 400

        # STRICTOR CHECK: Ensure the barcode's assigned Job matches the current entry
        if m_row['job_full_text'] != current_job_full:
            # Get the shade assigned to the barcode for a better error message
            barcode_job_parts = m_row['job_full_text'].split('/')
            cur.execute("SELECT shade_ref FROM jobs WHERE job=? AND work_order_ref=?", 
                        (barcode_job_parts[0], barcode_job_parts[1]))
            assigned_shade = cur.fetchone()['shade_ref']
            
            return jsonify({
                "success": False, 
                "message": f"❌ BARCODE MISMATCH! This barcode is for {assigned_shade} (Job {m_row['job_full_text']}). "
                           f"You are feeding {shade} (Job {current_job_full})."
            }), 400

        machine_no = m_row['machine_no']

        # --- 4. GENERATE UNIQUE 7-DIGIT ROLL ID ---
        while True:
            unique_roll_id = ''.join(random.choices(string.digits, k=7))
            cur.execute("SELECT 1 FROM fabric_rolls WHERE roll_barcode = ?", (unique_roll_id,))
            if not cur.fetchone():
                break

        # --- 5. SEQUENTIAL ROLL NUMBER PER JOB ---
        cur.execute("""
            SELECT MAX(r.roll_no) 
            FROM fabric_rolls r
            JOIN bags b ON r.bag_number = b.bag_number
            WHERE r.work_order = ? 
              AND b.shade = ? 
              AND r.needles LIKE ?
        """, (wo_val, shade, f"{data['needles']}%"))
        
        max_roll = cur.fetchone()[0]
        new_roll_no = (max_roll or 0) + 1

        # --- 6. INSERT THE ROLL ---
        cur.execute("""
            INSERT INTO fabric_rolls (
                work_order, plan_id, bag_number, lot_name, roll_no, 
                weight, needles, created_at, barcode_used, roll_barcode, machine_no
            )
            VALUES(?,?,?,?,?,?,?,?,?,?,?)
        """, (
            wo_val, data['plan_id'], data['bag_number'], data['lot_name'], 
            new_roll_no, data['weight'], data['needles'], 
            datetime.now().strftime("%Y-%m-%d %H:%M"), 
            barcode_scanned, unique_roll_id, machine_no
        ))

        # --- 7. DEDUCT WEIGHT FROM PPC BALANCE ---
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






import xlsxwriter
from io import BytesIO
from flask import send_file, render_template, request, flash, redirect, url_for
import xlsxwriter
import io
from flask import send_file

@app.route("/plan-status/export")
def export_plan_excel():
    selected_bag = request.args.get("bag_number", "")
    if not selected_bag:
        flash("Please select a bag first", "warning")
        return redirect(url_for('plan_status'))

    con = db()
    cur = con.cursor()

    # Optimized Query to get all required fields
    cur.execute("""
        SELECT 
            wo.work_order,
            r.needles,
            b.shade,
            r.roll_barcode as entry_barcode,
            q.roll_id as quality_barcode,
            r.weight as produced_weight,
            q.grade_a_weight as quality_weight
        FROM fabric_rolls r
        JOIN bags b ON r.bag_number = b.bag_number
        JOIN plans p ON b.plan_id = p.id
        JOIN work_orders wo ON p.work_order_id = wo.id
        LEFT JOIN quality_checks q ON r.roll_barcode = q.roll_id
        WHERE r.bag_number = ?
        ORDER BY r.roll_no ASC
    """, (selected_bag,))
    
    rows = cur.fetchall()
    con.close()

    if not rows:
        flash("No data found for this bag", "warning")
        return redirect(url_for('plan_status'))

    # Create an in-memory output file for the workbook
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet("Plan Status")

    # Define Formats
    header_format = workbook.add_format({
        'bold': True, 'bg_color': '#343a40', 'font_color': 'white', 'border': 1, 'align': 'center'
    })
    cell_format = workbook.add_format({'border': 1, 'align': 'center'})
    num_format = workbook.add_format({'border': 1, 'align': 'center', 'num_format': '#,##0.00'})

    # Write Headers
    headers = ["Job/WO", "Needles", "Shade", "1st Barcode (Entry)", "2nd Barcode (Quality)", "Produced Weight", "Quality Weight"]
    for col_num, header in enumerate(headers):
        worksheet.write(0, col_num, header, header_format)

    # Write Data
    for row_num, row in enumerate(rows, start=1):
        worksheet.write(row_num, 0, row['work_order'], cell_format)
        worksheet.write(row_num, 1, row['needles'], cell_format)
        worksheet.write(row_num, 2, row['shade'], cell_format)
        worksheet.write(row_num, 3, row['entry_barcode'], cell_format)
        
        # Show 2nd barcode only if passed from quality
        q_barcode = row['quality_barcode'] if row['quality_barcode'] else "Pending"
        worksheet.write(row_num, 4, q_barcode, cell_format)
        
        worksheet.write(row_num, 5, row['produced_weight'], num_format)
        worksheet.write(row_num, 6, row['quality_weight'] if row['quality_weight'] else 0, num_format)

    # Adjust column widths for better visibility
    worksheet.set_column(0, 0, 15) # WO
    worksheet.set_column(3, 4, 25) # Barcodes
    worksheet.set_column(5, 6, 15) # Weights

    workbook.close()
    output.seek(0)

    filename = f"Plan_{selected_bag}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return send_file(output, download_name=filename, as_attachment=True)

# --- 1. Reports Menu Route ---
@app.route("/reports")
def reports_menu():
    return render_template("reports_menu.html")

@app.route("/export/plan-report", methods=["POST"])
def export_plan_report():
    wo_val = request.form.get("work_order")
    con = db()
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    # 1. Fetching planning data
    cur.execute("""
        SELECT wo.work_order, p.plan_id, b.bag_number, b.shade, 
               l.lot_name, l.plan_weight, l.fabric_weight as balance_qty, l.needles
        FROM work_orders wo
        JOIN plans p ON wo.id = p.work_order_id
        JOIN bags b ON p.id = b.plan_id
        JOIN lots l ON b.id = l.bag_id
        WHERE wo.work_order = ?
    """, (wo_val,))
    rows = cur.fetchall()

    if not rows:
        flash(f"No data found for Work Order {wo_val}")
        return redirect(url_for("reports_menu"))

    # 2. Fetch Status Reference Lists
    cur.execute("SELECT bag_number FROM dispatch_records")
    dispatched_list = [dr['bag_number'] for dr in cur.fetchall()]

    cur.execute("SELECT bag_number FROM finalized_bags WHERE work_order = ?", (wo_val,))
    finalized_list = [fb['bag_number'] for fb in cur.fetchall()]

    output = BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet("Plan Report")

    # --- FORMATTING (MAINTAINED) ---
    header_fmt = workbook.add_format({'bold': True, 'bg_color': '#D7E4BC', 'border': 1, 'align': 'center'})
    bag_title_fmt = workbook.add_format({'bold': True, 'font_size': 12, 'font_color': '#1F4E78', 'bg_color': '#EAEAEA', 'border': 1})
    total_fmt = workbook.add_format({'bold': True, 'bg_color': '#F2F2F2', 'border': 1, 'num_format': '#,##0.00'})
    data_fmt = workbook.add_format({'border': 1})
    num_fmt = workbook.add_format({'border': 1, 'num_format': '#,##0.00'})
    status_fmt = workbook.add_format({'border': 1, 'align': 'center', 'bold': True})

    # Columns (Removed Required Qty)
    columns = ["Work Order", "Plan ID", "Bag Number", "Shade", "Needles", 
               "Lot Name", "Plan Weight", "Fitted Rolls", "Produced Qty", 
               "A-Grade Rolls", "Balance Qty", "B-Grade Weight", "Bag Status"]
    
    worksheet.set_column('A:F', 14)
    worksheet.set_column('G:L', 13)
    worksheet.set_column('M:M', 22) 

    bags_data = {}
    for r in rows:
        bag_no = r['bag_number']
        lot_n = r['lot_name']
        if bag_no not in bags_data:
            bags_data[bag_no] = []
        
        # --- NEW LOGIC FOR PRODUCED QTY ---
        # We sum the weight from 'fabric_rolls' to show total feeded weight
        cur.execute("""
            SELECT SUM(weight) as total_produced, COUNT(id) as total_rolls 
            FROM fabric_rolls 
            WHERE bag_number = ? AND lot_name = ?
        """, (bag_no, lot_n))
        prod_data = cur.fetchone()
        produced_qty = prod_data['total_produced'] or 0.0
        total_fitted_count = prod_data['total_rolls'] or 0

        # --- LOGIC FOR QUALITY (A-GRADE / B-GRADE) ---
        cur.execute("""
            SELECT 
                SUM(q.grade_a_weight) as a_wt, 
                COUNT(q.id) as q_count, 
                SUM(q.grade_b_weight) as b_wt
            FROM quality_checks q
            JOIN fabric_rolls r ON q.roll_id = r.roll_barcode
            WHERE r.bag_number = ? AND r.lot_name = ?
        """, (bag_no, lot_n))
        qc_stats = cur.fetchone()
        prod_a_weight = qc_stats['a_wt'] or 0.0
        rolls_qc_done_count = qc_stats['q_count'] or 0
        prod_b_weight = qc_stats['b_wt'] or 0.0

        # --- STATUS HIERARCHY ---
        if bag_no in dispatched_list:
            status_text = "dispatched"
        elif bag_no in finalized_list:
            status_text = "waiting for dispatch"
        elif total_fitted_count > 0 and rolls_qc_done_count >= total_fitted_count:
            status_text = "waiting for creation"
        elif rolls_qc_done_count > 0:
            status_text = "wait for stock"
        else:
            status_text = "Qty pending"
        
        bags_data[bag_no].append({
            'wo': r['work_order'], 'plan': r['plan_id'], 'bag': bag_no, 'shade': r['shade'],
            'needles': r['needles'], 'lot': lot_n, 
            'plan_wt': r['plan_weight'], 
            'rolls': total_fitted_count, 
            'prod': produced_qty, # Total feeded weight
            'a_count': rolls_qc_done_count, 
            'balance': r['balance_qty'], 
            'b_wt': prod_b_weight, 
            'status': status_text
        })

    row_idx = 0
    for bag_no, lots in bags_data.items():
        worksheet.merge_range(row_idx, 0, row_idx, 12, f"BAG: {bag_no}", bag_title_fmt)
        row_idx += 1
        
        for col_num, header in enumerate(columns):
            worksheet.write(row_idx, col_num, header, header_fmt)
        row_idx += 1

        s_plan, s_fitted, s_prod, s_a, s_bal, s_b = 0, 0, 0, 0, 0, 0
        for lot in lots:
            worksheet.write(row_idx, 0, lot['wo'], data_fmt)
            worksheet.write(row_idx, 1, lot['plan'], data_fmt)
            worksheet.write(row_idx, 2, lot['bag'], data_fmt)
            worksheet.write(row_idx, 3, lot['shade'], data_fmt)
            worksheet.write(row_idx, 4, lot['needles'], data_fmt)
            worksheet.write(row_idx, 5, lot['lot'], data_fmt)
            worksheet.write(row_idx, 6, lot['plan_wt'], num_fmt)
            worksheet.write(row_idx, 7, lot['rolls'], data_fmt)
            worksheet.write(row_idx, 8, lot['prod'], num_fmt)
            worksheet.write(row_idx, 9, lot['a_count'], data_fmt)
            worksheet.write(row_idx, 10, lot['balance'], num_fmt)
            worksheet.write(row_idx, 11, lot['b_wt'], num_fmt)
            worksheet.write(row_idx, 12, lot['status'], status_fmt)
            
            s_plan += lot['plan_wt']; s_fitted += lot['rolls']; s_prod += lot['prod']
            s_a += lot['a_count']; s_bal += lot['balance']; s_b += lot['b_wt']
            row_idx += 1

        worksheet.write(row_idx, 5, "BAG TOTALS:", total_fmt)
        worksheet.write(row_idx, 6, s_plan, total_fmt)
        worksheet.write(row_idx, 7, s_fitted, total_fmt)
        worksheet.write(row_idx, 8, s_prod, total_fmt)
        worksheet.write(row_idx, 9, s_a, total_fmt)
        worksheet.write(row_idx, 10, s_bal, total_fmt)
        worksheet.write(row_idx, 11, s_b, total_fmt)
        row_idx += 2 

    workbook.close()
    output.seek(0)
    con.close()
    return send_file(output, as_attachment=True, download_name=f"Detailed_Plan_Report_{wo_val}.xlsx")


@app.route("/ppc/lot/update-qty/<int:id>", methods=["POST"])
def update_lot_qty(id):
    new_qty = request.form.get("new_weight")
    
    if not new_qty:
        flash("❌ Error: No weight provided")
        return redirect(url_for("ppc"))

    con = db()
    cur = con.cursor()
    try:
        # 1. Fetch the bag_id associated with this lot
        cur.execute("SELECT bag_id FROM lots WHERE id = ?", (id,))
        lot_info = cur.fetchone()
        if not lot_info:
            flash("❌ Error: Lot not found")
            return redirect(url_for("ppc"))
        
        bag_id = lot_info['bag_id']

        # 2. Reset both Balance (fabric_weight) and Stable Target (plan_weight)
        # This resets the production progress for this specific lot
        cur.execute("""
            UPDATE lots 
            SET fabric_weight = ?, plan_weight = ? 
            WHERE id = ?
        """, (new_qty, new_qty, id))

        # 3. Recalculate the Total Bag Weight
        # User requirement: "bag wight show sum of plan wight of all lots of this bag"
        cur.execute("SELECT SUM(plan_weight) FROM lots WHERE bag_id = ?", (bag_id,))
        new_bag_total = cur.fetchone()[0] or 0

        # 4. Sync the new bag total across all lots in this bag
        cur.execute("UPDATE lots SET bag_weight = ? WHERE bag_id = ?", (new_bag_total, bag_id))

        con.commit()
        flash(f"✅ Updated Lot Target to {new_qty} KG. Bag Total synchronized to {new_bag_total} KG.")
    except Exception as e:
        con.rollback()
        flash(f"❌ Database Error: {str(e)}")
    finally:
        con.close()
        
    return redirect(url_for("ppc"))


# ================= RUN =================
def migrate_hr_columns():
    con = db()
    cur = con.cursor()
    
    # List of all advanced columns we need for the industrial version
    required_columns = [
        ('address', 'TEXT'),
        ('emergency_name', 'TEXT'),
        ('emergency_phone', 'TEXT'),
        ('blood_group', 'TEXT'),
        ('joining_date', 'TEXT'),
        ('shift', 'TEXT DEFAULT "Day"'),
        ('status', 'TEXT DEFAULT "Active"')
    ]
    
    for col_name, col_type in required_columns:
        try:
            # Attempt to add the column
            cur.execute(f"ALTER TABLE hr_staff ADD COLUMN {col_name} {col_type}")
            print(f"Successfully added column: {col_name}")
        except sqlite3.OperationalError as e:
            # If error contains "duplicate column name", we just ignore it
            if "duplicate column name" in str(e).lower():
                print(f"Column '{col_name}' already exists. Skipping.")
            else:
                print(f"Error adding '{col_name}': {e}")
                
    con.commit()
    con.close()

# Update your launch block at the bottom of main.py
if __name__ == "__main__":

    safe_init_db() # Run database checks once at startup
    app.run(debug=True, host='0.0.0.0', port=5000)

    init_db()              # Creates tables if they don't exist
    migrate_hr_columns()   # Adds missing columns to existing tables
    app.run(debug=True, host='0.0.0.0', port=5000)

