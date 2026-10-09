const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { db, initDatabase } = require('./database/init');
const { sendTicketCreatedEmail, sendTicketAssignedEmail, sendSLABreachWarningEmail, sendTicketActionUpdateEmail } = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 5000;

// Prevent server process crashes from unhandled errors
process.on('uncaughtException', (err) => {
  console.error('[SERVER ERROR CAUGHT] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER ERROR CAUGHT] Unhandled Promise Rejection:', reason);
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer Storage Configuration for File Attachments (Any format: PDF, DWG/CAD, Images, ZIP, DOCX)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'file-' + uniqueSuffix + ext);
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max file size limit
});

// Initialize Database Tables & Seed Data
initDatabase();

// Standalone Image / File Upload API Endpoint (For pasted description images)
app.post('/api/upload', upload.any(), (req, res) => {
  try {
    const file = req.files && req.files.length > 0 ? req.files[0] : req.file;
    if (!file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    const imageUrl = `/uploads/${file.filename}`;
    res.json({ 
      url: imageUrl, 
      filename: file.filename, 
      originalName: file.originalname,
      size: file.size
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'town_planning_helpdesk_super_secret_jwt_key_2026';

// Middleware to verify JWT Token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.query.token;

  if (!token) {
    return next(); // Fallback if no token provided
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired JWT security token' });
    }
    req.user = decoded;
    next();
  });
}

// -------------------------------------------------------------
// AUTHENTICATION ROUTES (JWT SECURED)
// -------------------------------------------------------------

// POST /api/auth/login - User/Tech/Admin Authentication with JWT Token Generation
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const user = db.prepare('SELECT id, name, email, role FROM users WHERE LOWER(email) = LOWER(?) AND password = ?').get(email, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email ID or password' });
    }

    // Generate signed JWT Token valid for 24 hours
    const token = jwt.sign(
      { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful (JWT Secured)',
      token,
      user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register - Citizen Self Registration
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, Email ID, and Password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPass = password.trim();
    const userRole = (role || 'user').trim().toLowerCase();

    const existing = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
    if (existing) {
      if (existing.is_deleted === 1) {
        db.prepare('UPDATE users SET name = ?, password = ?, role = ?, is_deleted = 0 WHERE id = ?').run(
          cleanName,
          cleanPass,
          userRole,
          existing.id
        );
      } else {
        return res.status(400).json({ error: 'User with this Email ID already exists' });
      }
    } else {
      const stmt = db.prepare('INSERT INTO users (name, email, password, role, is_deleted) VALUES (?, ?, ?, ?, 0)');
      stmt.run(cleanName, cleanEmail, cleanPass, userRole);
    }

    const newUser = db.prepare('SELECT id, name, email, role FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);

    res.status(201).json({
      message: 'Registration successful! You can now log in.',
      user: newUser
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users - Create or Provision User Account (Admin Console)
app.post('/api/users', (req, res) => {
  try {
    const { name, email, password, role, designation, phone, category_ids } = req.body;

    if (!name || !name.trim() || !email || !email.trim() || !password || !password.trim()) {
      return res.status(400).json({ error: 'Full Name, Email ID, and Password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPass = password.trim();
    const userRole = (role || 'user').trim().toLowerCase();
    const userDesignation = designation ? designation.trim() : (userRole === 'technician' ? 'Technician Specialist' : 'Staff');
    const userPhone = phone ? phone.trim() : '';

    const existingUser = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);

    let userId;
    if (existingUser) {
      if (existingUser.is_deleted === 1) {
        // Account was previously deactivated: Reactivate & Update
        db.prepare('UPDATE users SET name = ?, password = ?, role = ?, is_deleted = 0 WHERE id = ?').run(
          cleanName,
          cleanPass,
          userRole,
          existingUser.id
        );
        userId = existingUser.id;
      } else {
        return res.status(400).json({ error: `An active user account with Email ID "${cleanEmail}" already exists.` });
      }
    } else {
      // Insert new user
      const stmt = db.prepare('INSERT INTO users (name, email, password, role, is_deleted) VALUES (?, ?, ?, ?, 0)');
      const result = stmt.run(cleanName, cleanEmail, cleanPass, userRole);
      userId = Number(result.lastInsertRowid);
    }

    // If role is technician or universal, sync technicians table & categories
    if (userRole === 'technician' || userRole === 'universal') {
      const existingTech = db.prepare('SELECT id FROM technicians WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
      let techId;
      if (existingTech) {
        db.prepare('UPDATE technicians SET name = ?, designation = ?, department_wing = ?, phone = ?, is_deleted = 0 WHERE id = ?').run(
          cleanName,
          userDesignation,
          userDesignation,
          userPhone,
          existingTech.id
        );
        techId = existingTech.id;
      } else {
        const techStmt = db.prepare('INSERT INTO technicians (name, email, designation, department_wing, phone, is_deleted) VALUES (?, ?, ?, ?, ?, 0)');
        const techRes = techStmt.run(cleanName, cleanEmail, userDesignation, userDesignation, userPhone);
        techId = Number(techRes.lastInsertRowid);
      }

      // Sync categories if provided
      if (Array.isArray(category_ids)) {
        db.prepare('DELETE FROM technician_categories WHERE technician_id = ?').run(techId);
        const catStmt = db.prepare('INSERT INTO technician_categories (technician_id, category_id) VALUES (?, ?)');
        category_ids.forEach(catId => {
          if (catId) {
            try { catStmt.run(techId, Number(catId)); } catch (e) {}
          }
        });
      }
    }

    const savedUser = db.prepare('SELECT id, name, email, role, COALESCE(is_deleted, 0) as is_deleted FROM users WHERE id = ?').get(userId);

    res.status(201).json({
      message: `User account (${userRole.toUpperCase()}) provisioned successfully!`,
      user: savedUser
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/visitor-count - Fetch current visitor count
app.get('/api/visitor-count', (req, res) => {
  try {
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'visitor_count'").get();
    let count = row ? parseInt(row.value, 10) : 1;
    if (isNaN(count) || count > 10000) {
      count = 1;
      db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('visitor_count', '1')").run();
    }
    res.json({ visitor_count: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/visitor-count/increment - Increment visitor count on page open
app.post('/api/visitor-count/increment', (req, res) => {
  try {
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'visitor_count'").get();
    let currentCount = row ? parseInt(row.value, 10) : 0;
    if (isNaN(currentCount) || currentCount > 10000) {
      currentCount = 0;
    }
    currentCount += 1;

    db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('visitor_count', ?)").run(String(currentCount));
    res.json({ visitor_count: currentCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/visitor-count/reset - Reset visitor count back to 1
app.post('/api/visitor-count/reset', (req, res) => {
  try {
    db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('visitor_count', '1')").run();
    res.json({ visitor_count: 1, message: 'Visitor count reset to 1' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users - List All Users & Technicians for Admin Console (Includes is_deleted state)
app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, password, role, COALESCE(is_deleted, 0) as is_deleted FROM users ORDER BY id ASC').all();
    const techCats = db.prepare('SELECT * FROM technician_categories').all();
    const technicians = db.prepare('SELECT id, email, designation, phone, COALESCE(is_deleted, 0) as is_deleted FROM technicians').all();

    const result = users.map(u => {
      const tech = technicians.find(t => t.email.toLowerCase() === u.email.toLowerCase());
      let category_ids = [];
      if (tech) {
        category_ids = techCats.filter(tc => tc.technician_id === tech.id).map(tc => tc.category_id);
      }
      return {
        ...u,
        technician_id: tech ? tech.id : null,
        designation: tech ? tech.designation : '',
        phone: tech ? tech.phone : '',
        category_ids
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id - Edit Registered User Account Details (Name, Email, Password, Role, Designation, Phone, Categories)
app.put('/api/users/:id', (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { name, email, password, role, designation, phone, category_ids } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'User Name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email ID is required' });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanRole = role ? role.trim() : 'user';
    const cleanDesignation = designation ? designation.trim() : '';
    const cleanPhone = phone ? phone.trim() : '';

    const existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User account not found' });
    }

    // Check if another user already has the new email
    const emailConflict = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?').get(cleanEmail, userId);
    if (emailConflict) {
      return res.status(400).json({ error: `Another user account with Email "${cleanEmail}" already exists.` });
    }

    const oldEmail = existingUser.email;
    const finalPassword = password && password.trim() ? password.trim() : existingUser.password;

    // Update users table
    db.prepare('UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE id = ?').run(
      cleanName,
      cleanEmail,
      finalPassword,
      cleanRole,
      userId
    );

    // Sync with technicians table
    const existingTech = db.prepare('SELECT id FROM technicians WHERE LOWER(email) = LOWER(?) OR LOWER(email) = LOWER(?)').get(cleanEmail, oldEmail);
    let techId = null;

    if (cleanRole === 'technician' || cleanRole === 'universal' || (Array.isArray(category_ids) && category_ids.length > 0)) {
      if (existingTech) {
        db.prepare('UPDATE technicians SET name = ?, email = ?, designation = ?, department_wing = ?, phone = ?, is_deleted = 0 WHERE id = ?').run(
          cleanName,
          cleanEmail,
          cleanDesignation || 'Specialist',
          cleanDesignation || 'Specialist',
          cleanPhone,
          existingTech.id
        );
        techId = existingTech.id;
      } else {
        const techStmt = db.prepare('INSERT INTO technicians (name, email, designation, department_wing, phone, is_deleted) VALUES (?, ?, ?, ?, ?, 0)');
        const techRes = techStmt.run(cleanName, cleanEmail, cleanDesignation || 'Specialist', cleanDesignation || 'Specialist', cleanPhone);
        techId = Number(techRes.lastInsertRowid);
      }

      // Sync category allocations if category_ids array is provided
      if (Array.isArray(category_ids)) {
        db.prepare('DELETE FROM technician_categories WHERE technician_id = ?').run(techId);
        const catStmt = db.prepare('INSERT INTO technician_categories (technician_id, category_id) VALUES (?, ?)');
        category_ids.forEach(catId => {
          if (catId) {
            try { catStmt.run(techId, Number(catId)); } catch (e) {}
          }
        });
      }
    } else {
      if (existingTech) {
        db.prepare('UPDATE technicians SET name = ?, email = ?, designation = ?, phone = ? WHERE id = ?').run(
          cleanName,
          cleanEmail,
          cleanDesignation,
          cleanPhone,
          existingTech.id
        );
        techId = existingTech.id;
        if (Array.isArray(category_ids)) {
          db.prepare('DELETE FROM technician_categories WHERE technician_id = ?').run(techId);
          const catStmt = db.prepare('INSERT INTO technician_categories (technician_id, category_id) VALUES (?, ?)');
          category_ids.forEach(catId => {
            if (catId) {
              try { catStmt.run(techId, Number(catId)); } catch (e) {}
            }
          });
        }
      }
    }

    const updatedUser = db.prepare('SELECT id, name, email, password, role, COALESCE(is_deleted, 0) as is_deleted FROM users WHERE id = ?').get(userId);

    let updatedCatIds = [];
    if (techId) {
      const cats = db.prepare('SELECT category_id FROM technician_categories WHERE technician_id = ?').all(techId);
      updatedCatIds = cats.map(c => c.category_id);
    }

    res.json({
      message: `User account "${cleanName}" updated successfully!`,
      user: {
        ...updatedUser,
        technician_id: techId,
        designation: cleanDesignation,
        phone: cleanPhone,
        category_ids: updatedCatIds
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/password - Reset User Password (Admin feature)
app.put('/api/users/:id/password', (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { password } = req.body;

    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'New password is required' });
    }

    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(password.trim(), userId);
    res.json({ message: 'Password reset successfully', userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id - Soft-Delete / Deactivate User Account (Preserves Tickets & History)
app.delete('/api/users/:id', (req, res) => {
  try {
    const userId = Number(req.params.id);
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);

    if (user) {
      db.prepare('UPDATE users SET is_deleted = 1 WHERE id = ?').run(userId);
      db.prepare('UPDATE technicians SET is_deleted = 1 WHERE LOWER(email) = LOWER(?)').run(user.email);
    }

    res.json({ message: 'User account soft-deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/restore - Restore Soft-Deleted User Account
app.put('/api/users/:id/restore', (req, res) => {
  try {
    const userId = Number(req.params.id);
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);

    if (user) {
      db.prepare('UPDATE users SET is_deleted = 0 WHERE id = ?').run(userId);
      db.prepare('UPDATE technicians SET is_deleted = 0 WHERE LOWER(email) = LOWER(?)').run(user.email);
    }

    res.json({ message: 'User account restored successfully', userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. GET /api/categories - List All Categories
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY id ASC').all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories - Create New Ticket Category
app.post('/api/categories', (req, res) => {
  try {
    const { name, group_name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category Name is required' });
    }

    const existing = db.prepare('SELECT * FROM categories WHERE LOWER(name) = LOWER(?)').get(name.trim());
    if (existing) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    const stmt = db.prepare('INSERT INTO categories (name, group_name) VALUES (?, ?)');
    const result = stmt.run(name.trim(), group_name ? group_name.trim() : 'General Support');
    const newCat = { id: Number(result.lastInsertRowid), name: name.trim(), group_name: group_name ? group_name.trim() : 'General Support' };

    res.status(201).json(newCat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id - Edit Category (Name, Group Name)
app.put('/api/categories/:id', (req, res) => {
  try {
    const catId = Number(req.params.id);
    const { name, group_name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category Name is required' });
    }

    const cleanName = name.trim();
    const cleanGroup = group_name ? group_name.trim() : 'General Support';

    const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(catId);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const duplicate = db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?').get(cleanName, catId);
    if (duplicate) {
      return res.status(400).json({ error: `Category with name "${cleanName}" already exists.` });
    }

    db.prepare('UPDATE categories SET name = ?, group_name = ? WHERE id = ?').run(cleanName, cleanGroup, catId);

    const updatedCat = db.prepare('SELECT * FROM categories WHERE id = ?').get(catId);
    res.json({ message: `Category "${cleanName}" updated successfully!`, category: updatedCat });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id - Delete Category
app.delete('/api/categories/:id', (req, res) => {
  try {
    const catId = Number(req.params.id);

    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(catId);
    if (!cat) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Remove category mapping from technician_categories
    db.prepare('DELETE FROM technician_categories WHERE category_id = ?').run(catId);

    // If any tickets use this category, set category_id to NULL
    try {
      db.prepare('UPDATE tickets SET category_id = NULL WHERE category_id = ?').run(catId);
    } catch (e) {}

    // Delete category
    db.prepare('DELETE FROM categories WHERE id = ?').run(catId);

    res.json({ message: `Category "${cat.name}" deleted successfully!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/technicians - List All Technicians with Assigned Categories
app.get('/api/technicians', (req, res) => {
  try {
    const technicians = db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM tickets k WHERE k.assigned_technician_id = t.id AND k.status != 'Closed') as active_tickets
      FROM technicians t
      ORDER BY t.id ASC
    `).all();

    const techCats = db.prepare('SELECT * FROM technician_categories').all();

    const result = technicians.map(tech => {
      const assignedCatIds = techCats
        .filter(tc => tc.technician_id === tech.id)
        .map(tc => tc.category_id);
      return {
        ...tech,
        category_ids: assignedCatIds
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/technicians - Add New Technician with Assigned Categories & User Account Password
app.post('/api/technicians', (req, res) => {
  try {
    const { name, email, password, designation, phone, category_ids } = req.body;
    const techDesignation = designation || 'Technician Specialist';
    const techPhone = phone || '';
    const deptWing = techDesignation;

    const stmt = db.prepare('INSERT INTO technicians (name, email, designation, department_wing, phone) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(name, email, techDesignation, deptWing, techPhone);
    const techId = Number(result.lastInsertRowid);

    // Create / Sync User Login Account for Technician
    db.prepare('INSERT OR REPLACE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
      name, 
      email, 
      password || 'tech123', 
      'technician'
    );

    if (Array.isArray(category_ids) && category_ids.length > 0) {
      const catStmt = db.prepare('INSERT INTO technician_categories (technician_id, category_id) VALUES (?, ?)');
      category_ids.forEach(catId => {
        catStmt.run(techId, Number(catId));
      });
    }

    res.status(201).json({ id: techId, name, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/technicians/:id - Soft-Delete Technician & User Account (Preserves Tickets & History)
app.delete('/api/technicians/:id', (req, res) => {
  try {
    const techId = Number(req.params.id);

    const tech = db.prepare('SELECT email FROM technicians WHERE id = ?').get(techId);
    if (tech) {
      db.prepare('UPDATE technicians SET is_deleted = 1 WHERE id = ?').run(techId);
      db.prepare('UPDATE users SET is_deleted = 1 WHERE LOWER(email) = LOWER(?)').run(tech.email);
    }

    res.json({ message: 'Technician soft-deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// SYSTEM & CUSTOM ROLES MANAGEMENT ENDPOINTS
// -------------------------------------------------------------

// GET /api/roles - Fetch all system & custom roles with assigned account counts
app.get('/api/roles', (req, res) => {
  try {
    const roles = db.prepare(`
      SELECT r.*, COUNT(u.id) as user_count 
      FROM roles r 
      LEFT JOIN users u ON LOWER(u.role) = LOWER(r.role_key) AND COALESCE(u.is_deleted, 0) = 0
      GROUP BY r.id
      ORDER BY r.is_system DESC, r.id ASC
    `).all();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/roles - Create a new Custom Role
app.post('/api/roles', (req, res) => {
  try {
    const { role_name, description, access_level } = req.body;
    if (!role_name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const role_key = role_name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');

    const stmt = db.prepare('INSERT INTO roles (role_key, role_name, description, access_level, is_system) VALUES (?, ?, ?, ?, 0)');
    const result = stmt.run(role_key, role_name, description || '', access_level || 'Custom Level');

    res.status(201).json({ id: Number(result.lastInsertRowid), role_key, role_name, description, access_level });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'A role with this name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/roles/:id - Delete custom role
app.delete('/api/roles/:id', (req, res) => {
  try {
    const roleId = Number(req.params.id);
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    if (role.is_system === 1) {
      return res.status(400).json({ error: 'System built-in roles cannot be deleted' });
    }

    db.prepare('DELETE FROM roles WHERE id = ?').run(roleId);
    res.json({ message: 'Custom role deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/technicians/:id/categories - Update Technician Category Allocations
app.put('/api/technicians/:id/categories', (req, res) => {
  try {
    const techId = Number(req.params.id);
    const { category_ids } = req.body;

    db.prepare('DELETE FROM technician_categories WHERE technician_id = ?').run(techId);

    if (Array.isArray(category_ids) && category_ids.length > 0) {
      const catStmt = db.prepare('INSERT INTO technician_categories (technician_id, category_id) VALUES (?, ?)');
      category_ids.forEach(catId => {
        catStmt.run(techId, Number(catId));
      });
    }

    res.json({ message: 'Technician category allocations updated successfully', category_ids });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/clear-all - Delete all tickets, remarks, attachments (for clean GitHub deployment / test reset)
app.post('/api/tickets/clear-all', (req, res) => {
  try {
    db.exec(`
      DELETE FROM ticket_remarks;
      DELETE FROM ticket_attachments;
      DELETE FROM tickets;
    `);
    try {
      db.exec("DELETE FROM sqlite_sequence WHERE name IN ('tickets', 'ticket_remarks', 'ticket_attachments');");
    } catch (e) {}

    res.json({ message: 'All tickets, remarks, and attachments have been cleared successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to automatically close tickets that have been in 'Resolved' status for >= 24 hours
function autoCloseResolvedTickets() {
  try {
    const now = new Date();
    const resolvedTickets = db.prepare("SELECT * FROM tickets WHERE status = 'Resolved'").all();
    
    resolvedTickets.forEach(ticket => {
      if (ticket.resolved_at) {
        const resolvedTime = new Date(ticket.resolved_at);
        const diffHours = (now - resolvedTime) / (1000 * 60 * 60);
        if (diffHours >= 24) {
          const closed_at = now.toISOString();
          db.prepare("UPDATE tickets SET status = 'Closed', closed_at = ? WHERE id = ?").run(closed_at, ticket.id);
          db.prepare("INSERT INTO ticket_remarks (ticket_id, user_name, user_role, remark_text, created_at) VALUES (?, ?, ?, ?, ?)").run(
            ticket.id,
            'System Automation',
            'System',
            'Ticket automatically changed from Resolved to Closed after 24 hours.',
            closed_at
          );
        }
      }
    });
  } catch (err) {
    console.error('Error auto-closing resolved tickets:', err);
  }
}

// 3. GET /api/tickets - List All Tickets with Filters & User Scope
app.get('/api/tickets', (req, res) => {
  try {
    // Sync 24-hour auto closure for resolved tickets
    autoCloseResolvedTickets();

    const { status, priority, technician_id, category_id, search, user_email, user_role, startDate, endDate, include_merged } = req.query;

    let query = `
      SELECT t.*, 
        c.name as category_name,
        tech.name as technician_name,
        tech.email as technician_email,
        master_t.ticket_number as merged_into_ticket_number,
        master_t.title as merged_into_ticket_title,
        (SELECT GROUP_CONCAT(ticket_number, ', ') FROM tickets mt WHERE mt.merged_into_ticket_id = t.id) as merged_ticket_numbers,
        (SELECT COUNT(*) FROM tickets mt WHERE mt.merged_into_ticket_id = t.id) as merged_tickets_count,
        (SELECT COUNT(*) FROM ticket_remarks r WHERE r.ticket_id = t.id) as remarks_count,
        (SELECT COUNT(*) FROM ticket_attachments a WHERE a.ticket_id = t.id) as attachments_count
      FROM tickets t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN technicians tech ON t.assigned_technician_id = tech.id
      LEFT JOIN tickets master_t ON t.merged_into_ticket_id = master_t.id
      WHERE 1=1
    `;

    const params = [];

    // By default, exclude merged tickets so they don't clutter the main Ticket Details list
    if (include_merged !== 'true') {
      query += ` AND t.merged_into_ticket_id IS NULL AND t.status != 'Merged'`;
    }

    if (user_role === 'user' && user_email) {
      query += ` AND (LOWER(t.created_by_email) = LOWER(?) OR LOWER(t.created_by_name) IN (SELECT LOWER(name) FROM users WHERE LOWER(email) = LOWER(?)))`;
      params.push(user_email, user_email);
    } else if (user_role === 'technician' && user_email) {
      query += ` AND (LOWER(t.created_by_email) = LOWER(?) OR t.assigned_technician_id = (SELECT id FROM technicians WHERE LOWER(email) = LOWER(?)))`;
      params.push(user_email, user_email);
    }

    if (startDate) {
      query += ` AND t.created_at >= ?`;
      params.push(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query += ` AND t.created_at <= ?`;
      params.push(`${endDate}T23:59:59.999Z`);
    }
    if (status && status !== 'all') {
      query += ` AND t.status = ?`;
      params.push(status);
    }
    if (priority && priority !== 'all') {
      query += ` AND t.priority = ?`;
      params.push(priority);
    }
    if (technician_id && technician_id !== 'all') {
      query += ` AND t.assigned_technician_id = ?`;
      params.push(Number(technician_id));
    }
    if (category_id && category_id !== 'all') {
      query += ` AND t.category_id = ?`;
      params.push(Number(category_id));
    }
    if (search) {
      query += ` AND (t.ticket_number LIKE ? OR t.title LIKE ? OR t.created_by_name LIKE ? OR t.description LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY t.id DESC`;

    const tickets = db.prepare(query).all(...params);
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET /api/tickets/:id - Single Ticket Details with Remarks, Attachments & Merged Tickets
app.get('/api/tickets/:id', (req, res) => {
  try {
    const ticketId = Number(req.params.id);

    const ticket = db.prepare(`
      SELECT t.*, 
        c.name as category_name,
        tech.name as technician_name,
        tech.email as technician_email,
        tech.designation as technician_designation,
        tech.department_wing as technician_wing,
        master_t.ticket_number as merged_into_ticket_number,
        master_t.title as merged_into_ticket_title,
        (SELECT GROUP_CONCAT(ticket_number, ', ') FROM tickets mt WHERE mt.merged_into_ticket_id = t.id) as merged_ticket_numbers,
        (SELECT COUNT(*) FROM tickets mt WHERE mt.merged_into_ticket_id = t.id) as merged_tickets_count
      FROM tickets t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN technicians tech ON t.assigned_technician_id = tech.id
      LEFT JOIN tickets master_t ON t.merged_into_ticket_id = master_t.id
      WHERE t.id = ?
    `).get(ticketId);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const remarks = db.prepare(`
      SELECT * FROM ticket_remarks WHERE ticket_id = ? ORDER BY id ASC
    `).all(ticketId);

    const attachments = db.prepare(`
      SELECT * FROM ticket_attachments WHERE ticket_id = ? ORDER BY id ASC
    `).all(ticketId);

    // Fetch tickets that have been merged into this primary ticket
    const mergedTickets = db.prepare(`
      SELECT t.*, 
        c.name as category_name,
        tech.name as technician_name
      FROM tickets t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN technicians tech ON t.assigned_technician_id = tech.id
      WHERE t.merged_into_ticket_id = ?
      ORDER BY t.id ASC
    `).all(ticketId);

    const mergedTicketsWithDetails = mergedTickets.map(mt => {
      const mtRemarks = db.prepare('SELECT * FROM ticket_remarks WHERE ticket_id = ? ORDER BY id ASC').all(mt.id);
      const mtAttachments = db.prepare('SELECT * FROM ticket_attachments WHERE ticket_id = ? ORDER BY id ASC').all(mt.id);
      return {
        ...mt,
        remarks: mtRemarks,
        attachments: mtAttachments
      };
    });

    res.json({
      ...ticket,
      remarks,
      attachments,
      mergedTickets: mergedTicketsWithDetails
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/:id/merge - Merge another ticket into this primary ticket
app.post('/api/tickets/:id/merge', (req, res) => {
  try {
    const primaryTicketId = Number(req.params.id);
    const { targetTicketId, merged_by_name } = req.body;

    if (!targetTicketId) {
      return res.status(400).json({ error: 'Target ticket ID to merge is required' });
    }

    const primaryTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(primaryTicketId);
    const targetTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(Number(targetTicketId));

    if (!primaryTicket || !targetTicket) {
      return res.status(404).json({ error: 'Primary or Target ticket not found' });
    }

    if (primaryTicketId === Number(targetTicketId)) {
      return res.status(400).json({ error: 'Cannot merge a ticket into itself' });
    }

    const now = new Date().toISOString();

    // Update target ticket to be merged into primary ticket and set status to 'Merged'
    db.prepare(`
      UPDATE tickets 
      SET merged_into_ticket_id = ?, status = 'Merged', closed_at = ? 
      WHERE id = ?
    `).run(primaryTicketId, now, Number(targetTicketId));

    // Add remark on Primary Ticket
    db.prepare(`
      INSERT INTO ticket_remarks (ticket_id, user_name, user_role, remark_text, created_at) 
      VALUES (?, ?, ?, ?, ?)
    `).run(
      primaryTicketId,
      merged_by_name || 'System Operator',
      'System Operator',
      `🔗 Merged Ticket #${targetTicket.ticket_number} ('${targetTicket.title}') into this ticket.`,
      now
    );

    // Add remark on Target Ticket
    db.prepare(`
      INSERT INTO ticket_remarks (ticket_id, user_name, user_role, remark_text, created_at) 
      VALUES (?, ?, ?, ?, ?)
    `).run(
      Number(targetTicketId),
      merged_by_name || 'System Operator',
      'System Operator',
      `🔗 Ticket #${targetTicket.ticket_number} was merged into Ticket #${primaryTicket.ticket_number}.`,
      now
    );

    res.json({ 
      message: `Ticket #${targetTicket.ticket_number} merged into Ticket #${primaryTicket.ticket_number} successfully!`,
      primaryTicketId,
      targetTicketId: Number(targetTicketId)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. POST /api/tickets - Create New Ticket (Multi-format File Upload Support)
app.post('/api/tickets', upload.array('attachments', 10), (req, res) => {
  try {
    const { title, description, category_id, priority, created_by_name, created_by_email, assigned_technician_id } = req.body;

    const now = new Date().toISOString();

    // Auto Generate Ticket Number starting from 00001
    const countRow = db.prepare('SELECT COUNT(*) as count FROM tickets').get();
    const ticket_number = String(countRow.count + 1).padStart(5, '0');

    let initialStatus = 'New';
    let assigned_at = null;
    if (assigned_technician_id && String(assigned_technician_id) !== '0') {
      initialStatus = 'Assigned';
      assigned_at = now;
    }

    const due_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      INSERT INTO tickets (ticket_number, title, description, category_id, priority, status, created_by_name, created_by_email, assigned_technician_id, created_at, assigned_at, due_at, sla_warning_sent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      ticket_number,
      title,
      description || '',
      category_id ? Number(category_id) : 1,
      priority || 'Medium',
      initialStatus,
      created_by_name || 'नगर योजना विभाग कर्मचारी',
      created_by_email || 'staff@townplanning.gov.in',
      assigned_technician_id ? Number(assigned_technician_id) : null,
      now,
      assigned_at,
      due_at,
      0
    );

    const ticketId = Number(result.lastInsertRowid);

    // Fetch Category Name for Email Notification
    const catRow = db.prepare('SELECT name FROM categories WHERE id = ?').get(category_id ? Number(category_id) : 1);
    const category_name = catRow ? catRow.name : 'General';

    // Dispatch Confirmation Email to Ticket Creator
    sendTicketCreatedEmail({
      ticket_number,
      title,
      category_name,
      priority: priority || 'Medium',
      status: initialStatus,
      created_by_name: created_by_name || 'नगर योजना विभाग कर्मचारी',
      created_by_email: created_by_email || 'staff@townplanning.gov.in',
      due_at
    });

    // If Technician Assigned, Dispatch Email to Technician
    if (assigned_technician_id) {
      const techRow = db.prepare('SELECT name, email FROM technicians WHERE id = ?').get(Number(assigned_technician_id));
      if (techRow) {
        sendTicketAssignedEmail({
          ticket_number,
          title,
          created_by_name: created_by_name || 'आवेदक',
          created_by_email: created_by_email || 'staff@townplanning.gov.in',
          priority: priority || 'Medium',
          due_at
        }, techRow);
      }
    }

    // Initial Creation Remark
    const remarkStmt = db.prepare('INSERT INTO ticket_remarks (ticket_id, user_name, user_role, remark_text, created_at) VALUES (?, ?, ?, ?, ?)');
    remarkStmt.run(ticketId, created_by_name || 'आवेदक', 'Creator', 'टिकट सफलतापूर्व दर्ज किया गया।', now);

    // Save File Attachments
    const attachStmt = db.prepare(`
      INSERT INTO ticket_attachments (ticket_id, original_name, file_name, file_path, file_type, file_size, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachStmt.run(
          ticketId,
          file.originalname,
          file.filename,
          `/uploads/${file.filename}`,
          file.mimetype,
          file.size,
          now
        );
      });
    }

    // Save Pasted / Embedded Images as Ticket Attachments
    if (req.body.pasted_images) {
      try {
        const pastedArr = JSON.parse(req.body.pasted_images);
        if (Array.isArray(pastedArr) && pastedArr.length > 0) {
          pastedArr.forEach(img => {
            if (img && img.filename) {
              attachStmt.run(
                ticketId,
                img.originalName || img.filename || 'pasted-image.png',
                img.filename,
                img.url || `/uploads/${img.filename}`,
                'image/png',
                img.size || 0,
                now
              );
            }
          });
        }
      } catch (e) {
        console.error('Error saving pasted images:', e);
      }
    }

    res.status(201).json({
      id: ticketId,
      ticket_number,
      title,
      status: initialStatus,
      message: `टिकट ${ticket_number} सफलतापूर्वक दर्ज हुआ।`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. PUT /api/tickets/:id - Universal User / Admin Full Ticket Edit Endpoint
app.put('/api/tickets/:id', (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const { title, description, category_id, priority, status, assigned_technician_id, updated_by_name } = req.body;

    const currentTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!currentTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const now = new Date().toISOString();
    let assigned_at = currentTicket.assigned_at;
    let resolved_at = currentTicket.resolved_at;
    let closed_at = currentTicket.closed_at;
    let reopened_at = currentTicket.reopened_at;

    if (assigned_technician_id && Number(assigned_technician_id) !== currentTicket.assigned_technician_id) {
      assigned_at = now;
    }

    const isReopening = (currentTicket.status === 'Resolved' || currentTicket.status === 'Closed') && 
                        (status && status !== 'Resolved' && status !== 'Closed');

    if (status === 'Resolved') {
      resolved_at = now;
    } else if (status === 'Closed') {
      closed_at = now;
      if (!resolved_at) resolved_at = now;
    } else if (isReopening) {
      reopened_at = now;
      resolved_at = null;
      closed_at = null;
    }

    const stmt = db.prepare(`
      UPDATE tickets 
      SET 
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        category_id = COALESCE(?, category_id),
        priority = COALESCE(?, priority),
        status = COALESCE(?, status),
        assigned_technician_id = ?,
        assigned_at = ?,
        resolved_at = ?,
        closed_at = ?,
        reopened_at = ?
      WHERE id = ?
    `);

    stmt.run(
      title !== undefined ? title : currentTicket.title,
      description !== undefined ? description : currentTicket.description,
      category_id ? Number(category_id) : currentTicket.category_id,
      priority !== undefined ? priority : currentTicket.priority,
      status !== undefined ? status : currentTicket.status,
      assigned_technician_id !== undefined ? (assigned_technician_id ? Number(assigned_technician_id) : null) : currentTicket.assigned_technician_id,
      assigned_at,
      resolved_at,
      closed_at,
      reopened_at,
      ticketId
    );

    // Track detailed changes in ticket remarks
    const changes = [];
    if (title && title !== currentTicket.title) changes.push(`Title updated`);
    if (category_id && Number(category_id) !== currentTicket.category_id) {
      const catRow = db.prepare('SELECT name FROM categories WHERE id = ?').get(Number(category_id));
      changes.push(`Category updated to '${catRow ? catRow.name : category_id}'`);
    }
    if (priority && priority !== currentTicket.priority) changes.push(`Priority changed from '${currentTicket.priority}' to '${priority}'`);
    if (status && status !== currentTicket.status) changes.push(`Status changed from '${currentTicket.status}' to '${status}'`);
    if (assigned_technician_id !== undefined && Number(assigned_technician_id) !== currentTicket.assigned_technician_id) {
      if (assigned_technician_id) {
        const techRow = db.prepare('SELECT name FROM technicians WHERE id = ?').get(Number(assigned_technician_id));
        changes.push(`Assigned agent updated to '${techRow ? techRow.name : assigned_technician_id}'`);
      } else {
        changes.push(`Assigned agent unassigned`);
      }
    }

    if (changes.length > 0) {
      const remarkStmt = db.prepare('INSERT INTO ticket_remarks (ticket_id, user_name, user_role, remark_text, created_at) VALUES (?, ?, ?, ?, ?)');
      remarkStmt.run(ticketId, updated_by_name || 'Universal Operator', 'Universal Operator', `🌐 Ticket Details Updated: ${changes.join(', ')}`, now);
    }

    const updatedTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    res.json({ message: 'Ticket details updated successfully', ticket: updatedTicket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6b. PUT /api/tickets/:id/status - Update Ticket Status & Assign Technician
app.put('/api/tickets/:id/status', (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const { status, assigned_technician_id, remark, updated_by_name } = req.body;

    const currentTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!currentTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const now = new Date().toISOString();
    let assigned_at = currentTicket.assigned_at;
    let resolved_at = currentTicket.resolved_at;
    let closed_at = currentTicket.closed_at;
    let reopened_at = currentTicket.reopened_at;

    if (assigned_technician_id && Number(assigned_technician_id) !== currentTicket.assigned_technician_id) {
      assigned_at = now;
    }

    const isReopening = (currentTicket.status === 'Resolved' || currentTicket.status === 'Closed') && 
                        (status && status !== 'Resolved' && status !== 'Closed');

    if (status === 'Resolved') {
      resolved_at = now;
    } else if (status === 'Closed') {
      closed_at = now;
      if (!resolved_at) resolved_at = now;
    } else if (isReopening) {
      reopened_at = now;
      resolved_at = null;
      closed_at = null;
    }

    const stmt = db.prepare(`
      UPDATE tickets 
      SET status = ?, assigned_technician_id = ?, assigned_at = ?, resolved_at = ?, closed_at = ?, reopened_at = ?
      WHERE id = ?
    `);

    stmt.run(
      status || currentTicket.status,
      assigned_technician_id ? Number(assigned_technician_id) : currentTicket.assigned_technician_id,
      assigned_at,
      resolved_at,
      closed_at,
      reopened_at,
      ticketId
    );

    // Add Status Update Remark to Ticket History
    let remarkText = remark;
    if (!remark || remark.includes('Quick Action')) {
      if (status && status !== currentTicket.status) {
        remarkText = `Status changed from '${currentTicket.status}' to '${status}'`;
      } else {
        remarkText = `Status updated to '${status}'`;
      }
    }
    const remarkStmt = db.prepare('INSERT INTO ticket_remarks (ticket_id, user_name, user_role, remark_text, created_at) VALUES (?, ?, ?, ?, ?)');
    remarkStmt.run(ticketId, updated_by_name || 'Officer', 'Officer', remarkText, now);

    const updatedTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);

    // If Technician newly assigned, send assignment email to tech
    if (assigned_technician_id && Number(assigned_technician_id) !== currentTicket.assigned_technician_id) {
      const techRow = db.prepare('SELECT name, email FROM technicians WHERE id = ?').get(Number(assigned_technician_id));
      if (techRow) {
        sendTicketAssignedEmail(updatedTicket, techRow);
      }
    }

    // Dispatch Action Update Email to Ticket Creator (User)
    sendTicketActionUpdateEmail(
      updatedTicket, 
      `Status changed to '${status || currentTicket.status}'`, 
      remarkText, 
      updated_by_name || 'Technician'
    );

    res.json({ message: 'स्टेटस अद्यतन किया गया', status, closed_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. POST /api/tickets/:id/remarks - Add Remark & Attachments
app.post('/api/tickets/:id/remarks', upload.array('attachments', 10), (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const { user_name, user_role, remark_text } = req.body;
    const now = new Date().toISOString();

    let finalRemark = remark_text || '';
    let uploadedFilesInfo = [];

    if (req.files && req.files.length > 0) {
      const attachStmt = db.prepare(`
        INSERT INTO ticket_attachments (ticket_id, original_name, file_name, file_path, file_type, file_size, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      req.files.forEach(file => {
        attachStmt.run(
          ticketId,
          file.originalname,
          file.filename,
          `/uploads/${file.filename}`,
          file.mimetype,
          file.size,
          now
        );
        uploadedFilesInfo.push(file.originalname);
      });

      const attachNotice = `📎 Attached file(s): ${uploadedFilesInfo.join(', ')}`;
      finalRemark = finalRemark ? `${finalRemark}\n${attachNotice}` : attachNotice;
    }

    const stmt = db.prepare('INSERT INTO ticket_remarks (ticket_id, user_name, user_role, remark_text, created_at) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(ticketId, user_name || 'Officer', user_role || 'Staff', finalRemark, now);

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (ticket) {
      sendTicketActionUpdateEmail(
        ticket,
        'Technician Remark / Attachment Added',
        finalRemark,
        user_name || 'Technician'
      );
    }

    res.status(201).json({ id: Number(result.lastInsertRowid), ticket_id: ticketId, remark_text: finalRemark, created_at: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/activity-notifications - All recent ticket activity logs & remarks
app.get('/api/activity-notifications', (req, res) => {
  try {
    const activities = db.prepare(`
      SELECT 
        r.id,
        r.ticket_id,
        r.user_name,
        r.user_role,
        r.remark_text,
        r.created_at,
        t.ticket_number,
        t.title as ticket_title,
        t.status as ticket_status,
        t.created_by_email as ticket_created_by_email,
        t.created_by_name as ticket_created_by_name,
        COALESCE(tech.email, '') as technician_email
      FROM ticket_remarks r
      JOIN tickets t ON r.ticket_id = t.id
      LEFT JOIN technicians tech ON t.assigned_technician_id = tech.id
      ORDER BY r.id DESC
      LIMIT 100
    `).all();

    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. GET /api/reports/export - Filtered CSV Export Data (Supports 7 Specialized Report Types)
app.get('/api/reports/export', (req, res) => {
  try {
    const { reportType = 'summary', startDate, endDate, category_id, status, priority, technician_id, sla_status, user_email, user_role, custom_cols } = req.query;

    let baseFilter = ' WHERE 1=1';
    const params = [];

    if (user_role === 'user' && user_email) {
      baseFilter += ` AND (LOWER(t.created_by_email) = LOWER(?) OR LOWER(t.created_by_name) IN (SELECT LOWER(name) FROM users WHERE LOWER(email) = LOWER(?)))`;
      params.push(user_email, user_email);
    } else if (user_role === 'technician' && user_email) {
      baseFilter += ` AND (LOWER(t.created_by_email) = LOWER(?) OR t.assigned_technician_id = (SELECT id FROM technicians WHERE LOWER(email) = LOWER(?)))`;
      params.push(user_email, user_email);
    }

    if (startDate) {
      baseFilter += ` AND t.created_at >= ?`;
      params.push(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      baseFilter += ` AND t.created_at <= ?`;
      params.push(`${endDate}T23:59:59.999Z`);
    }
    if (category_id && category_id !== 'all') {
      baseFilter += ` AND t.category_id = ?`;
      params.push(Number(category_id));
    }
    if (status && status !== 'all') {
      baseFilter += ` AND t.status = ?`;
      params.push(status);
    }
    if (priority && priority !== 'all') {
      baseFilter += ` AND t.priority = ?`;
      params.push(priority);
    }
    if (technician_id && technician_id !== 'all') {
      baseFilter += ` AND t.assigned_technician_id = ?`;
      params.push(Number(technician_id));
    }

    let csvContent = '';
    let filename = `Town_Planning_${reportType}_${Date.now()}.csv`;

    if (reportType === 'tickets_per_day') {
      // Daily Intake and Resolution Breakdown Report
      const query = `
        SELECT 
          SUBSTR(t.created_at, 1, 10) as "Date",
          COUNT(t.id) as "Total Raised",
          SUM(CASE WHEN t.status = 'Closed' THEN 1 ELSE 0 END) as "Total Resolved",
          SUM(CASE WHEN t.status != 'Closed' THEN 1 ELSE 0 END) as "Net Pending",
          SUM(CASE WHEN t.priority = 'Critical' THEN 1 ELSE 0 END) as "Critical Issues",
          SUM(CASE WHEN t.priority = 'High' THEN 1 ELSE 0 END) as "High Priority"
        FROM tickets t
        ${baseFilter}
        GROUP BY SUBSTR(t.created_at, 1, 10)
        ORDER BY "Date" DESC
      `;
      const rows = db.prepare(query).all(...params);
      if (rows.length === 0) return res.status(404).send('No data found for Daily Tickets report.');
      const headers = Object.keys(rows[0]).join(',');
      const csvRows = rows.map(r => Object.values(r).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
      csvContent = '\uFEFF' + [headers, ...csvRows].join('\n');
      filename = `Daily_Ticket_Volume_Report_${Date.now()}.csv`;

    } else if (reportType === 'technician_stats') {
      // Specialist Performance and Caseload Report
      const query = `
        SELECT 
          tech.name as "Technician Name",
          tech.email as "Email",
          tech.designation as "Designation",
          tech.contact_number as "Phone",
          COUNT(t.id) as "Total Assigned",
          SUM(CASE WHEN t.status = 'Closed' THEN 1 ELSE 0 END) as "Resolved Cases",
          SUM(CASE WHEN t.status != 'Closed' AND t.id IS NOT NULL THEN 1 ELSE 0 END) as "Pending Cases",
          CASE WHEN COUNT(t.id) > 0 
            THEN ROUND((CAST(SUM(CASE WHEN t.status = 'Closed' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(t.id)) * 100, 1) || '%'
            ELSE '0%' END as "Resolution Rate"
        FROM technicians tech
        LEFT JOIN tickets t ON t.assigned_technician_id = tech.id ${startDate || endDate || priority || category_id ? baseFilter.replace(' WHERE 1=1 AND', ' AND') : ''}
        GROUP BY tech.id
        ORDER BY "Total Assigned" DESC
      `;
      const rows = db.prepare(query).all(...params);
      if (rows.length === 0) return res.status(404).send('No data found for Technician Performance report.');
      const headers = Object.keys(rows[0]).join(',');
      const csvRows = rows.map(r => Object.values(r).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
      csvContent = '\uFEFF' + [headers, ...csvRows].join('\n');
      filename = `Technician_Performance_Report_${Date.now()}.csv`;

    } else if (reportType === 'response_speed') {
      // SLA Response and Compliance Audit Report
      const query = `
        SELECT 
          t.ticket_number as "Ticket No",
          t.title as "Subject",
          c.name as "Category",
          t.priority as "Priority",
          t.status as "Status",
          COALESCE(tech.name, 'Unassigned') as "Assigned Agent",
          t.created_at as "Created At",
          t.due_at as "SLA Due At",
          CASE 
            WHEN t.status = 'Closed' AND t.closed_at <= t.due_at THEN 'Within SLA (Met)'
            WHEN t.status = 'Closed' AND t.closed_at > t.due_at THEN 'Breached SLA (Delayed Resolution)'
            WHEN t.status != 'Closed' AND datetime('now') > datetime(t.due_at) THEN 'Breached (Overdue)'
            ELSE 'In SLA Target'
          END as "SLA Compliance Status",
          t.closed_at as "Resolved At"
        FROM tickets t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN technicians tech ON t.assigned_technician_id = tech.id
        ${baseFilter}
        ORDER BY t.id DESC
      `;
      const rows = db.prepare(query).all(...params);
      if (rows.length === 0) return res.status(404).send('No data found for SLA Compliance report.');
      const headers = Object.keys(rows[0]).join(',');
      const csvRows = rows.map(r => Object.values(r).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
      csvContent = '\uFEFF' + [headers, ...csvRows].join('\n');
      filename = `SLA_Response_Compliance_Report_${Date.now()}.csv`;

    } else if (reportType === 'companies_stats') {
      // Department and Category Breakdown Report
      const query = `
        SELECT 
          c.name as "Department Category",
          COUNT(t.id) as "Total Grievances",
          SUM(CASE WHEN t.status = 'Closed' THEN 1 ELSE 0 END) as "Resolved",
          SUM(CASE WHEN t.status != 'Closed' AND t.id IS NOT NULL THEN 1 ELSE 0 END) as "Active / Pending",
          SUM(CASE WHEN t.priority = 'Critical' THEN 1 ELSE 0 END) as "Critical Issues",
          CASE WHEN COUNT(t.id) > 0 
            THEN ROUND((CAST(SUM(CASE WHEN t.status = 'Closed' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(t.id)) * 100, 1) || '%'
            ELSE '0%' END as "Clearance Rate"
        FROM categories c
        LEFT JOIN tickets t ON t.category_id = c.id ${startDate || endDate || priority || status ? baseFilter.replace(' WHERE 1=1 AND', ' AND') : ''}
        GROUP BY c.id
        ORDER BY "Total Grievances" DESC
      `;
      const rows = db.prepare(query).all(...params);
      if (rows.length === 0) return res.status(404).send('No data found for Department Categories report.');
      const headers = Object.keys(rows[0]).join(',');
      const csvRows = rows.map(r => Object.values(r).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
      csvContent = '\uFEFF' + [headers, ...csvRows].join('\n');
      filename = `Department_Category_Breakdown_${Date.now()}.csv`;

    } else if (reportType === 'due_dates') {
      // Due Dates and Deadlines Schedule Report
      const query = `
        SELECT 
          t.ticket_number as "Ticket No",
          t.title as "Subject",
          c.name as "Category",
          t.priority as "Priority",
          t.status as "Status",
          COALESCE(tech.name, 'Unassigned') as "Assigned Specialist",
          t.created_at as "Created Date",
          t.due_at as "Resolution Deadline",
          CASE 
            WHEN t.status != 'Closed' AND datetime('now') > datetime(t.due_at) THEN 'OVERDUE'
            WHEN t.status != 'Closed' THEN 'PENDING (On Schedule)'
            ELSE 'RESOLVED'
          END as "Deadline Status"
        FROM tickets t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN technicians tech ON t.assigned_technician_id = tech.id
        ${baseFilter}
        ORDER BY t.due_at ASC
      `;
      const rows = db.prepare(query).all(...params);
      if (rows.length === 0) return res.status(404).send('No data found for Due Dates Schedule report.');
      const headers = Object.keys(rows[0]).join(',');
      const csvRows = rows.map(r => Object.values(r).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
      csvContent = '\uFEFF' + [headers, ...csvRows].join('\n');
      filename = `Due_Dates_Deadlines_Report_${Date.now()}.csv`;

    } else {
      // Summary / Custom Reports Default Query
      let query = `
        SELECT 
          t.ticket_number as "Ticket No",
          t.title as "Title",
          c.name as "Category",
          t.priority as "Priority",
          t.status as "Status",
          t.created_by_name as "Created By",
          t.created_by_email as "Creator Email",
          COALESCE(tech.name, 'Unassigned') as "Assigned Technician",
          COALESCE(tech.email, '-') as "Technician Email",
          t.created_at as "Created Date",
          t.due_at as "SLA Due Date",
          t.assigned_at as "Assigned Date",
          t.closed_at as "Closed Date"
        FROM tickets t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN technicians tech ON t.assigned_technician_id = tech.id
        ${baseFilter}
        ORDER BY t.id DESC
      `;

      const rows = db.prepare(query).all(...params);
      if (rows.length === 0) {
        return res.status(404).send('No tickets match the selected date range and filter criteria.');
      }

      const headers = Object.keys(rows[0]).join(',');
      const csvRows = rows.map(row => {
        return Object.values(row).map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',');
      });

      csvContent = '\uFEFF' + [headers, ...csvRows].join('\n');
      filename = `Town_Planning_${reportType === 'custom_reports' ? 'Custom_Matrix' : 'Summary_Master'}_Report_${Date.now()}.csv`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. GET /api/reports/analytics - Summary metrics & charts data
app.get('/api/reports/analytics', (req, res) => {
  try {
    const totalTickets = db.prepare('SELECT COUNT(*) as count FROM tickets').get().count;
    const openTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'New' OR status = 'Assigned' OR status = 'In Progress'").get().count;
    const closedTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Closed'").get().count;

    const ticketsPerCategory = db.prepare(`
      SELECT c.name as category_name, COUNT(t.id) as ticket_count 
      FROM categories c 
      LEFT JOIN tickets t ON t.category_id = c.id 
      GROUP BY c.id ORDER BY ticket_count DESC
    `).all();

    const techStats = db.prepare(`
      SELECT t.id, t.name, t.email, 
        COUNT(k.id) as total_assigned,
        SUM(CASE WHEN k.status = 'Closed' THEN 1 ELSE 0 END) as closed_count,
        SUM(CASE WHEN k.status != 'Closed' AND k.status IS NOT NULL THEN 1 ELSE 0 END) as pending_count
      FROM technicians t
      LEFT JOIN tickets k ON k.assigned_technician_id = t.id
      GROUP BY t.id
    `).all();

    res.json({
      totalTickets,
      openTickets,
      closedTickets,
      ticketsPerCategory,
      techStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SLA Breach Warning Background Interval Worker (checks every 30 seconds)
setInterval(() => {
  try {
    const now = new Date();
    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();

    const warningTickets = db.prepare(`
      SELECT t.*, tech.name as tech_name, tech.email as tech_email
      FROM tickets t
      LEFT JOIN technicians tech ON t.assigned_technician_id = tech.id
      WHERE t.status != 'Closed' AND t.sla_warning_sent = 0 AND t.due_at <= ?
    `).all(fourHoursFromNow);

    warningTickets.forEach(ticket => {
      console.log(`[SLA MONITOR] SLA Warning triggered for Ticket #${ticket.ticket_number} (Due: ${ticket.due_at})`);
      const tech = ticket.tech_email ? { name: ticket.tech_name, email: ticket.tech_email } : null;
      sendSLABreachWarningEmail(ticket, tech);

      db.prepare('UPDATE tickets SET sla_warning_sent = 1 WHERE id = ?').run(ticket.id);
    });
  } catch (err) {
    console.error('SLA Monitor Interval Error:', err.message);
  }
}, 30000);

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Town Planning Ticket Tool Server running at http://localhost:${PORT} and on network interface`);
});
