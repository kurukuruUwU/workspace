const fs = require("fs");
const path = require("path");
const axios = require("axios");

const championsFolderPath = path.join(__dirname, "champions");

// Tạo thư mục nếu chưa tồn tại
if (!fs.existsSync(championsFolderPath)) {
    fs.mkdirSync(championsFolderPath);
}

// Hàm lấy dữ liệu tướng từ file hoặc API
async function getChampionDetails(championId, language = "en") {
    const filePath = path.join(
        championsFolderPath,
        `${championId.toLowerCase()}_${language === "en" ? "en" : "vi"}.json`
    );

    // Kiểm tra file đã tồn tại hay chưa
    if (fs.existsSync(filePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
            return data;
        } catch (error) {
            console.error("Error reading champion file:", error);
        }
    }

    // Nếu chưa tồn tại, gọi API và lưu dữ liệu
    const version = "14.23.1"; // Dùng hàm lấy phiên bản mới nhất nếu cần
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/${
        language === "en" ? "en_US" : "vi_VN"
    }/champion/${championId}.json`;

    try {
        const response = await axios.get(url);
        const championData = response.data.data[championId];

        // Lưu dữ liệu vào file theo ngôn ngữ
        fs.writeFileSync(filePath, JSON.stringify(championData, null, 2));
        console.log(`Champion data saved for ${championId} (${language}).`);
        return championData;
    } catch (error) {
        console.error("Error fetching champion details:", error);
        return null;
    }
}

module.exports = { getChampionDetails };
