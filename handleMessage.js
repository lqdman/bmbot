const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { getMessage } = require("./language");
const { escapeMarkdown } = require("./utils");

const forbiddenLinksFilePath = path.join(__dirname, "forbiddenLinks.json");

async function handleMessage(msg, users, userId, updateUserState, bot) {
  const chatId = msg.chat.id;
  const text = msg.text || msg.caption;

  let forbiddenPrefixesList = [];
  if (fs.existsSync(forbiddenLinksFilePath)) {
    forbiddenPrefixesList = JSON.parse(fs.readFileSync(forbiddenLinksFilePath));
  }

  try {
    if (msg.audio) {
      const audioDescription = msg.audio.title || msg.audio.performer || "";
      const linksFromAudio = extractLinks(audioDescription);
      const linksFromText = extractLinks(
        text,
        msg.entities || msg.caption_entities
      );
      const allLinks = [...linksFromAudio, ...linksFromText];

      if (allLinks.length > 0) {
        const selectedLink = selectPreferredLink(allLinks);
        if (
          isForbiddenLink(selectedLink, forbiddenPrefixesList) ||
          isTelegramBotLink(selectedLink)
        ) {
          await bot.sendMessage(
            chatId,
            getMessage("forbiddenLink", users[userId].language)
          );
          return;
        }
        const linkStatus = await checkVkEntityStatus(selectedLink);
        updateUserState(users, userId, {
          hasLink: selectedLink,
          hasAudio: msg.audio.file_id,
          linkStatus: linkStatus,
        });
      } else {
        updateUserState(users, userId, { hasAudio: msg.audio.file_id });
      }
    } else if (msg.photo) {
      const photo = msg.photo[msg.photo.length - 1];
      updateUserState(users, userId, {
        hasImage: photo.file_id, // Сохраняем file_id изображения
      });
      console.log("[DEBUG] Изображение получено. file_id:", photo.file_id); // Логирование
    } else if (text) {
      const entities = msg.entities || msg.caption_entities;
      const links = extractLinks(text, entities);

      if (links.length > 0) {
        const selectedLink = selectPreferredLink(links);
        if (
          isForbiddenLink(selectedLink, forbiddenPrefixesList) ||
          isTelegramBotLink(selectedLink)
        ) {
          await bot.sendMessage(
            chatId,
            getMessage("forbiddenLink", users[userId].language)
          );
          return;
        }
        const linkStatus = await checkVkEntityStatus(selectedLink);
        updateUserState(users, userId, {
          hasLink: selectedLink,
          linkStatus: linkStatus,
        });
      } else {
        updateUserState(users, userId, {
          hasText: escapeMarkdown(text),
        });
      }
    }
  } catch (error) {
    console.error("Ошибка обработки сообщения:", error);
  }
}

function isForbiddenLink(link, forbiddenPrefixes) {
  return forbiddenPrefixes.some((prefix) => link.startsWith(prefix));
}

function isTelegramBotLink(link) {
  return /https:\/\/t\.me\/[a-zA-Z0-9_]+bot(\?[\w=&]+)?$/.test(link);
}

function extractLinks(text, entities) {
  const links = [];
  if (!text) return links;

  if (entities) {
    entities.forEach((entity) => {
      if (entity.type === "url") {
        const url = text.substring(
          entity.offset,
          entity.offset + entity.length
        );
        links.push(url);
      } else if (entity.type === "text_link") {
        links.push(entity.url);
      }
    });
  }

  const urlRegex = /https?:\/\/[^\s]+/g;
  const foundLinks = text.match(urlRegex) || [];
  links.push(...foundLinks);

  return links;
}

function selectPreferredLink(links) {
  const soundcloudLink = links.find((link) => link.includes("soundcloud.com"));
  return soundcloudLink || links[0];
}

async function checkVkEntityStatus(link) {
  if (!link.includes("vk.com")) return "open";

  const accessToken = process.env.VK_ACCESS_TOKEN;
  const entityId = link.split("/").pop().split(/[?#]/)[0];

  console.log("[DEBUG] Проверяемая ссылка:", link);
  console.log("[DEBUG] Извлеченный entityId:", entityId);

  try {
    const response = await axios.get(
      `https://api.vk.com/method/utils.resolveScreenName?screen_name=${entityId}&access_token=${accessToken}&v=5.131`
    );

    console.log("[DEBUG] Ответ VK API:", response.data);

    if (response.data.error) {
      console.error("[ERROR] Ошибка VK API:", response.data.error);
      return "error";
    }

    const data = response.data.response;

    // Обработка для пользователей
    if (data.type === "user") {
      return data.object?.deactivated ? "deleted" : "open";
    }

    // Обработка для групп
    if (data.type === "group") {
      return data.object?.is_closed ? "closed" : "open";
    }

    return "open";
  } catch (error) {
    console.error("[ERROR] Ошибка запроса к VK API:", error.message);
    return "error";
  }
}

module.exports = {
  handleMessage,
  isForbiddenLink,
  isTelegramBotLink,
  extractLinks,
  selectPreferredLink,
  checkVkEntityStatus,
};
