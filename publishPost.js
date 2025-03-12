const { getMessage } = require("./language");
const { updateUserState, resetUserState } = require("./userState");
const {
  formatUserLink,
  sendMediaContent,
  isAdmin,
  checkAdmin,
} = require("./utils");

const CHANNEL_ID = process.env.CHANNEL_ID;
const ADMIN_ID = process.env.ADMIN_ID;

async function publishPost(bot, chatId, users, userId) {
  const userState = users[userId];
  const isApproved = userState.isApproved;

  const isAdminResult = await isAdmin(userId);
  if (isAdminResult || isApproved) {
    const postMessageId = await publishToChannel(bot, userState, userId); // Передан userId

    if (chatId) {
      await bot.sendMessage(
        chatId,
        getMessage("postPublished", userState.language)
      );
    }
    await notifyAdminAboutPost(bot, userId, postMessageId);
    resetUserState(users, userId);
  } else {
    await requestApproval(bot, userId, users);
    if (chatId) {
      await bot.sendMessage(
        chatId,
        getMessage("approvalRequested", userState.language)
      );
    }
  }
}

async function publishToChannel(bot, userState, userId) {
  // userId добавлен как параметр
  const messages = await sendMediaContent(
    bot,
    CHANNEL_ID,
    userState,
    {
      withSubscribeButton: true,
    },
    userId // Явная передача userId
  );
  return messages[0];
}

async function requestApproval(bot, userId, users) {
  const userState = users[userId];
  await sendMediaContent(
    bot,
    ADMIN_ID,
    userState,
    {
      isApprovalRequest: true,
      withSubscribeButton: false,
    },
    userId
  ); // userId передан

  const displayName = await formatUserLink(bot, userId);
  await bot.sendMessage(
    ADMIN_ID,
    `Пользователь ${displayName} хочет опубликовать микс. Одобрить или отклонить?`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Одобрить", callback_data: `approve_${userId}` },
            { text: "Отклонить", callback_data: `reject_${userId}` },
          ],
        ],
      },
    }
  );
}

async function notifyAdminAboutPost(bot, userId, postMessageId) {
  const userLink = await formatUserLink(bot, userId);
  const postLink = `https://t.me/c/${CHANNEL_ID.replace(
    "-100",
    ""
  )}/${postMessageId}`;

  await bot.sendMessage(
    ADMIN_ID,
    `Пользователь ${userLink} опубликовал [пост](${postLink})`,
    {
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Заблокировать", callback_data: `block_${userId}` }],
        ],
      },
    }
  );
}

module.exports = {
  publishPost,
  publishToChannel,
  notifyAdminAboutPost,
};
