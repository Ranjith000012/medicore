from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            age INTEGER,
            gender TEXT,
            blood_group TEXT,
            address TEXT,
            allergies TEXT,
            emergency_contact TEXT,
            emergency_phone TEXT,
            registered_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_phone TEXT NOT NULL,
            hospital_name TEXT,
            doctor_name TEXT,
            visit_date TEXT,
            diagnosis TEXT,
            prescription TEXT,
            notes TEXT,
            report_type TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_phone) REFERENCES patients(phone)
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/api/register', methods=['POST'])
def register_patient():
    data = request.json
    required = ['name', 'phone']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('''
            INSERT INTO patients (name, phone, age, gender, blood_group, address, allergies, emergency_contact, emergency_phone, registered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['name'], data['phone'], data.get('age'), data.get('gender'),
            data.get('blood_group'), data.get('address'), data.get('allergies'),
            data.get('emergency_contact'), data.get('emergency_phone'),
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Patient registered successfully', 'phone': data['phone']}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Phone number already registered'}), 409

@app.route('/api/patient/<phone>', methods=['GET'])
def get_patient(phone):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM patients WHERE phone = ?', (phone,))
    patient = c.fetchone()
    conn.close()
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    return jsonify(dict(patient))

@app.route('/api/patient/<phone>', methods=['DELETE'])
def delete_patient(phone):
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM reports WHERE patient_phone = ?', (phone,))
    c.execute('DELETE FROM patients WHERE phone = ?', (phone,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Patient deleted'})

@app.route('/api/report', methods=['POST'])
def add_report():
    data = request.json
    if not data.get('patient_phone'):
        return jsonify({'error': 'patient_phone is required'}), 400
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT id FROM patients WHERE phone = ?', (data['patient_phone'],))
    if not c.fetchone():
        conn.close()
        return jsonify({'error': 'Patient not found'}), 404
    c.execute('''
        INSERT INTO reports (patient_phone, hospital_name, doctor_name, visit_date, diagnosis, prescription, notes, report_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['patient_phone'], data.get('hospital_name'), data.get('doctor_name'),
        data.get('visit_date', datetime.now().strftime('%Y-%m-%d')),
        data.get('diagnosis'), data.get('prescription'), data.get('notes'),
        data.get('report_type', 'General'), datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    ))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Report added successfully'}), 201

@app.route('/api/reports/<phone>', methods=['GET'])
def get_reports(phone):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM reports WHERE patient_phone = ? ORDER BY visit_date DESC', (phone,))
    reports = [dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(reports)

@app.route('/api/patients', methods=['GET'])
def get_all_patients():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM patients ORDER BY registered_at DESC')
    patients = [dict(p) for p in c.fetchall()]
    conn.close()
    return jsonify(patients)

@app.route('/api/hospitals', methods=['GET'])
def get_hospitals():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT DISTINCT hospital_name FROM reports WHERE hospital_name IS NOT NULL')
    hospitals = [r[0] for r in c.fetchall()]
    conn.close()
    return jsonify(hospitals)

@app.route('/api/doctors', methods=['GET'])
def get_doctors():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT DISTINCT doctor_name FROM reports WHERE doctor_name IS NOT NULL')
    doctors = [r[0] for r in c.fetchall()]
    conn.close()
    return jsonify(doctors)

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM patients')
    total_patients = c.fetchone()[0]
    c.execute('SELECT COUNT(*) FROM reports')
    total_reports = c.fetchone()[0]
    c.execute('SELECT COUNT(DISTINCT hospital_name) FROM reports WHERE hospital_name IS NOT NULL')
    total_hospitals = c.fetchone()[0]
    c.execute('SELECT COUNT(DISTINCT doctor_name) FROM reports WHERE doctor_name IS NOT NULL')
    total_doctors = c.fetchone()[0]
    conn.close()
    return jsonify({
        'total_patients': total_patients,
        'total_reports': total_reports,
        'total_hospitals': total_hospitals,
        'total_doctors': total_doctors
    })

if __name__ == '__main__':
    init_db()
    print("Medical Records System Backend Running on http://localhost:5000")
    app.run(debug=True, port=5000)
