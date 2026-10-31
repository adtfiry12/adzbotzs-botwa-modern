const db = require("../db");

async function getGroupSettings(groupId) {
  try {
    await db.query(
      "INSERT IGNORE INTO group_settings (group_id) VALUES (?)",
      [groupId],
    );
    const [rows] = await db.query(
      "SELECT antilink, welcome FROM group_settings WHERE group_id = ?",
      [groupId],
    );
    return rows[0] || { antilink: 1, welcome: 0 };
  } catch (error) {
    console.error("Error getGroupSettings:", error.message);
    return { antilink: 1, welcome: 0 };
  }
}

async function setGroupSetting(groupId, setting, enabled) {
  if (!["antilink", "welcome"].includes(setting)) {
    throw new Error(`Setting grup tidak dikenal: ${setting}`);
  }
  await db.query(
    `INSERT INTO group_settings (group_id, ${setting}) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE ${setting} = VALUES(${setting})`,
    [groupId, enabled ? 1 : 0],
  );
  return getGroupSettings(groupId);
}

module.exports = { getGroupSettings, setGroupSetting };
