const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const { commandName, options, user, locale } = interaction;

    // Lưu ngôn ngữ mặc định theo locale nếu chưa có
    if (!userLanguages[user.id]) {
      userLanguages[user.id] = locale.startsWith("vi") ? "vi" : "en";
      saveUserLanguages(userLanguages);
    }

    if (commandName === "random") {
      const role = options.getString("role"); // Vai trò được chọn (nếu có)
      const language = userLanguages[user.id]; // Lấy ngôn ngữ của người dùng
      const champion = getRandomChampion(role, language); // Random tướng theo role và ngôn ngữ

      if (champion) {
        // Tạo Embed chứa thông tin tướng
        const embed = {
          title: champion.name,
          description: champion.title,
          thumbnail: {
            url: `https://ddragon.leagueoflegends.com/cdn/13.6.1/img/champion/${champion.id}.png`, // Thumbnail: Icon tướng
          },
          image: {
            url: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion.id}_0.jpg`, // Ảnh lớn: Splash tướng
          },
          fields: [
            {
              name: language === "en" ? "Role" : "Vai trò",
              value: champion.tags.join(", "), // Vai trò theo ngôn ngữ
              inline: true,
            },
            {
              name: language === "en" ? "Blurb" : "Mô tả",
              value: champion.blurb, // Blurb theo ngôn ngữ
            },
          ],
        };

        // Tạo nút "Random Again"
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`random_again_${role || "any"}`) // CustomId bao gồm role
            .setLabel(language === "en" ? "Random Again" : "Ngẫu nhiên lại") // Nhãn theo ngôn ngữ
            .setStyle(ButtonStyle.Primary) // Nút màu xanh
        );

        // Gửi Embed và nút cho người dùng
        await interaction.reply({ embeds: [embed], components: [row] });
      } else {
        await interaction.reply(
          role
            ? `Không tìm thấy tướng nào cho vị trí ${role}.`
            : "Dữ liệu tướng chưa được tải."
        );
      }
    }

    if (commandName === "language") {
      const lang = options.getString("lang");
      userLanguages[user.id] = lang;
      saveUserLanguages(userLanguages);

      // Embed thông báo
      const embed = {
        title: lang === "en" ? "Language Updated" : "Cập nhật ngôn ngữ",
        description:
          lang === "en"
            ? "Your language has been updated to **English** 🇬🇧."
            : "Ngôn ngữ của bạn đã được cập nhật sang **Tiếng Việt** 🇻🇳.",
        color: lang === "en" ? 0x007bff : 0xff4500, // Màu xanh cho tiếng Anh, đỏ cam cho tiếng Việt
        thumbnail: {
          url:
            lang === "en"
              ? "https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_Kingdom.svg"
              : "https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Vietnam.svg",
        },
      };

      // Gửi embed
      await interaction.reply({ embeds: [embed] });
    }
  }

  // Xử lý sự kiện nút "Random Again"
  if (interaction.isButton()) {
    const [action, role] = interaction.customId.split("_").slice(1); // Lấy hành động và role từ CustomId

    if (action === "again") {
      const language = userLanguages[interaction.user.id] || "en"; // Ngôn ngữ mặc định nếu không có
      const champion = getRandomChampion(
        role === "any" ? null : role,
        language
      ); // Random lại

      if (champion) {
        // Tạo Embed mới chứa thông tin tướng
        const embed = {
          title: champion.name,
          description: champion.title,
          thumbnail: {
            url: `https://ddragon.leagueoflegends.com/cdn/13.6.1/img/champion/${champion.id}.png`, // Thumbnail: Icon tướng
          },
          image: {
            url: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion.id}_0.jpg`, // Ảnh lớn: Splash tướng
          },
          fields: [
            {
              name: language === "en" ? "Role" : "Vai trò",
              value: champion.tags.join(", "), // Vai trò theo ngôn ngữ
              inline: true,
            },
            {
              name: language === "en" ? "Blurb" : "Mô tả",
              value: champion.blurb, // Blurb theo ngôn ngữ
            },
          ],
        };

        // Cập nhật Embed mới trong tin nhắn
        await interaction.update({ embeds: [embed] });
      } else {
        // Thông báo nếu random thất bại
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
