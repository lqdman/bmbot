require("dotenv").config();

const { getMessage } = require("./language");
const { updateUserState } = require("./userState");

const CHANNEL_ID = process.env.CHANNEL_ID;
const ADMIN_ID = process.env.ADMIN_ID;

if (!CHANNEL_ID) {
  throw new Error("CHANNEL_ID is not defined");
}

if (!ADMIN_ID) {
  throw new Error("ADMIN_ID is not defined");
}

module.exports = {
  publishPost,
  CHANNEL_ID,
  ADMIN_ID,
  createAndSendMessage, // Экспортируем новую функцию
};

// Новая функция для создания и отправки сообщений
async function createAndSendMessage(bot, chatId, userState, userId) {
  const { hasLink, hasText, hasImage, hasAudio, language = "en" } = userState;

  // Логгируем userId и ADMIN_ID для проверки
  console.log(`[DEBUG] userId: ${userId}, ADMIN_ID: ${process.env.ADMIN_ID}`);

  // Проверяем, является ли пользователь админом
  const isAdmin = userId && userId.toString() === process.env.ADMIN_ID;
  console.log(`[DEBUG] isAdmin: ${isAdmin}`);

  let messageText = "";
  let photo = null;
  let audio = null;
  let sentMessages = []; // Массив для хранения ID всех отправленных сообщений

  // Если есть ссылка, добавляем "Check out" и ссылку
  if (hasLink) {
    messageText += `•••\n**Check [out](${hasLink})**\n`;

    // Добавляем "Posted by user" только если пользователь не админ
    if (!isAdmin) {
      messageText += `**${getMessage("postedByUser", language)}**\n`;
    }

    messageText += `———\n\n`;
  }

  // Если есть текст, добавляем его
  if (hasText) {
    messageText += `${hasText}\n`;
  }

  if (hasImage) {
    photo = hasImage;
  }

  if (hasAudio) {
    audio = hasAudio;
  }

  if (photo) {
    let caption = messageText;

    // Если нет ссылки, добавляем "Опубликовано пользователем" под изображением только если пользователь не админ
    if (!hasLink && !isAdmin) {
      caption = `•••\n**${getMessage(
        "postedByUser",
        language
      )}**\n———\n\n${messageText}`;
    }

    // Логгируем текст перед отправкой изображения
    console.log(`[DEBUG] Sending photo with caption: ${caption}`);

    // Отправляем изображение с подписью
    const sentMessage = await bot.sendPhoto(chatId, photo, {
      caption: caption, // Подпись к изображению
      parse_mode: "Markdown", // Указываем, что используем Markdown для форматирования
    });
    sentMessages.push(sentMessage.message_id); // Сохраняем ID сообщения с обложкой
  } else if (messageText) {
    // Логгируем текст перед отправкой текстового сообщения
    console.log(`[DEBUG] Sending text message: ${messageText}`);

    // Если нет изображения, отправляем текстовое сообщение
    const sentMessage = await bot.sendMessage(chatId, messageText, {
      parse_mode: "Markdown", // Указываем, что используем Markdown для форматирования
    });
    sentMessages.push(sentMessage.message_id); // Сохраняем ID текстового сообщения
  }

  if (audio) {
    const audioCaption = "@Breakinmix                                   • • •";
    const subscribeButton = {
      text: "Drop your mix",
      url: "https://t.me/breakinmixpostbot?start=1",
    };
    const keyboard = {
      inline_keyboard: [[subscribeButton]],
    };

    // Логгируем текст перед отправкой аудио
    console.log(`[DEBUG] Sending audio with caption: ${audioCaption}`);

    const sentMessage = await bot.sendAudio(chatId, audio, {
      caption: audioCaption,
      reply_markup: keyboard,
    });
    sentMessages.push(sentMessage.message_id); // Сохраняем ID сообщения с аудио
  }

  return sentMessages; // Возвращаем массив ID всех отправленных сообщений
}

async function publishPost(bot, chatId, users, userId) {
  const userState = users[userId];
  const isAdmin = userId.toString() === process.env.ADMIN_ID;

  console.log(
    `[DEBUG] Publishing post. userId: ${userId}, isAdmin: ${isAdmin}`
  );

  if (isAdmin || userState.isApproved) {
    const postMessage = await publishToChannel(bot, userState, userId);
    if (chatId) {
      bot.sendMessage(chatId, getMessage("postPublished", userState.language));
    }
    await notifyAdminAboutPost(bot, userId, postMessage);
    resetUserState(users, userId, bot, chatId);
  } else {
    await requestApproval(bot, userId, users);
    if (chatId) {
      bot.sendMessage(
        chatId,
        getMessage("approvalRequested", userState.language)
      );
    }
  }
}

async function publishToChannel(bot, userState, userId) {
  console.log(
    `[DEBUG] Publishing to channel. userId: ${userId}, ADMIN_ID: ${process.env.ADMIN_ID}`
  );
  const postMessage = await createAndSendMessage(
    bot,
    CHANNEL_ID,
    userState,
    userId
  );
  return postMessage;
}

async function requestApproval(bot, userId, users) {
  const userInfo = await bot.getChat(userId);
  let username = userInfo.username || "undefined";
  let displayName = username;

  if (username === "undefined") {
    displayName = `[ID: ${userId}](tg://user?id=${userId})`;
  } else {
    // Экранируем символы "_" в username
    displayName = `@${username.replace(/_/g, "\\_")}`;
  }

  // Получаем состояние пользователя
  const userState = users[userId];

  // Отправляем пост администратору для проверки
  const postMessage = await createAndSendMessage(
    bot,
    ADMIN_ID,
    userState,
    userId
  );

  // Кнопки для одобрения или отклонения
  const approveButton = {
    text: "Одобрить",
    callback_data: `approve_${userId}`,
  };
  const rejectButton = {
    text: "Отклонить",
    callback_data: `reject_${userId}`,
  };
  const replyMarkup = {
    inline_keyboard: [[approveButton, rejectButton]],
  };

  // Сообщение с запросом на одобрение
  const message = `Пользователь ${displayName} хочет опубликовать этот микс. Одобрить или отклонить?`;

  // Отправляем сообщение администратору
  await bot.sendMessage(ADMIN_ID, message, {
    parse_mode: "Markdown",
    reply_markup: replyMarkup,
  });
}

async function notifyAdminAboutPost(bot, userId, postMessage) {
  const userInfo = await bot.getChat(userId);
  let username = userInfo.username || "undefined";
  let displayName = username;

  if (username === "undefined") {
    displayName = `[ID: ${userId}](tg://user?id=${userId})`;
  } else {
    // Экранируем символы "_" в username
    displayName = `@${username.replace(/_/g, "\\_")}`;
  }

  const publicChannelId = CHANNEL_ID.replace("-100", "c/");
  const postLink = `https://t.me/${publicChannelId}/${postMessage.message_id}`;

  const message =
    username === "undefined"
      ? `Пользователь ${displayName} опубликовал [пост](${postLink})`
      : `Пользователь ${displayName} опубликовал [пост](${postLink})`;

  const blockButton = {
    text: "Заблокировать",
    callback_data: `block_${userId}`,
  };
  const replyMarkup = {
    inline_keyboard: [[blockButton]],
  };

  await bot.sendMessage(ADMIN_ID, message, {
    parse_mode: "Markdown",
    reply_markup: replyMarkup,
  });
}

function resetUserState(users, userId, bot, chatId) {
  if (!users[userId].language) {
    selectLanguage(bot, chatId);
  } else {
    updateUserState(users, userId, {
      hasLink: null,
      hasAudio: null,
      hasText: null,
      hasImage: null,
      linkStatus: null,
      isGroup: false,
      lastMessageTime: 0,
      timerStarted: false,
      messagesSent: false,
      messageIds: [],
    });
  }
}
