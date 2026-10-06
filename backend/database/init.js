const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'tickets.db');
const db = new DatabaseSync(dbPath);

function initDatabase() {
  // Ensure tables exist without dropping existing data
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      group_name TEXT
    );

    CREATE TABLE IF NOT EXISTS technicians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      designation TEXT,
      department_wing TEXT,
      phone TEXT
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category_id INTEGER,
      priority TEXT DEFAULT 'High',
      status TEXT DEFAULT 'New',
      created_by_name TEXT,
      created_by_email TEXT,
      assigned_technician_id INTEGER,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      closed_at TEXT,
      reopened_at TEXT,
      due_at TEXT NOT NULL,
      assigned_at TEXT,
      sla_warning_sent INTEGER DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (assigned_technician_id) REFERENCES technicians(id)
    );

    CREATE TABLE IF NOT EXISTS ticket_remarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT DEFAULT 'Staff',
      remark_text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ticket_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS technician_categories (
      technician_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      PRIMARY KEY (technician_id, category_id),
      FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user'
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed & Reset Initial Visitor Counter
  try {
    db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('visitor_count', '1')").run();
  } catch (e) {
    console.error('Error resetting visitor count:', e);
  }

  // Safe ALTER TABLE migrations
  try { db.exec("ALTER TABLE tickets ADD COLUMN reopened_at TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE tickets ADD COLUMN merged_into_ticket_id INTEGER"); } catch (e) {}

  // Seed Pre-configured System Roles (ONLY if roles table is empty)
  const roleCount = db.prepare('SELECT COUNT(*) as cnt FROM roles').get().cnt;
  if (roleCount === 0) {
    const insertRole = db.prepare('INSERT OR IGNORE INTO roles (role_key, role_name, description, access_level, is_system) VALUES (?, ?, ?, ?, ?)');
    [
      ['admin', 'Administrator', 'Full system access, user management, SLA config, and admin console privileges.', 'Super Admin', 1],
      ['universal', 'Universal Operator', 'Universal ticket handling, category re-allocation, and system-wide support.', 'Universal Support', 1],
      ['technician', 'Technician Specialist', 'Assigned department category ticket resolution and status updates.', 'Technician', 1],
      ['user', 'Citizen User', 'Standard public portal user account to raise and track helpdesk tickets.', 'Citizen User', 1]
    ].forEach(([key, name, desc, level, isSys]) => {
      try { insertRole.run(key, name, desc, level, isSys); } catch (e) {}
    });
  }

  // Seed Pre-configured User Accounts (ONLY on initial first run if users table is completely empty)
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
  if (userCount === 0) {
    const insertUser = db.prepare('INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
    [
      ['System Administrator', 'admin@townplanning.gov.in', 'admin123', 'admin'],
      ['Universal Helpdesk Operator', 'universal@townplanning.gov.in', 'univ123', 'universal'],
      ['Sunil Choudhary', 'tech@townplanning.gov.in', 'tech123', 'technician'],
      ['Sunil Choudhary', 'sunilc@softtech-engr.com', 'tech123', 'technician'],
      ['Suresh Kumar', 'user@townplanning.gov.in', 'user123', 'user'],
      ['Amitabh Roy', 'amitabh.r@softtech-engr.com', 'tech123', 'technician'],
      ['Sheetal Sharma', 'sheetal.j@softtech-engr.com', 'tech123', 'technician'],
      ['Mohammed Khan', 'mohammed.khan@softtech-engr.com', 'tech123', 'technician'],
      ['Ramesh Sahu', 'ramesh.sahu@gmail.com', 'user123', 'user']
    ].forEach(([name, email, pass, role]) => {
      try { insertUser.run(name, email, pass, role); } catch (e) {}
    });
  }

  // Seed Pre-configured Categories (ONLY if categories table is empty)
  const catCount = db.prepare('SELECT COUNT(*) as cnt FROM categories').get().cnt;
  if (catCount === 0) {
    const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name, group_name) VALUES (?, ?)');
    const seedCategories = [
      ['BPAMS System', 'BPAMS'],
      ['Application submission (form data)', 'BPAMS'],
      ['AutoDCR', 'BPAMS'],
      ['PreDCR File Scrutiny', 'BPAMS'],
      ['Drawings Scrutiny', 'BPAMS'],
      ['PDF generation', 'Technical'],
      ['Payment Gateway', 'Technical'],
      ['Helpdesk DTCP', 'Technical'],
      ['Technical Glitch', 'Technical'],
      ['General Query', 'General'],
      ['Other Support', 'General'],
      ['Feature Request', 'Feature Request']
    ];
    seedCategories.forEach(([cName, gName]) => {
      try { insertCat.run(cName, gName); } catch (e) {}
    });
  }

  // Seed Pre-configured Technicians (ONLY if technicians table is empty)
  const techCount = db.prepare('SELECT COUNT(*) as cnt FROM technicians').get().cnt;
  if (techCount === 0) {
    const insertTech = db.prepare('INSERT OR IGNORE INTO technicians (name, email, designation, department_wing, phone) VALUES (?, ?, ?, ?, ?)');
    const seedTechs = [
      ['Universal Helpdesk Operator', 'universal@townplanning.gov.in', 'Universal Helpdesk Operator', 'Helpdesk Central Wing', '9876540000'],
      ['Amitabh Roy', 'amitabh.r@softtech-engr.com', 'Senior BPAMS Specialist', 'BPAMS Wing', '9876543210'],
      ['Sheetal Sharma', 'sheetal.j@softtech-engr.com', 'PreDCR Scrutiny Officer', 'Scrutiny Wing', '9876543211'],
      ['Sunil Choudhary', 'sunilc@softtech-engr.com', 'Technical Helpdesk Lead', 'Technical Wing', '9876543212'],
      ['Mohammed Khan', 'mohammed.khan@softtech-engr.com', 'Payment Gateway Specialist', 'Finance Wing', '9876543213']
    ];

    seedTechs.forEach(([name, email, desig, wing, phone]) => {
      try { insertTech.run(name, email, desig, wing, phone); } catch (e) {}
    });

    const insertTechCat = db.prepare('INSERT OR IGNORE INTO technician_categories (technician_id, category_id) VALUES (?, ?)');
    [
      [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10], [1, 11], [1, 12],
      [2, 1], [2, 2], [2, 3],
      [3, 4], [3, 5],
      [4, 6], [4, 7], [4, 8], [4, 9],
      [5, 10], [5, 11], [5, 12]
    ].forEach(([tId, cId]) => {
      try { insertTechCat.run(tId, cId); } catch (e) {}
    });
  }

  // Ensure is_deleted column exists on users and technicians tables
  try { db.exec('ALTER TABLE users ADD COLUMN is_deleted INTEGER DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE technicians ADD COLUMN is_deleted INTEGER DEFAULT 0'); } catch (e) {}

  // Clean start: No dummy / demo tickets seeded by default
  // Tickets will be created dynamically through the user interface.

  console.log('Database initialized successfully with schema and seed data.');
}

module.exports = { db, initDatabase };
