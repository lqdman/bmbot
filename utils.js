// utils.js

const {
  updateUserState,
  clearMessageIds,
  saveUserData,
} = require("./userState");
const { checkUserPostState } = require("./checkUserPostState");
const { getMessage } = require("./language");

// ================== АДМИН-ФУНКЦИИ ==================
// utils.js
function isAdmin(userId) {
  return userId?.toString() === process.env.ADMIN_ID?.toString();
}

async function checkAdmin(bot, chatId, userId, language = "en") {
  if (!isAdmin(userId)) {
    await bot.sendMessage(chatId, getMessage("adminOnly", language));
    return false;
  }
  return true;
}

// ================== ОСНОВНЫЕ ФУНКЦИИ ==================
function escapeMarkdown(text) {
  const specialChars = [
    "_",
    "*",
    "[",
    "]",
    "(",
    ")",
    "~",
    "`",
    ">",
    "#",
    "+",
    "-",
    "=",
    "|",
    "{",
    "}",
    ".",
    "!",
  ];
  return text.replace(
    new RegExp(`[${specialChars.map((c) => "\\" + c).join("")}]`, "g"),
    "\\$&"
  );
}

async function deleteUserMessages(bot, chatId, users, userId) {
  const userState = users[userId];
  const messageIds = userState.messageIds || [];

  for (const messageId of messageIds) {
    try {
      await bot.deleteMessage(chatId, messageId);
    } catch (error) {}
  }

  clearMessageIds(users, userId);
  saveUserData(users);
}

async function sendUserStateMessages(bot, chatId, users, userId) {
  const userState = users[userId];
  const messageIds = await sendMediaContent(bot, chatId, userState, {}, userId); // Добавлен userId
  updateUserState(users, userId, { messageIds });
  return messageIds.length > 0;
}

async function formatUserLink(bot, userId) {
  try {
    const user = await bot.getChat(userId);
    const safeUserId = userId || "unknown";
    return user.username
      ? `[${escapeMarkdown(user.username)}](tg://user?id=${safeUserId})`
      : `[User\\# ${safeUserId}](tg://user?id=${safeUserId})`;
  } catch (error) {
    return `[User\\# ${userId}](tg://user?id=${userId})`;
  }
}

function buildMessageContent(userState, userLink, userId) {
  console.log("buildMessageContent userId:", userId);
  let messageParts = [];

  // Кликабельная ссылка
  if (userState.hasLink) {
    messageParts.push(`•••\nCheck [out](${escapeMarkdown(userState.hasLink)})`);
  }

  // Упоминание для не-админов (при наличии ЛЮБОГО контента: ссылки или обложки)
  if (!isAdmin(userId) && (userState.hasLink || userState.hasImage)) {
    messageParts.push("Posted by @breakinmixpostbot");
  }

  // Сборка сообщения
  let messageText = messageParts.join("\n");

  // Разделитель
  if (messageParts.length > 0) {
    messageText += "\n———\n\n";
  }

  // Текст описания
  if (userState.hasText) {
    messageText += `${escapeMarkdown(userState.hasText)}\n`;
  }

  return messageText;
}

async function sendMediaContent(bot, chatId, userState, options = {}, userId) {
  const { hasImage, hasAudio } = userState;
  const { isApprovalRequest = false, withSubscribeButton = true } = options;

  const userLink = await formatUserLink(bot, userId); // userId должен быть передан
  let messageIds = [];
  const messageText = buildMessageContent(userState, userLink, userId); // Используем переданный userId

  if (hasImage) {
    const sentMessage = await bot.sendPhoto(chatId, hasImage, {
      caption: messageText,
      parse_mode: "MarkdownV2",
    });
    messageIds.push(sentMessage.message_id);
  } else if (messageText) {
    const sentMessage = await bot.sendMessage(chatId, messageText, {
      parse_mode: "MarkdownV2",
    });
    messageIds.push(sentMessage.message_id);
  }

  if (hasAudio) {
    const keyboard = withSubscribeButton
      ? {
          inline_keyboard: [
            [
              {
                text: "Drop your mix",
                url: "https://t.me/breakinmixpostbot?start=1",
              },
            ],
          ],
        }
      : undefined;

    const sentMessage = await bot.sendAudio(chatId, hasAudio, {
      caption: isApprovalRequest
        ? "@Breakinmix • • •"
        : "@Breakinmix                                   • • •",
      reply_markup: keyboard,
    });
    messageIds.push(sentMessage.message_id);
  }

  return messageIds;
}

module.exports = {
  isAdmin,
  checkAdmin,
  escapeMarkdown,
  deleteUserMessages,
  sendUserStateMessages,
  checkUserPostState,
  formatUserLink,
  buildMessageContent,
  sendMediaContent,
};
