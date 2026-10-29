const handleCommand = require("./features/commandHandler");

module.exports = async function handleMessage(piyo, msg) {
  return handleCommand(piyo, msg);
};
