const { handleMessage } = require("./handleMessage");
const { initializeUser, updateUserState } = require("./userState");
const {
  deleteUserMessages,
  sendUserStateMessages,
  checkUserPostState,
} = require("./utils");
const { messages } = require("./language");

module.exports = {
  handleMessageEvent: async (bot, users, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const currentTime = msg.date * 1000;

    // Инициализация пользователя, если не существует
    initializeUser(users, userId);

    // Проверка блокировки пользователя
    if (users[userId].isBlocked) {
      await bot.sendMessage(
        chatId,
        messages.blockedMessage[users[userId].language]
      );
      return;
    }

    // Обновление состояния пользователя
    const timeDifference = currentTime - users[userId].lastMessageTime;
    const isGroup = timeDifference < 500;

    updateUserState(users, userId, {
      isGroup: isGroup,
      lastMessageTime: currentTime,
      messagesSent: false,
    });

    // Удаление предыдущих сообщений
    await deleteUserMessages(bot, chatId, users, userId);

    // Пропуск обработки команды /start
    if (msg.text === "/start") return;

    // Пропуск обработки других команд
    if (msg.text?.startsWith("/")) return;

    // Обработка основного сообщения
    await handleMessage(msg, users, userId, updateUserState, bot);

    // Запуск таймера для отправки состояния
    if (!users[userId].timerStarted) {
      updateUserState(users, userId, { timerStarted: true });
      setTimeout(async () => {
        const messagesSent = await sendUserStateMessages(
          bot,
          chatId,
          users,
          userId
        );
        updateUserState(users, userId, {
          timerStarted: false,
          messagesSent,
        });

        if (messagesSent) {
          await checkUserPostState(bot, chatId, users, userId);
        }
      }, 1000);
    }
  },
};
