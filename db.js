const mysql = require("mysql2/promise");
require("dotenv").config();

const dbHost = process.env.DB_HOST || "localhost";
const dbPort =
  Number(process.env.DB_PORT) ||
  (dbHost.includes("tidbcloud.com") ? 4000 : 3306);
const dbUser = process.env.DB_USERNAME || process.env.DB_USER || "root";
const dbPassword = process.env.DB_PASSWORD || "";
const dbName = process.env.DB_DATABASE || process.env.DB_NAME || "adzbotzs";

const needsSsl =
  process.env.DB_SSL === "true" ||
  dbHost.includes("tidbcloud.com") ||
  dbPort === 4000;

const poolConfig = {
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

if (needsSsl) {
  poolConfig.ssl = {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  };
}

const db = mysql.createPool(poolConfig);

// Auto-inisialisasi tabel database saat pertama kali tersambung
async function initDatabase() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        nomor_wa VARCHAR(32) PRIMARY KEY,
        xp INT NOT NULL DEFAULT 0,
        level INT NOT NULL DEFAULT 1
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS group_settings (
        group_id VARCHAR(191) PRIMARY KEY,
        antilink TINYINT(1) NOT NULL DEFAULT 1,
        welcome TINYINT(1) NOT NULL DEFAULT 0
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS soal_kuis (
        id INT AUTO_INCREMENT PRIMARY KEY,
        soal TEXT NOT NULL,
        jawaban VARCHAR(255) NOT NULL
      )
    `);

    // Inisialisasi bank soal jika masih kosong
    const [rows] = await db.query("SELECT COUNT(*) as total FROM soal_kuis");
    if (rows[0]?.total === 0) {
      await db.query(`
        INSERT INTO soal_kuis (soal, jawaban) VALUES
        ('Bahasa pemrograman utama yang berjalan di lingkungan Node.js adalah?', 'javascript'),
        ('Protokol komunikasi terenkripsi yang aman untuk browsing web adalah?', 'https'),
        ('Database NoSQL berbasis dokumen open source yang sangat populer adalah?', 'mongodb'),
        ('Perintah Git untuk menyalin repository remote ke lokal adalah?', 'git clone'),
        ('Library Node.js yang dipakai bot ini untuk terhubung ke WhatsApp adalah?', 'baileys')
      `);
    }

    console.log(
      `🔌 Modul Database MySQL (${needsSsl ? "TiDB Cloud" : "Local"}) Terhubung & Siap!`,
    );
  } catch (error) {
    console.warn(
      `⚠️ Peringatan DB: Gagal inisialisasi tabel (${error.message}). Fitur berbasis database mungkin terbatas.`,
    );
  }
}

initDatabase();

module.exports = db;
