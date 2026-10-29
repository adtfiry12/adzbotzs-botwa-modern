const mysql = require("mysql2/promise");

// Bikin connection pool biar bot nggak gampang crash kalau banyak yang request barengan
const db = mysql.createPool({
  host: "localhost",
  user: "root", // Default biasanya root
  password: "", // Isi kalau user pakai password
  database: "", // Ganti dengan nama database sesukamu
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

console.log("🔌 Modul Database MySQL Siap!");

module.exports = db;
