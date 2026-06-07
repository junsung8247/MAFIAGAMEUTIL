const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = "https://xn--2v5bo7x.com";

const categories = [
    'Level',
    'Fame',
    'RP',
    'Rate',
    'Heart',
    'Mentor',
    'Guild',
    'Jewel',
    'Frame',
    'NameTag',
    'Collection',
    'Skin',
    'RoleBadge',
    'Header',
    'ProfileBackground'
];

// 디렉토리 구조 생성
function initDirectories() {
    fs.mkdirSync('static/images/ProfileCustomizer', { recursive: true });
    for (const cat of categories) {
        fs.mkdirSync(path.join('static/images/ProfileCustomizer', cat), { recursive: true });
    }
}

function downloadFile(url, filepath) {
    return new Promise((resolve) => {
        try {
            const finalUrl = new URL(url);
            https.get(finalUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            }, (res) => {
                if (res.statusCode !== 200) {
                    resolve(false);
                    return;
                }

                const fileStream = fs.createWriteStream(filepath);
                res.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve(true);
                });

                fileStream.on('error', () => resolve(false));
            }).on('error', () => resolve(false));
        } catch (e) {
            resolve(false);
        }
    });
}

async function main() {
    initDirectories();
    console.log("[-] 프로필 커스터마이저 자산 수집을 시작합니다...");

    // selectNone.webp 다운로드
    await downloadFile(`${BASE_URL}/static/images/ProfileCustomizer/selectNone.webp`, `static/images/ProfileCustomizer/selectNone.webp`);

    const allCategoryItems = {};

    for (const cat of categories) {
        const listUrl = `${BASE_URL}/get_items/profile/${cat}`;
        const listPath = `data/profile_items_${cat}.json`;

        // data 폴더 확인
        fs.mkdirSync('data', { recursive: true });

        console.log(`[-] 카테고리 [${cat}] 아이템 목록 수집 중...`);
        const success = await downloadFile(listUrl, listPath);

        if (success) {
            try {
                const items = JSON.parse(fs.readFileSync(listPath, 'utf8'));
                allCategoryItems[cat] = items;
                console.log(`[+] [${cat}] 총 ${items.length}개 아이템 발견.`);

                // 각 아이템 이미지 다운로드
                let count = 0;
                const CHUNK_SIZE = 15;

                for (let i = 0; i < items.length; i += CHUNK_SIZE) {
                    const chunk = items.slice(i, i + CHUNK_SIZE);
                    const promises = chunk.map(async (item) => {
                        if (item === '_none.webp') return; // 기본값 패스
                        const imgUrl = `${BASE_URL}/static/images/ProfileCustomizer/${cat}/${item}`;
                        const imgPath = `static/images/ProfileCustomizer/${cat}/${item}`;

                        if (fs.existsSync(imgPath)) {
                            count++;
                            return;
                        }

                        const downloaded = await downloadFile(imgUrl, imgPath);
                        if (downloaded) {
                            count++;
                        }
                    });
                    await Promise.all(promises);
                }
                console.log(`[+] [${cat}] 이미지 다운로드 완료: ${count}/${items.length}`);
            } catch (err) {
                console.log(`[!] [${cat}] JSON 파싱 오류: ${err.message}`);
            }
        } else {
            console.log(`[!] [${cat}] 목록 다운로드 실패.`);
        }
    }

    // 통합 프로필 자산 맵 파일 생성
    fs.writeFileSync('data/profile_assets_map.json', JSON.stringify(allCategoryItems, null, 2), 'utf8');
    console.log("[+] 프로필 에셋 맵 생성 완료: data/profile_assets_map.json");
    console.log("[+] 모든 프로필 자산 다운로드 완료!");
}

main();
