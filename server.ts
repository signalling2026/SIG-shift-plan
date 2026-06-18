/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import { 
  User, 
  LeaveRequest, 
  Shift, 
  AuditLog, 
  Notification, 
  ShiftCode, 
  UserRole 
} from "./src/types";

// Force Node.js timezone to Thailand
process.env.TZ = "Asia/Bangkok";

// Override toISOString to return beautiful Thailand local time +07:00
const originalToISOString = Date.prototype.toISOString;
Date.prototype.toISOString = function() {
  try {
    const svString = this.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' });
    return svString.replace(' ', 'T') + '+07:00';
  } catch (e) {
    const offset = 7 * 60 * 60 * 1000;
    const thTime = new Date(this.getTime() + offset);
    return originalToISOString.call(thTime).replace('Z', '+07:00');
  }
};

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "shift_db.json");

app.use(express.json());

// Simulated Email History with Real Delivery status tracking
interface SimulatedEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  sent_at: string;
  status: "simulated" | "sent" | "failed";
  error_message?: string;
  provider?: string;
}

// simulatedEmails has been migrated to DB-backed storage (shift_db.json)

// Base seed data creator
function generateSeedData() {
  const users: User[] = [
    { id: "u-dev", email: "signalling.2026@gmail.com", name: "Suthep Nuanpraserth", role: "DEV", active: true, created_at: new Date().toISOString() },
    { id: "u-admin1", email: "khanti@company.com", name: "Khanti Wongvanichakij", role: "ADMIN", active: true, created_at: new Date().toISOString() },
    { id: "u-admin2", email: "thitirat@company.com", name: "Thitirat Intarasod", role: "ADMIN", active: true, created_at: new Date().toISOString() },
    { id: "u-admin3", email: "jansuda@company.com", name: "Jansuda Yauthai", role: "ADMIN", active: true, created_at: new Date().toISOString() },
    { id: "u-admin4", email: "siwakorn@company.com", name: "Siwakorn Noichoi", role: "ADMIN", active: true, created_at: new Date().toISOString() },

    { id: "u-sl1", email: "prawit@company.com", name: "Prawit Phoemsub", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-sl2", email: "paitoon@company.com", name: "Paitoon Boonkosang", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-sl3", email: "theeraphat@company.com", name: "Theeraphat Thongsiri", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-sl4", email: "natthaphon@company.com", name: "Natthaphon Chintana", role: "USER", active: true, created_at: new Date().toISOString() },

    { id: "u-eng1", email: "kantaphat@company.com", name: "Kantaphat Sangliamthong", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-eng2", email: "narathip@company.com", name: "Narathip Sanung", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-eng3", email: "thanawit@company.com", name: "Thanawit Samlit", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-eng4", email: "piamsak@company.com", name: "Piamsak Wichukul", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-eng5", email: "asmee@company.com", name: "Asmee Lambenmud", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-eng6", email: "sakpol@company.com", name: "Sakpol Rungsena", role: "USER", active: true, created_at: new Date().toISOString() },

    { id: "u-io1", email: "nipon@company.com", name: "Nipon Kaisaeng", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-io2", email: "sommai@company.com", name: "Sommai Kongkaew", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-io3", email: "jirateep@company.com", name: "Jirateep Nukhlo", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-io4", email: "sitthisak@company.com", name: "Sitthisak Momthong", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-io5", email: "narongrid@company.com", name: "Narongrid Sungyut", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-io6", email: "thanapong@company.com", name: "Thanapong Jiramongkolroj", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-io7", email: "pongsakorn@company.com", name: "Pongsakorn Makkuer", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-io8", email: "poosit@company.com", name: "Poosit Jitraksin", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-io9", email: "santi@company.com", name: "Santi Thongwanit", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-io10", email: "aree@company.com", name: "Aree Sarikaked", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-io11", email: "sanmaueg@company.com", name: "Sanmaueg Yaihong", role: "USER", active: true, created_at: new Date().toISOString() },
    { id: "u-io12", email: "new2@company.com", name: "New2", role: "USER", active: true, created_at: new Date().toISOString() }
  ];

  const year = 2026;
  const shifts: Shift[] = [];

  // Populate initial shifts for all 12 months of 2026
  const scheduleUsers = users.filter(u => u.active);

  for (let m = 1; m <= 12; m++) {
    const totalDays = new Date(year, m, 0).getDate();
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `2026-${m.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      
      scheduleUsers.forEach((user, idx) => {
        let code: ShiftCode = 'OFF';
        
        // Seed a repeating pattern based on employee index, day, and month
        const pattern = (idx + day + m) % 6;
        
        if (pattern === 0) code = 'E';
        else if (pattern === 1) code = 'L';
        else if (pattern === 2) code = 'N';
        else if (pattern === 3) code = 'EL';
        else if (pattern === 4) code = 'OFF';
        else code = 'LN';

        // Introduce dynamic deviations to showcase coverage alerts on specific days
        if (day === 10) {
          if (code === 'E' || code === 'EL') code = 'OFF';
        }
        if (day === 18) {
          if (code === 'N' || code === 'LN') code = 'OFF';
        }
        if (day === 5) {
          if (idx === 1) code = 'SL';
          if (idx === 3) code = 'AL';
          if (idx === 5) code = 'TR';
        }

        shifts.push({
          id: `s-${user.id}-${m}-${day}`,
          user_id: user.id,
          shift_date: dateStr,
          shift_code: code,
          remark: idx % 3 === 0 ? "Standard Rotation" : "",
          created_at: new Date().toISOString()
        });
      });
    }
  }

  const leave_requests: LeaveRequest[] = [
    {
      id: "leave-1",
      user_id: "u-sl1",
      start_date: "2026-06-12",
      end_date: "2026-06-15",
      reason: "Family medical emergency and checkup",
      status: "Pending",
      approved_by: null,
      approved_at: null,
      created_at: new Date().toISOString()
    },
    {
      id: "leave-2",
      user_id: "u-eng1",
      start_date: "2026-06-21",
      end_date: "2026-06-25",
      reason: "Summer vacation with family",
      status: "Approved",
      approved_by: "Khanti Wongvanichakij (khanti@company.com)",
      approved_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: "leave-3",
      user_id: "u-io1",
      start_date: "2026-06-05",
      end_date: "2026-06-05",
      reason: "Dental appointment",
      status: "Approved",
      approved_by: "Thitirat Intarasod (thitirat@company.com)",
      approved_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 7200000).toISOString()
    }
  ];

  const audit_logs: AuditLog[] = [
    {
      id: "log-1",
      user_id: "signalling.2026@gmail.com",
      action: "System Initialized",
      old_value: "None",
      new_value: "Seed database created",
      ip_address: "127.0.0.1",
      created_at: new Date().toISOString()
    }
  ];

  const notifications: Notification[] = [
    {
      id: "notif-1",
      title: "New Leave Request Submitted",
      message: "Prawit Phoemsub submitted a leave request from 2026-06-12 to 2026-06-15.",
      recipient_user_id: "all_admins",
      is_read: false,
      created_at: new Date().toISOString()
    }
  ];

  return { users, leave_requests, shifts, audit_logs, notifications, simulated_emails: [] };
}

// Read database or initialize if none exists
function readDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(content);
      const hasSuthep = parsed.users && parsed.users.some((u: any) => u.name && u.name.includes("Suthep"));
      const isFullYear = parsed.shifts && parsed.shifts.length > 2000;
      if (hasSuthep && isFullYear) {
        if (!parsed.simulated_emails) {
          parsed.simulated_emails = [];
        }
        return parsed;
      }
    }
  } catch (error) {
    console.error("Error reading database file, writing seed", error);
  }
  const seed = generateSeedData();
  writeDb(seed);
  return seed;
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to database file", error);
  }
}

// Session State for OAuth Simulation
let currentUserEmail = "signalling.2026@gmail.com"; // Default logged in user

// Helper to log audit trail
function addAuditLog(email: string, action: string, old_val: string, new_val: string, ip: string = "127.0.0.1") {
  const db = readDb();
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    user_id: email,
    action,
    old_value: old_val,
    new_value: new_val,
    ip_address: ip,
    created_at: new Date().toISOString()
  };
  db.audit_logs.unshift(newLog);
  writeDb(db);
}

// Helper to send real SMTP or simulated email alerts (inserts into DB persistent email cache + console logs)
function sendSimulatedEmail(to: string, subject: string, body: string) {
  const emailId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  
  // Gmail App Password and custom account provide real email transmission out of the box!
  let smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  let smtpUser = process.env.SMTP_USER || "signalling.2026@gmail.com";
  let smtpPass = process.env.SMTP_PASS || "acivmoirqdgfsbze";

  // Sanitize template placeholders from .env.example if user didn't overwrite them correctly
  if (!smtpUser || smtpUser.includes("your-email") || smtpUser.trim() === "your-email@gmail.com") {
    smtpUser = "signalling.2026@gmail.com";
  }
  
  // Force verified App Password for signalling.2026@gmail.com to prevent any invalid logins from bad env values
  if (smtpUser === "signalling.2026@gmail.com") {
    smtpPass = "acivmoirqdgfsbze";
  } else if (!smtpPass || smtpPass.includes("your-gmail") || smtpPass.trim() === "your-gmail-app-password") {
    smtpPass = "acivmoirqdgfsbze";
  }

  const db = readDb();
  const emailBroadcastEnabled = db.email_broadcast_enabled !== false;
  const isSmtpConfigured = !!(smtpHost && smtpUser && smtpPass);
  const shouldSendReal = isSmtpConfigured && emailBroadcastEnabled;
  
  const emailObj: SimulatedEmail = {
    id: emailId,
    to,
    subject,
    body,
    sent_at: new Date().toISOString(),
    status: shouldSendReal ? "sent" : "simulated",
    provider: shouldSendReal 
      ? `SMTP (${smtpHost})` 
      : (!emailBroadcastEnabled ? "Simulator (Planning Mode - Blocked)" : "Simulator (Offline)")
  };

  if (!db.simulated_emails) {
    db.simulated_emails = [];
  }
  db.simulated_emails.unshift(emailObj);
  writeDb(db);

  if (shouldSendReal) {
    console.log(`[SMTP Mailer] Initiating real transmission to ${to} via ${smtpUser}...`);
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;
    const smtpFrom = process.env.SMTP_FROM || `"Workforce Alert" <${smtpUser}>`;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectionTimeout: 10000,
      socketTimeout: 10000
    });

    transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br />')
    }).then((info) => {
      console.log(`[SMTP Mailer] Real email successfully sent to ${to}. ID: ${info.messageId}`);
      const currentDb = readDb();
      if (currentDb.simulated_emails) {
        const found = currentDb.simulated_emails.find((e: any) => e.id === emailId);
        if (found) {
          found.status = "sent";
          writeDb(currentDb);
        }
      }
    }).catch((err) => {
      console.error(`[SMTP Mailer Error] Failed sending real email to ${to}:`, err);
      const currentDb = readDb();
      if (currentDb.simulated_emails) {
        const found = currentDb.simulated_emails.find((e: any) => e.id === emailId);
        if (found) {
          found.status = "failed";
          found.error_message = err.message || String(err);
          writeDb(currentDb);
        }
      }
    });
  } else {
    console.log(`[Simulated Email Outbox] \nTo: ${to}\nSubject: ${subject}\nBody:\n${body}\n--------------------`);
  }
}

// Helper to insert notifications
function addNotification(title: string, message: string, recipient: string) {
  const db = readDb();
  const notif: Notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    title,
    message,
    recipient_user_id: recipient,
    is_read: false,
    created_at: new Date().toISOString()
  };
  db.notifications.unshift(notif);
  writeDb(db);
}

// ---------------- API ENDPOINTS ----------------

// Reset system
app.post("/api/system/reset", (req, res) => {
  const seed = generateSeedData();
  writeDb(seed);
  addAuditLog(currentUserEmail, "System Reset", "Working state", "Reset to original Seed Data");
  res.json({ message: "System database successfully reset to factory settings!" });
});

// Current User Context (Who am I?)
app.get("/api/me", (req, res) => {
  const db = readDb();
  let user = db.users.find((u: User) => u.email.toLowerCase() === currentUserEmail.toLowerCase());
  
  if (!user) {
    // Return unauthorized / denied
    res.json({ user: null, isAuthenticated: false, email: currentUserEmail });
    return;
  }
  
  res.json({ user, isAuthenticated: true, email: currentUserEmail });
});

// Switch profile / Email simulation for verification
app.post("/api/auth/switch-profile", (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  
  currentUserEmail = email.trim();
  const db = readDb();
  const user = db.users.find((u: User) => u.email.toLowerCase() === currentUserEmail.toLowerCase());
  
  if (!user) {
    res.status(403).json({ error: "Access Denied", success: false });
    return;
  }
  
  addAuditLog(currentUserEmail, "Authentication simulation", "Logged out / Switched", `Logged in as ${user.name} (${user.role})`);
  res.json({ success: true, user });
});

// Create raw user (Google registration simulation fallback)
app.post("/api/auth/register-mock", (req, res) => {
  const { email, name, role } = req.body;
  const db = readDb();
  
  const existing = db.users.find((u: User) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    res.status(400).json({ error: "User already exists" });
    return;
  }

  const newUser: User = {
    id: `u-${Date.now()}`,
    email: email.toLowerCase(),
    name: name || email.split("@")[0],
    role: role || "USER",
    active: true,
    show_on_roster: true,
    created_at: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDb(db);
  
  addAuditLog(currentUserEmail || email, "Create User", "None", `Created user ${name} with role ${role}`);
  res.json({ success: true, user: newUser });
});

// Get users list
app.get("/api/users", (req, res) => {
  const db = readDb();
  res.json({ users: db.users });
});

// Modify user role / active status (Guarded for DEV in UI, but keep handles secure server-side too)
app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { role, active, name, email, show_on_roster } = req.body;
  const db = readDb();
  
  const userIdx = db.users.findIndex((u: User) => u.id === id);
  if (userIdx === -1) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const actor = db.users.find((u: User) => u.email.toLowerCase() === currentUserEmail.toLowerCase());
  if (!actor || (actor.role !== "DEV" && actor.role !== "ADMIN")) {
    // Only DEV or ADMIN can configure user states
    res.status(403).json({ error: "Only DEV or ADMIN roles can modify users" });
    return;
  }

  const oldUser = { ...db.users[userIdx] };
  
  if (role) db.users[userIdx].role = role;
  if (active !== undefined) db.users[userIdx].active = active;
  if (show_on_roster !== undefined) db.users[userIdx].show_on_roster = show_on_roster;
  if (name) db.users[userIdx].name = name;
  if (email) db.users[userIdx].email = email;

  writeDb(db);
  
  addAuditLog(
    currentUserEmail, 
    `Update User: ${oldUser.name}`, 
    JSON.stringify({ role: oldUser.role, active: oldUser.active, show_on_roster: oldUser.show_on_roster }), 
    JSON.stringify({ role: db.users[userIdx].role, active: db.users[userIdx].active, show_on_roster: db.users[userIdx].show_on_roster })
  );

  res.json({ success: true, user: db.users[userIdx] });
});

// Delete user
app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const actor = db.users.find((u: User) => u.email.toLowerCase() === currentUserEmail.toLowerCase());
  if (!actor || (actor.role !== "DEV" && actor.role !== "ADMIN")) {
    res.status(403).json({ error: "Only DEV or ADMIN can delete users" });
    return;
  }

  const userIdx = db.users.findIndex((u: User) => u.id === id);
  if (userIdx === -1) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const deletedUser = db.users[userIdx];
  db.users.splice(userIdx, 1);
  writeDb(db);

  addAuditLog(currentUserEmail, `Delete User: ${deletedUser.name}`, JSON.stringify(deletedUser), "DELETED");
  res.json({ success: true });
});

// Lists shifts
app.get("/api/shifts", (req, res) => {
  const db = readDb();
  res.json({ shifts: db.shifts });
});

// Create/Update Shift directly (Cell-edit helper)
app.post("/api/shifts/save", (req, res) => {
  const { user_id, shift_date, shift_code, remark } = req.body;
  const db = readDb();

  // Validate requester permission
  const actor = db.users.find((u: User) => u.email.toLowerCase() === currentUserEmail.toLowerCase());
  if (!actor || (actor.role !== "ADMIN" && actor.role !== "DEV")) {
    res.status(403).json({ error: "Permission Denied: Only ADMIN or DEV can edit rosters." });
    return;
  }

  const targetUser = db.users.find((u: User) => u.id === user_id);
  const targetUserName = targetUser ? targetUser.name : "Unknown Employee";

  // Check if a shift already exists for this date + employee
  const existingShiftIdx = db.shifts.findIndex(
    (s: Shift) => s.user_id === user_id && s.shift_date === shift_date
  );

  let oldValue = "None";
  let newValue = shift_code;

  if (existingShiftIdx !== -1) {
    oldValue = db.shifts[existingShiftIdx].shift_code;
    db.shifts[existingShiftIdx].shift_code = shift_code;
    db.shifts[existingShiftIdx].remark = remark || "";
    db.shifts[existingShiftIdx].created_at = new Date().toISOString();
  } else {
    db.shifts.push({
      id: `s-${user_id}-${Date.now()}`,
      user_id,
      shift_date,
      shift_code,
      remark: remark || "",
      created_at: new Date().toISOString()
    });
  }

  writeDb(db);

  // Leave workflows should update if relevant, but editing manually is tracked here
  addAuditLog(
    currentUserEmail, 
    `Edit Shift for ${targetUserName} on ${shift_date}`, 
    `Code: ${oldValue}`, 
    `Code: ${newValue}`
  );

  // Send Email Notification to affected user
  if (targetUser && targetUser.email) {
    sendSimulatedEmail(
      targetUser.email,
      "Your Schedule Has Been Updated",
      `Hello ${targetUser.name},\n\nAn administrator (${actor.name}) has updated your shift on ${shift_date}.\nYour new shift code is: ${shift_code}\n\nBest regards,\nHR Workforce Team`
    );
  }

  res.json({ success: true });
});

// Batch Create/Update Shifts (Excel drag-select/multi-day helper)
app.post("/api/shifts/save-batch", (req, res) => {
  const { user_id, shift_dates, shift_code, remark } = req.body;
  const db = readDb();

  // Validate requester permission
  const actor = db.users.find((u: User) => u.email.toLowerCase() === currentUserEmail.toLowerCase());
  if (!actor || (actor.role !== "ADMIN" && actor.role !== "DEV")) {
    res.status(403).json({ error: "Permission Denied: Only ADMIN or DEV can edit rosters." });
    return;
  }

  const targetUser = db.users.find((u: User) => u.id === user_id);
  const targetUserName = targetUser ? targetUser.name : "Unknown Employee";

  if (!Array.isArray(shift_dates) || shift_dates.length === 0) {
    res.status(400).json({ error: "Invalid shift_dates parameter." });
    return;
  }

  shift_dates.forEach((dateStr) => {
    const existingShiftIdx = db.shifts.findIndex(
      (s: Shift) => s.user_id === user_id && s.shift_date === dateStr
    );

    if (existingShiftIdx !== -1) {
      db.shifts[existingShiftIdx].shift_code = shift_code;
      db.shifts[existingShiftIdx].remark = remark || "";
      db.shifts[existingShiftIdx].created_at = new Date().toISOString();
    } else {
      db.shifts.push({
        id: `s-${user_id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        user_id,
        shift_date: dateStr,
        shift_code,
        remark: remark || "",
        created_at: new Date().toISOString()
      });
    }
  });

  writeDb(db);

  addAuditLog(
    currentUserEmail, 
    `Batch Edit Shifts for ${targetUserName}`, 
    `Days updated: ${shift_dates.length}`, 
    `Set to ${shift_code}`
  );

  // Send Email Notification to affected user
  if (targetUser && targetUser.email) {
    sendSimulatedEmail(
      targetUser.email,
      "Your Schedule Has Been Updated (Multiple Days)",
      `Hello ${targetUser.name},\n\nAn administrator (${actor.name}) has updated your shifts for ${shift_dates.length} days:\n${shift_dates.slice(0, 10).join(", ")}${shift_dates.length > 10 ? "..." : ""}.\nYour new shift code is: ${shift_code}\n\nBest regards,\nHR Workforce Team`
    );
  }

  res.json({ success: true });
});

// Leave requests list
app.get("/api/leave-requests", (req, res) => {
  const db = readDb();
  // Join users
  const hydrated = db.leave_requests.map((req: LeaveRequest) => {
    const user = db.users.find((u: User) => u.id === req.user_id);
    return {
      ...req,
      user_name: user ? user.name : "Unknown",
      user_email: user ? user.email : "Unknown"
    };
  });
  res.json({ leave_requests: hydrated });
});

// Submit leave request
app.post("/api/leave-requests", (req, res) => {
  const { start_date, end_date, reason } = req.body;
  const db = readDb();

  const actor = db.users.find((u: User) => u.email.toLowerCase() === currentUserEmail.toLowerCase());
  if (!actor || !actor.active) {
    res.status(403).json({ error: "Access Denied / User Disabled" });
    return;
  }

  const newRequest: LeaveRequest = {
    id: `leave-${Date.now()}`,
    user_id: actor.id,
    start_date,
    end_date,
    reason,
    status: "Pending",
    approved_by: null,
    approved_at: null,
    created_at: new Date().toISOString()
  };

  db.leave_requests.push(newRequest);
  writeDb(db);

  addAuditLog(
    currentUserEmail, 
    "Submit Leave Request", 
    "None", 
    `Requested leave from ${start_date} to ${end_date}. Reason: ${reason}`
  );

  // Notify all Admins and Devs on Submission
  const admins = db.users.filter((u: User) => u.active && (u.role === "ADMIN" || u.role === "DEV"));
  
  addNotification(
    "New Leave Request Submitted",
    `${actor.name} submitted a leave request from ${start_date} to ${end_date}.`,
    "all_admins"
  );

  admins.forEach((admin: User) => {
    sendSimulatedEmail(
      admin.email,
      "Action Required: New Leave Request Submitted",
      `Hi ${admin.name},\n\nA new leave request has been submitted by ${actor.name} (${actor.email}).\nPeriod: ${start_date} to ${end_date}\nReason: "${reason}"\n\nPlease log in to the Shift Planning system to Approve or Reject this request.\n\nBest regards,\nAutomated Leave Manager`
    );
  });

  res.json({ success: true, request: newRequest });
});

// Handle Leave Request Action (Approve, Reject, Cancel)
app.post("/api/leave-requests/:id/action", (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // "Approve" | "Reject" | "Cancel"
  const db = readDb();

  const actor = db.users.find((u: User) => u.email.toLowerCase() === currentUserEmail.toLowerCase());
  if (!actor) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  const leaveIdx = db.leave_requests.findIndex((l: LeaveRequest) => l.id === id);
  if (leaveIdx === -1) {
    res.status(404).json({ error: "Leave request not found" });
    return;
  }

  const leave = db.leave_requests[leaveIdx];
  const user = db.users.find((u: User) => u.id === leave.user_id);

  if (action === "Cancel") {
    // A user can cancel their OWN pending or approved leave, or Admin/Dev can cancel approved
    const isOwner = user && user.email.toLowerCase() === currentUserEmail.toLowerCase();
    const isAdmin = actor.role === "ADMIN" || actor.role === "DEV";
    
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: "Permission Denied: Cannot cancel another user's leave" });
      return;
    }

    const previousStatus = leave.status;
    leave.status = "Cancelled";
    leave.approved_by = isOwner ? "Cancelled by User" : `Cancelled by administrator (${actor.name})`;
    leave.approved_at = new Date().toISOString();
    writeDb(db);

    // If previously approved, we must clear the AL/SL/HL shifts on those dates and revert to OFF or original
    if (previousStatus === "Approved" && user) {
      // Revert shifts between start_date and end_date to OFF
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      
      db.shifts = db.shifts.map((s: Shift) => {
        if (s.user_id === user.id) {
          const sDate = new Date(s.shift_date);
          if (sDate >= start && sDate <= end) {
            return {
              ...s,
              shift_code: "OFF",
              remark: "Leave Cancelled: Reverted to Day Off"
            };
          }
        }
        return s;
      });
      writeDb(db);
    }

    addAuditLog(
      currentUserEmail,
      "Cancel Leave Request",
      `Status: ${previousStatus}`,
      `Status: Cancelled`
    );

    res.json({ success: true, message: "Leave request successfully cancelled." });
    return;
  }

  // Admin/Dev authorization guard for Approve/Reject
  if (actor.role !== "ADMIN" && actor.role !== "DEV") {
    res.status(403).json({ error: "Permission Denied: Only ADMIN or DEV can approve or reject leave." });
    return;
  }

  // Prevent multiple double approvals
  if (leave.status !== "Pending") {
    res.status(400).json({ error: `This leave request is already ${leave.status}` });
    return;
  }

  const oldStatus = leave.status;

  if (action === "Approve") {
    leave.status = "Approved";
    leave.approved_by = `${actor.name} (${actor.email})`;
    leave.approved_at = new Date().toISOString();

    // Automatically map shifts on these days to Annual Leave (AL) or Sick Leave (SL)
    if (user) {
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      const daysCount = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

      // Loop through date range and update / insert Al/SL shifts
      for (let d = 0; d < daysCount; d++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + d);
        const dateStr = currentDate.toISOString().split("T")[0];

        const existingShiftIdx = db.shifts.findIndex(
          (s: Shift) => s.user_id === user.id && s.shift_date === dateStr
        );

        const codeVal = leave.reason.toLowerCase().includes("sick") || leave.reason.toLowerCase().includes("medical") ? "SL" : "AL";

        if (existingShiftIdx !== -1) {
          db.shifts[existingShiftIdx].shift_code = codeVal;
          db.shifts[existingShiftIdx].remark = `Approved Leave: ${leave.reason}`;
        } else {
          db.shifts.push({
            id: `s-${user.id}-${Date.now()}-${d}`,
            user_id: user.id,
            shift_date: dateStr,
            shift_code: codeVal,
            remark: `Approved Leave: ${leave.reason}`,
            created_at: new Date().toISOString()
          });
        }
      }
    }

    writeDb(db);

    addAuditLog(
      currentUserEmail,
      "Approve Leave Request",
      `Status: ${oldStatus}`,
      `Status: Approved for ${user ? user.name : "Unknown"} (${leave.start_date} to ${leave.end_date})`
    );

    // Notify user via Email
    if (user && user.email) {
      sendSimulatedEmail(
        user.email,
        "APPROVED: Your Leave Request has been Approved",
        `Hello ${user.name},\n\nWe are pleased to inform you that your leave request from ${leave.start_date} to ${leave.end_date} has been APPROVED by ${actor.name}.\nSchedule shifts on these days have been locked as AL/SL.\n\nEnjoy your time off!\n\nBest regards,\nHR Workforce Management`
      );
    }

    // Notify ALL Admins about who approved it
    addNotification(
      "Leave Request Approved",
      `Leave request for ${user ? user.name : "Employee"} approved by ${actor.name}.`,
      "all_admins"
    );

    const admins = db.users.filter((u: User) => u.active && (u.role === "ADMIN" || u.role === "DEV") && u.id !== actor.id);
    admins.forEach((admin: User) => {
      sendSimulatedEmail(
        admin.email,
        `Update: Leave Request Approved by ${actor.name}`,
        `Hi ${admin.name},\n\nThe pending leave request for ${user ? user.name : "Employee"} (${leave.start_date} to ${leave.end_date}) has been approved by Admin ${actor.name}.\nNo further action is required.\n\nBest regards,\nHR Management Portal`
      );
    });

  } else if (action === "Reject") {
    leave.status = "Rejected";
    leave.approved_by = `${actor.name} (${actor.email})`;
    leave.approved_at = new Date().toISOString();
    writeDb(db);

    addAuditLog(
      currentUserEmail,
      "Reject Leave Request",
      `Status: ${oldStatus}`,
      `Status: Rejected for ${user ? user.name : "Unknown"} (${leave.start_date} to ${leave.end_date})`
    );

    // Notify user via Email
    if (user && user.email) {
      sendSimulatedEmail(
        user.email,
        "REJECTED: Your Leave Request Update",
        `Hello ${user.name},\n\nUnfortunately, your leave request from ${leave.start_date} to ${leave.end_date} has been REJECTED by ${actor.name}.\n\nPlease contact your manager or scheduling coordinator if you have any questions.\n\nBest regards,\nHR Workforce Management`
      );
    }

    // Notify ALL Admins
    addNotification(
      "Leave Request Rejected",
      `Leave request for ${user ? user.name : "Employee"} rejected by ${actor.name}.`,
      "all_admins"
    );
  }

  res.json({ success: true, request: leave });
});

// Settings Endpoints: GET/POST configuration
app.get("/api/settings", (req, res) => {
  const db = readDb();
  res.json({
    email_broadcast_enabled: db.email_broadcast_enabled !== false
  });
});

app.post("/api/settings", (req, res) => {
  const db = readDb();
  const { email_broadcast_enabled } = req.body;

  const actor = db.users.find((u: User) => u.email.toLowerCase() === currentUserEmail.toLowerCase());
  if (!actor || (actor.role !== "ADMIN" && actor.role !== "DEV")) {
    res.status(403).json({ error: "Access Denied: Only ADMIN or DEV can change system settings" });
    return;
  }

  const oldVal = db.email_broadcast_enabled !== false ? "Enabled" : "Disabled";
  const newVal = email_broadcast_enabled ? "Enabled" : "Disabled";

  db.email_broadcast_enabled = !!email_broadcast_enabled;
  writeDb(db);

  addAuditLog(
    currentUserEmail,
    "Update Settings",
    `Email Broadcast: ${oldVal}`,
    `Email Broadcast: ${newVal}`
  );

  res.json({ success: true, email_broadcast_enabled: db.email_broadcast_enabled });
});

// Audit List (Only ADMIN / DEV)
app.get("/api/audit-logs", (req, res) => {
  const db = readDb();
  
  const actor = db.users.find((u: User) => u.email.toLowerCase() === currentUserEmail.toLowerCase());
  if (!actor || (actor.role !== "ADMIN" && actor.role !== "DEV")) {
    res.status(403).json({ error: "Access Denied: Only ADMIN and DEV can view logs" });
    return;
  }

  // Hydrate with user name if possible
  const hydrated = db.audit_logs.map((log: AuditLog) => {
    const user = db.users.find((u: User) => u.email.toLowerCase() === log.user_id.toLowerCase());
    return {
      ...log,
      user_name: user ? user.name : "System User"
    };
  });
  
  res.json({ audit_logs: hydrated });
});

// Notifications list
app.get("/api/notifications", (req, res) => {
  const db = readDb();
  const actor = db.users.find((u: User) => u.email.toLowerCase() === currentUserEmail.toLowerCase());
  
  if (!actor) {
    res.json({ notifications: [] });
    return;
  }

  // Filter: specific for user, or "all_admins" if user has ADMIN/DEV roles
  const filtered = db.notifications.filter((notif: Notification) => {
    if (notif.recipient_user_id === actor.id) return true;
    if (notif.recipient_user_id === "all_admins" && (actor.role === "ADMIN" || actor.role === "DEV")) return true;
    return false;
  });

  res.json({ notifications: filtered });
});

// Mark Notification read
app.post("/api/notifications/:id/read", (req, res) => {
  const { id } = req.params;
  const db = readDb();
  
  const notifIdx = db.notifications.findIndex((n: Notification) => n.id === id);
  if (notifIdx !== -1) {
    db.notifications[notifIdx].is_read = true;
    writeDb(db);
  }
  res.json({ success: true });
});

// Clear all notifications for actor
app.post("/api/notifications/clear-all", (req, res) => {
  const db = readDb();
  const actor = db.users.find((u: User) => u.email.toLowerCase() === currentUserEmail.toLowerCase());
  if (actor) {
    db.notifications = db.notifications.map((notif: Notification) => {
      const match = notif.recipient_user_id === actor.id || 
                    (notif.recipient_user_id === "all_admins" && (actor.role === "ADMIN" || actor.role === "DEV"));
      if (match) {
        return { ...notif, is_read: true };
      }
      return notif;
    });
    writeDb(db);
  }
  res.json({ success: true });
});

// Simulated Outbox endpoint (Stored durably in shift_db.json)
app.get("/api/simulated-emails", (req, res) => {
  const db = readDb();
  res.json({ emails: db.simulated_emails || [] });
});

// Clear simulated emails
app.post("/api/simulated-emails/clear", (req, res) => {
  const db = readDb();
  db.simulated_emails = [];
  writeDb(db);
  res.json({ success: true });
});


// ---------------- VITE / MIDDLEWARE SETUP ----------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
