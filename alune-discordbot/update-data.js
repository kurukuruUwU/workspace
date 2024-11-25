const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Map tags sang tiếng Việt
const TAG_TRANSLATIONS = {
    Fighter: 'Đấu Sĩ',
    Tank: 'Đỡ Đòn',
    Assassin: 'Sát Thủ',
    Mage: 'Pháp Sư',
    Marksman: 'Xạ Thủ',
    Support: 'Hỗ Trợ',
};

// Hàm lấy phiên bản mới nhất
async function getLatestVersion() {
    const versionUrl = 'https://ddragon.leagueoflegends.com/api/versions.json';
    try {
        const response = await axios.get(versionUrl);
        const versions = response.data;
        return versions[0]; // Lấy phiên bản mới nhất
    } catch (error) {
        console.error('Lỗi khi lấy phiên bản mới nhất:', error);
        return null;
    }
}

// Hàm tải và lưu dữ liệu tướng
async function updateChampionData() {
    const latestVersion = await getLatestVersion();
    if (!latestVersion) {
        console.error('Không thể lấy phiên bản mới nhất.');
        return;
    }

    const DATA_DRAGON_URLS = {
        en: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`,
        vi: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/vi_VN/champion.json`,
    };

    try {
        console.log('Đang tải dữ liệu tướng tiếng Anh...');
        const responseEn = await axios.get(DATA_DRAGON_URLS.en);
        const dataEn = responseEn.data;

        const filePathEn = path.join(__dirname, 'data', 'champion_en.json');
        if (!fs.existsSync(path.dirname(filePathEn))) {
            fs.mkdirSync(path.dirname(filePathEn), { recursive: true });
        }
        fs.writeFileSync(filePathEn, JSON.stringify(dataEn, null, 2));
        console.log('Dữ liệu tướng tiếng Anh đã được lưu.');

        console.log('Đang tải dữ liệu tướng tiếng Việt...');
        const responseVi = await axios.get(DATA_DRAGON_URLS.vi);
        const dataVi = responseVi.data;

        for (const champKey in dataVi.data) {
            const champ = dataVi.data[champKey];
            champ.tags = champ.tags.map(tag => TAG_TRANSLATIONS[tag] || tag);
        }

        const filePathVi = path.join(__dirname, 'data', 'champion_vi.json');
        fs.writeFileSync(filePathVi, JSON.stringify(dataVi, null, 2));
        console.log('Dữ liệu tướng tiếng Việt đã được lưu.');
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
    }
}

// Chạy hàm nếu file này được gọi trực tiếp
if (require.main === module) {
    updateChampionData();
}

module.exports = updateChampionData;
