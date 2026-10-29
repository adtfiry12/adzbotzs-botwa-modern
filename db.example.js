const mysql = require("mysql2/promise");

// Bikin connection pool biar bot nggak gampang crash kalau banyak yang request barengan
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "adzbotzs",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

console.log("🔌 Modul Database MySQL Siap!");

module.exports = db;
