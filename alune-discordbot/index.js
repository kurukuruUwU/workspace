const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActivityType,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const updateChampionData = require("./update-data");

const userLangFilePath = path.join(__dirname, "data", "user_lang.json");

// Hàm đọc và ghi tệp user_lang.json
function loadUserLanguages() {
  if (fs.existsSync(userLangFilePath)) {
    return JSON.parse(fs.readFileSync(userLangFilePath, "utf8"));
  }
  return {};
}

function saveUserLanguages(userLanguages) {
  fs.writeFileSync(userLangFilePath, JSON.stringify(userLanguages, null, 2));
}

const userLanguages = loadUserLanguages();

function getChampionData(language = "en") {
  const filePath = path.join(
    __dirname,
    "data",
    language === "en" ? "champion_en.json" : "champion_vi.json"
  );
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data).data;
  } else {
    console.error(`File dữ liệu ${language} không tồn tại.`);
    return null;
  }
}

function getRandomChampion(role = null, language = "en") {
  const champions = getChampionData(language);
  if (!champions) {
    console.error("Dữ liệu tướng không tồn tại.");
    return null;
  }

  // RoleMap tùy theo ngôn ngữ
  const roleMap =
    language === "en"
      ? {
          top: ["Fighter", "Tank"],
          jungle: ["Assassin", "Fighter"],
          mid: ["Mage", "Assassin"],
          bot: ["Marksman"],
          support: ["Support", "Tank"],
        }
      : {
          top: ["Đấu Sĩ", "Đỡ Đòn"],
          jungle: ["Sát Thủ", "Đấu Sĩ"],
          mid: ["Pháp Sư", "Sát Thủ"],
          bot: ["Xạ Thủ"],
          support: ["Hỗ Trợ", "Đỡ Đòn"],
        };

  if (role) {
    const validRoles = roleMap[role];
    if (!validRoles) {
      console.error(`Vai trò không hợp lệ: ${role}`);
      return null;
    }

    const filteredChampions = Object.values(champions).filter((champ) =>
      champ.tags.some((tag) => validRoles.includes(tag))
    );

    if (filteredChampions.length === 0) {
      console.warn(
        `Không tìm thấy tướng nào cho vai trò '${role}' (${language})`
      );
      return null;
    }

    return filteredChampions[
      Math.floor(Math.random() * filteredChampions.length)
    ];
  }

  const keys = Object.keys(champions);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return champions[randomKey];
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  {
    name: "random",
    description: "Lấy ngẫu nhiên một tướng Liên Minh Huyền Thoại",
    options: [
      {
        name: "role",
        type: 3,
        description:
          "Vị trí muốn lấy ngẫu nhiên (top, jungle, mid, bot, support)",
        required: false,
        choices: [
          { name: "Top", value: "top" },
          { name: "Jungle", value: "jungle" },
          { name: "Mid", value: "mid" },
          { name: "Bot", value: "bot" },
          { name: "Support", value: "support" },
        ],
      },
    ],
  },
  {
    name: "champion",
    description: "Thông tin chi tiết về vị tướng",
    options: [
      {
        name: "name",
        type: 3,
        description: "Enter the champion's name",
        required: true,
        autocomplete: true, // Hỗ trợ gợi ý autocomplete
      },
    ],
  },
  {
    name: "language",
    description: "Chọn ngôn ngữ hiển thị",
    options: [
      {
        name: "lang",
        type: 3,
        description: "Ngôn ngữ (en hoặc vi)",
        required: true,
        choices: [
          { name: "English", value: "en" },
          { name: "Vietnamese", value: "vi" },
        ],
      },
    ],
  },
];

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log("Đang đăng ký lệnh Slash Command...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("Đăng ký lệnh thành công.");
  } catch (error) {
    console.error("Lỗi khi đăng ký lệnh:", error);
  }
}

client.once("ready", () => {
  console.log(`Bot đã sẵn sàng! Đăng nhập với tên: ${client.user.tag}`);
  client.user.setPresence({
    activities: [
      {
        name: "League Of Legends",
        type: ActivityType.Playing, // Loại hoạt động, có thể là 'PLAYING', 'STREAMING', 'LISTENING', 'WATCHING'
      },
    ],
    status: "online", // Trạng thái có thể là 'online', 'idle', 'dnd', hoặc 'invisible'
  });
});
const { getChampionDetails } = require("./champion-data");

client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
    const focusedValue = interaction.options.getFocused();
    const language = userLanguages[interaction.user.id] || "en";
    const champions = getChampionData(language);

    const filteredChampions = Object.keys(champions)
      .filter((key) =>
        champions[key].name.toLowerCase().startsWith(focusedValue.toLowerCase())
      )
      .slice(0, 25);

    await interaction.respond(
      filteredChampions.map((key) => ({
        name: champions[key].name,
        value: champions[key].id,
      }))
    );
  }

  if (interaction.isChatInputCommand()) {
    const { commandName, options, user, locale } = interaction;

    if (!userLanguages[user.id]) {
      userLanguages[user.id] = locale.startsWith("vi") ? "vi" : "en";
      saveUserLanguages(userLanguages);
    }

    if (commandName === "random") {
      const role = options.getString("role");
      const language = userLanguages[user.id];
      const champion = getRandomChampion(role, language);

      if (champion) {
        const embed = {
          color: 0xb6d0e2,
          title: role ? `${champion.name}` : champion.name,
          description: champion.title,
          thumbnail: {
            url: `https://ddragon.leagueoflegends.com/cdn/13.6.1/img/champion/${champion.id}.png`,
          },
          image: {
            url: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion.id}_0.jpg`,
          },
          fields: [
            {
              name: language === "en" ? "Role" : "Vai trò",
              value: champion.tags.join(", "),
              inline: true,
            },
            {
              name: language === "en" ? "Blurb" : "Mô tả",
              value: champion.blurb,
            },
          ],
        };

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`random_again_${role || ""}`)
            .setLabel(language === "en" ? "Random Again" : "Ngẫu nhiên lại")
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
      } else {
        await interaction.reply({
          content: role
            ? `Không tìm thấy tướng nào cho vị trí ${role}.`
            : "Dữ liệu tướng chưa được tải.",
          ephemeral: true,
        });
      }
    }

    if (commandName === "champion") {
      const championId = options.getString("name");
      const language = userLanguages[user.id] || "en";

      // Lấy dữ liệu từ file hoặc API
      const detailedChampion = await getChampionDetails(championId, language);

      if (!detailedChampion) {
        await interaction.reply({
          content: "Could not fetch champion data.",
          ephemeral: true,
        });
        return;
      }

      // Tạo embed với dữ liệu chi tiết
      const embed = {
        color: 0xb6d0e2,
        title: detailedChampion.name,
        description: detailedChampion.title,
        thumbnail: {
          url: `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/champion/${championId}.png`,
        },
        image: {
          url: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championId}_0.jpg`,
        },
        fields: [
          {
            name: language === "en" ? "Role" : "Vai trò",
            value: detailedChampion.tags.join(", "),
            inline: true,
          },
          {
            name: language === "en" ? "Blurb" : "Mô tả",
            value: detailedChampion.lore || "Không có mô tả chi tiết.",
          },
        ],
      };

      await interaction.reply({ embeds: [embed] });
    }

    if (commandName === "language") {
      const lang = options.getString("lang");
      userLanguages[user.id] = lang;
      saveUserLanguages(userLanguages);

      const embed = {
        color: 0xb6d0e2,
        title: lang === "en" ? "Language Updated" : "Cập nhật ngôn ngữ",
        description:
          lang === "en"
            ? "Your language has been updated to **English** 🇬🇧."
            : "Ngôn ngữ của bạn đã được cập nhật sang **Tiếng Việt** 🇻🇳.",
        color: lang === "en" ? 0x007bff : 0xff4500,
        thumbnail: {
          url:
            lang === "en"
              ? "https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_Kingdom.svg"
              : "https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Vietnam.svg",
        },
      };

      await interaction.reply({ embeds: [embed] });
    }
  }

  if (interaction.isButton()) {
    const [action, role] = interaction.customId.split("_").slice(1);

    if (action === "again") {
      const language = userLanguages[interaction.user.id] || "en";
      const champion = getRandomChampion(role === "" ? null : role, language);

      if (champion) {
        const embed = {
          color: 0xb6d0e2,
          title: role
            ? `${role.toUpperCase()} | ${champion.name}`
            : champion.name,
          description: champion.title,
          thumbnail: {
            url: `https://ddragon.leagueoflegends.com/cdn/13.6.1/img/champion/${champion.id}.png`,
          },
          image: {
            url: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion.id}_0.jpg`,
          },
          fields: [
            {
              name: language === "en" ? "Role" : "Vai trò",
              value: champion.tags.join(", "),
              inline: true,
            },
            {
              name: language === "en" ? "Blurb" : "Mô tả",
              value: champion.blurb,
            },
          ],
        };

        await interaction.update({ embeds: [embed] });
      } else {
        await interaction.update({
          content: "Không thể random lại.",
          components: [],
        });
      }
    }
  }
});

(async () => {
  console.log("Đang cập nhật dữ liệu tướng trước khi khởi động bot...");
  await updateChampionData();
  await registerCommands();
  client.login(process.env.DISCORD_TOKEN);
})();
