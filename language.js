const messages = {
  welcome: {
    en: "Language selected. Welcome!",
    ru: "Язык выбран. Добро пожаловать!",
  },
  sendCover: {
    en: "Great, you need a cover for the mix",
    ru: "Отлично, для микса нужна обложка",
  },
  sendLink: {
    en: "Send me a link to the mix or the mix page and the mix itself.",
    ru: "Пришли мне ссылку на микс или на страницу микса и сам микс.",
  },
  missingElements: {
    en: "Missing elements: ",
    ru: "Можно добавить ",
  },
  needToSend: {
    en: "Need to send ",
    ru: "Нужно прислать ",
  },
  canAdd: {
    en: "Can add ",
    ru: "Можно добавить ",
  },
  canPublish: {
    en: "You can publish the post with the current elements.",
    ru: "Пост готов к публикации.",
  },
  publishButton: {
    en: "Publish",
    ru: "Опубликовать",
  },
  schedulePostMessage: {
    en: "Send me the date and time when you want the post to be published in the format: dd.mm.yy hh:mm",
    ru: "Пришли мне дату и время в которое ты хочешь что бы пост был опубликован в формате: дд.мм.гг чч:мм",
  },
  postPublished: {
    en: "Post successfully published!",
    ru: "Пост успешно опубликован!\nДля нового раунда кликай /start",
  },
  notEnoughElements: {
    en: "Not enough elements to publish.",
    ru: "Недостаточно элементов для публикации.",
  },
  canPublishWithCurrentElements: {
    en: "You can publish the post with the current elements.",
    ru: "Пост готов к публикации, так же",
  },
  canPublishWithCurrentElements2: {
    en: "send me before you click publish",
    ru: "прислав мне прежде чем нажмешь опубликовать",
  },
  allElementsSent: {
    en: "You've sent all the post elements, just publish it.",
    ru: "Ты прислал все элементы поста, осталось опубликовать.",
  },
  approvalRequested: {
    en: "Your request for approval has been sent to the admin.",
    ru: "Ваш запрос на одобрение был отправлен администратору.",
  },
  approvalApproved: {
    en: "Your request has been approved. The post is now published.",
    ru: "Ваш запрос одобрен. Пост опубликован.",
  },
  approvalRejected: {
    en: "Your request has been rejected.",
    ru: "Ваш запрос отклонен.",
  },

  blockedMessage: {
    en: "You have been blocked. If this is a mistake, please contact @lqdamc.",
    ru: "Вы были заблокированы. Если это ошибка, свяжитесь с @lqdamc.",
  },

  mix: {
    en: "mix",
    ru: "микс",
  },
  cover: {
    en: "cover",
    ru: "обложку",
  },
  link: {
    en: "link",
    ru: "ссылку",
  },
  description: {
    en: "description",
    ru: "описание",
  },

  forbiddenLink: {
    en: "This type of link is not suitable for the post.",
    ru: "Этот тип ссылки не подходит для поста.",
  },

  unblockSuccess: {
    en: "✅ User {userId} unblocked",
    ru: "✅ Пользователь {userId} разблокирован",
  },
  userNotFound: {
    en: "❌ User not found",
    ru: "❌ Пользователь не найден",
  },
  adminOnly: {
    en: "❌ For admin only",
    ru: "❌ Административная команда",
  },

  forbiddenPrefixesUpdated: {
    en: "✅ Forbidden links list updated",
    ru: "✅ Список запрещенных ссылок обновлен",
  },
};

// Функция для получения сообщения на выбранном языке
function getMessage(key, language) {
  return messages[key][language] || messages[key].en;
}

// Функция для выбора языка
function selectLanguage(bot, chatId) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "English", callback_data: "/english" }],
      [{ text: "Русский", callback_data: "/russian" }],
    ],
  };
  bot.sendMessage(chatId, "Language / Язык", { reply_markup: keyboard });
}

module.exports = {
  getMessage,
  selectLanguage,
  messages,
};
