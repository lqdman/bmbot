// bmbot.js
// Первая строка файла
process.env.TZ = "UTC"; // Добавить эту строку
require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { getMessage, selectLanguage } = require("./language");
const {
  loadUserData,
  saveUserData,
  initializeUser,
  updateUserState,
  clearMessageIds,
} = require("./userState");
const { isAdmin, checkAdmin } = require("./utils");

const {
  handleStartCommand,
  handleLanguageCommand,
  handleUnblockUserCommand,
  handleStopLinksCommand,
} = require("./commands");
const { handleMessageEvent } = require("./messageHandlers");
const { publishPost } = require("./publishPost"); // Добавьте эту строку
const { handleMessage } = require("./handleMessage");
const path = require("path");
const fs = require("fs");
const forbiddenLinksFilePath = path.join(__dirname, "forbiddenLinks.json");

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const users = loadUserData();

// Команда START
bot.onText(/\/start/, (msg) => {
  handleStartCommand(bot, users, msg);
});

// Команда /russian
bot.onText(/\/russian/, (msg) => {
  handleLanguageCommand(bot, users, msg, "ru");
});

// Команда /english
bot.onText(/\/english/, (msg) => {
  handleLanguageCommand(bot, users, msg, "en");
});

// Команда /unblockuser
bot.onText(/\/unblockuser (.+)/, async (msg, match) => {
  await handleUnblockUserCommand(bot, users, msg, match);
});

// Команда /stoplinks
bot.onText(/\/stoplinks (.+)/, async (msg, match) => {
  await handleStopLinksCommand(bot, users, msg, match);
});

// Обработка callback_query
// Обработка callback_query
bot.on("callback_query", async (query) => {
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  // Проверка на админа для всех административных действий
  const isAdminResult = await isAdmin(userId);
  if (
    !isAdminResult &&
    (data.startsWith("approve_") ||
      data.startsWith("reject_") ||
      data.startsWith("block_"))
  ) {
    await bot.answerCallbackQuery(query.id, { text: "You are not admin" });
    return;
  }

  if (data === "publish") {
    await publishPost(bot, chatId, users, userId);
    try {
      await bot.deleteMessage(chatId, messageId);
    } catch (error) {}
  } else if (data.startsWith("approve_")) {
    const targetUserId = data.split("_")[1];
    updateUserState(users, targetUserId, { isApproved: true });
    await bot.answerCallbackQuery(query.id, { text: "User approved" });
    bot.sendMessage(
      chatId,
      `User ${targetUserId} has been approved for posting.`
    );

    const targetUserChat = await bot.getChat(targetUserId);
    if (targetUserChat && targetUserChat.id) {
      bot.sendMessage(
        targetUserChat.id,
        getMessage("approvalApproved", users[targetUserId].language)
      );
    }

    if (users[targetUserId].isApproved) {
      await publishPost(bot, chatId, users, targetUserId);
      try {
        await bot.deleteMessage(chatId, messageId);
      } catch (error) {}
    }
  } else if (data.startsWith("reject_")) {
    const targetUserId = data.split("_")[1];
    updateUserState(users, targetUserId, { isApproved: false });
    await bot.answerCallbackQuery(query.id, { text: "User rejected" });
    bot.sendMessage(
      chatId,
      `User ${targetUserId}'s request has been rejected.`
    );

    const targetUserChat = await bot.getChat(targetUserId);
    if (targetUserChat && targetUserChat.id) {
      bot.sendMessage(
        targetUserChat.id,
        getMessage("approvalRejected", users[targetUserId].language)
      );
    }

    try {
      await bot.deleteMessage(chatId, messageId);
    } catch (error) {}
  } else if (data.startsWith("block_")) {
    const targetUserId = data.split("_")[1];
    updateUserState(users, targetUserId, { isBlocked: true });
    await bot.answerCallbackQuery(query.id, { text: "User blocked" });
    bot.sendMessage(chatId, `User ${targetUserId} has been blocked.`);

    try {
      await bot.deleteMessage(chatId, messageId);
    } catch (error) {}
  } else if (data === "/english") {
    updateUserState(users, userId, { language: "en" });
    await bot.sendMessage(chatId, getMessage("welcome", "en"));
    await bot.sendMessage(chatId, getMessage("sendLink", "en"));
  } else if (data === "/russian") {
    updateUserState(users, userId, { language: "ru" });
    await bot.sendMessage(chatId, getMessage("welcome", "ru"));
    await bot.sendMessage(chatId, getMessage("sendLink", "ru"));
  }
});

bot.on("message", async (msg) => {
  await handleMessageEvent(bot, users, msg);
});

// Обработка ошибок опроса
bot.on("polling_error", (error) => {
  console.error("Polling error details:", {
    code: error.code,
    message: error.message,
    stack: error.stack,
  });
});
