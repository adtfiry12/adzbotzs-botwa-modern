const db = require("../db");

const settingsTableReady = db.query(`
  CREATE TABLE IF NOT EXISTS group_settings (
    group_id VARCHAR(191) PRIMARY KEY,
    antilink TINYINT(1) NOT NULL DEFAULT 1,
    welcome TINYINT(1) NOT NULL DEFAULT 0
  )
`);

async function getGroupSettings(groupId) {
  await settingsTableReady;
  await db.query(
    "INSERT IGNORE INTO group_settings (group_id) VALUES (?)",
    [groupId],
  );
  const [rows] = await db.query(
    "SELECT antilink, welcome FROM group_settings WHERE group_id = ?",
    [groupId],
  );
  return rows[0];
}

async function setGroupSetting(groupId, setting, enabled) {
  if (!["antilink", "welcome"].includes(setting)) {
    throw new Error(`Setting grup tidak dikenal: ${setting}`);
  }
  await settingsTableReady;
  await db.query(
    `INSERT INTO group_settings (group_id, ${setting}) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE ${setting} = VALUES(${setting})`,
    [groupId, enabled ? 1 : 0],
  );
  return getGroupSettings(groupId);
}

module.exports = { getGroupSettings, setGroupSetting };
