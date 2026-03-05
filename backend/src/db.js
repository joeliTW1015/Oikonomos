const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbFile = path.join(__dirname, "..", "data.sqlite");
const schemaPath = path.join(__dirname, "schema.sql");
const schema = fs.readFileSync(schemaPath, "utf8");

const db = new sqlite3.Database(dbFile);

// Ensure foreign keys are enforced and schema is up to date.
db.exec("PRAGMA foreign_keys = ON;");
db.exec(schema);

// Migrations: add columns that may not exist in older databases
db.run("ALTER TABLE tasks ADD COLUMN description TEXT", () => {});
db.run("ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'", () => {});
db.run("ALTER TABLE tasks ADD COLUMN note TEXT", () => {});
db.run("ALTER TABLE tasks ADD COLUMN postpone_date TEXT", () => {});
db.run("ALTER TABLE tasks ADD COLUMN origin_task_id INTEGER", () => {});
db.run("ALTER TABLE tasks ADD COLUMN postpone_count INTEGER NOT NULL DEFAULT 0", () => {});
db.run("ALTER TABLE events ADD COLUMN description TEXT", () => {});
// Migrate old completed=1 tasks to status='success'
db.run("UPDATE tasks SET status='success' WHERE completed=1 AND (status IS NULL OR status='pending')", () => {});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

module.exports = {
  db,
  run,
  get,
  all
};
