const fs = require("fs");
const path = require("path");
const { getMessage, selectLanguage } = require("./language");
const {
  updateUserState,
  initializeUser,
  resetUserState,
} = require("./userState");
const { isAdmin, checkAdmin } = require("./utils"); // Импорт обновленных функций

const forbiddenLinksFilePath = path.join(__dirname, "forbiddenLinks.json");

module.exports = {
  handleStartCommand: (bot, users, msg) => {
    const userId = msg.from.id;
    const chatId = msg.chat.id;

    initializeUser(users, userId);

    if (!users[userId].language) {
      selectLanguage(bot, chatId);
    } else {
      resetUserState(users, userId);
      bot.sendMessage(chatId, getMessage("sendLink", users[userId].language));
    }
  },

  handleLanguageCommand: (bot, users, msg, language) => {
    const userId = msg.from.id;
    const chatId = msg.chat.id;

    updateUserState(users, userId, { language });
    bot.sendMessage(chatId, `Language changed to ${language}.`);
  },

  handleUnblockUserCommand: async (bot, users, msg, match) => {
    const adminId = msg.from.id;
    const targetUserId = match[1];
    const chatId = msg.chat.id;

    // Использование обновленной функции checkAdmin
    const isAdminResult = await checkAdmin(bot, chatId, adminId, "ru");
    if (!isAdminResult) return;

    if (!users[targetUserId]) {
      bot.sendMessage(chatId, getMessage("userNotFound", "ru"));
      return;
    }

    updateUserState(users, targetUserId, { isBlocked: false });
    bot.sendMessage(
      chatId,
      getMessage("unblockSuccess", "ru").replace("{userId}", targetUserId)
    );
  },

  handleStopLinksCommand: async (bot, users, msg, match) => {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const forbiddenPrefixes = match[1].split(" ");

    // Использование обновленной функции checkAdmin
    const isAdminResult = await checkAdmin(
      bot,
      chatId,
      userId,
      users[userId]?.language || "en"
    );
    if (!isAdminResult) return;

    let forbiddenPrefixesList = [];
    try {
      if (fs.existsSync(forbiddenLinksFilePath)) {
        forbiddenPrefixesList = JSON.parse(
          fs.readFileSync(forbiddenLinksFilePath, "utf8")
        );
      }
    } catch (error) {
      console.error("Error reading forbidden links:", error);
    }

    forbiddenPrefixesList = [
      ...new Set([...forbiddenPrefixesList, ...forbiddenPrefixes]),
    ];

    try {
      fs.writeFileSync(
        forbiddenLinksFilePath,
        JSON.stringify(forbiddenPrefixesList, null, 2)
      );
      bot.sendMessage(
        chatId,
        getMessage("forbiddenPrefixesUpdated", users[userId]?.language || "en")
      );
    } catch (error) {
      console.error("Error saving forbidden links:", error);
      bot.sendMessage(chatId, "❌ Failed to update forbidden links");
    }
  },
};
