const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DEFAULT_DB_PATH = path.join(__dirname, "..", "data", "riders.sqlite");

let db;

/**
 * Opens (or creates) the local SQLite database and ensures the bookings schema exists.
 * @param {string} [dbPath]
 * @returns {import("better-sqlite3").Database}
 */
function initDb(dbPath = process.env.SQLITE_PATH || DEFAULT_DB_PATH) {
  const resolved = path.resolve(dbPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  db = new Database(resolved);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_event_id TEXT,
      barber TEXT NOT NULL,
      service TEXT NOT NULL,
      booking_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_email TEXT,
      status TEXT NOT NULL DEFAULT 'confirmed',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}

/**
 * Inserts a confirmed booking row. Throws on failure.
 * @returns {{ id: number }}
 */
function insertBooking({
  googleEventId,
  barber,
  service,
  bookingDate,
  startTime,
  endTime,
  customerName,
  customerPhone,
  customerEmail,
  status = "confirmed",
}) {
  const info = getDb()
    .prepare(
      `INSERT INTO bookings (
        google_event_id, barber, service, booking_date, start_time, end_time,
        customer_name, customer_phone, customer_email, status
      ) VALUES (
        @googleEventId, @barber, @service, @bookingDate, @startTime, @endTime,
        @customerName, @customerPhone, @customerEmail, @status
      )`
    )
    .run({
      googleEventId,
      barber,
      service,
      bookingDate,
      startTime,
      endTime,
      customerName,
      customerPhone: customerPhone ?? null,
      customerEmail: customerEmail ?? null,
      status,
    });

  return { id: Number(info.lastInsertRowid) };
}

module.exports = { initDb, getDb, insertBooking, DEFAULT_DB_PATH };
