const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = "https://xn--2v5bo7x.com";

// 폴더 구조 생성
const PATHS = [
    "static/css",
    "static/js",
    "static/images",
    "static/images/EquipImage",
    "data/events"
];

function createDirectories() {
    console.log("[-] 디렉토리를 생성하는 중...");
    for (const p of PATHS) {
        fs.mkdirSync(p, { recursive: true });
    }
    console.log("[+] 디렉토리 생성 완료.");
}

function downloadFile(url, filepath) {
    return new Promise((resolve) => {
        try {
            const finalUrl = new URL(url);

            https.get(finalUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            }, (res) => {
                if (res.statusCode !== 200) {
                    console.log(`[!] 다운로드 실패 (${res.statusCode}): ${url}`);
                    resolve(false);
                    return;
                }

                const fileStream = fs.createWriteStream(filepath);
                res.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`[+] 다운로드 성공: ${filepath}`);
                    resolve(true);
                });

                fileStream.on('error', (err) => {
                    console.log(`[!] 파일 쓰기 실패: ${filepath} -> ${err.message}`);
                    resolve(false);
                });
            }).on('error', (err) => {
                console.log(`[!] 네트워크 연결 실패: ${url} -> ${err.message}`);
                resolve(false);
            });
        } catch (e) {
            console.log(`[!] URL 파싱 실패: ${url} -> ${e.message}`);
            resolve(false);
        }
    });
}

function replaceColonOnItemName(name) {
    return name.replace(/ : /g, '-').replace(/: /g, '-').replace(/:/g, '-');
}

async function main() {
    createDirectories();

    // 1. CSS 파일 다운로드
    const cssFiles = [
        "style.css",
        "common-modern.css",
        "darkmode.css",
        "randbox.css",
        "modern-index.css",
        "alerts.css"
    ];
    console.log("\n[-] CSS 파일 다운로드 중...");
    for (const css of cssFiles) {
        await downloadFile(`${BASE_URL}/static/css/${css}`, `static/css/${css}`);
    }

    // 2. JS 파일 다운로드
    const jsFiles = [
        "darkmode.js",
        "common-modern.js",
        "auth.js",
        "randbox.js"
    ];
    console.log("\n[-] JS 파일 다운로드 중...");
    for (const js of jsFiles) {
        await downloadFile(`${BASE_URL}/static/js/${js}`, `static/js/${js}`);
    }

    // 3. 기타 공통 에셋 다운로드
    console.log("\n[-] 기본 에셋 다운로드 중...");
    await downloadFile(`${BASE_URL}/static/images/favicon.ico`, "static/images/favicon.ico");
    await downloadFile(`${BASE_URL}/static/images/noimg.webp`, "static/images/noimg.webp");

    // 4. 이벤트 목록 다운로드
    console.log("\n[-] 이벤트 목록 다운로드 중...");
    const listSuccess = await downloadFile(`${BASE_URL}/list_event_files`, "data/events.json");

    if (listSuccess) {
        const events = JSON.parse(fs.readFileSync("data/events.json", "utf8"));
        const uniqueItems = new Set();

        console.log("\n[-] 개별 이벤트 상세 데이터 수집 중...");
        for (const ev of events) {
            const eventId = ev.id;
            const eventUrl = `${BASE_URL}/get_event_data/${eventId}`;
            const eventPath = `data/events/${eventId}.json`;

            const success = await downloadFile(eventUrl, eventPath);
            if (success) {
                try {
                    const eventData = JSON.parse(fs.readFileSync(eventPath, "utf8"));
                    for (const box of eventData.boxes || []) {
                        for (const item of box.items || []) {
                            if (item.name) {
                                uniqueItems.add(item.name);
                            }
                        }
                    }
                } catch (e) {
                    console.log(`[!] ${eventId} JSON 파싱 실패: ${e.message}`);
                }
            }
        }

        console.log(`\n[+] 수집 완료. 고유 아이템 개수: ${uniqueItems.size}`);
        console.log("[-] 아이템 이미지 다운로드 시작...");

        let successCount = 0;
        const itemArray = Array.from(uniqueItems);
        
        // 너무 많은 요청을 동시에 보내서 에러가 나지 않도록 순차 처리하되, 속도를 위해 청크 단위로 병렬 수행
        const CHUNK_SIZE = 10;
        for (let i = 0; i < itemArray.length; i += CHUNK_SIZE) {
            const chunk = itemArray.slice(i, i + CHUNK_SIZE);
            const promises = chunk.map(async (name) => {
                const imgFilename = replaceColonOnItemName(name);
                const imgUrl = `${BASE_URL}/static/images/EquipImage/${imgFilename}.webp`;
                const imgPath = `static/images/EquipImage/${imgFilename}.webp`;

                if (fs.existsSync(imgPath)) {
                    successCount++;
                    return;
                }

                const downloaded = await downloadFile(imgUrl, imgPath);
                if (downloaded) {
                    successCount++;
                }
            });
            await Promise.all(promises);
        }

        console.log(`\n[+] 모든 리소스 다운로드 완료! 총 ${uniqueItems.size}개 중 ${successCount}개 이미지 확보 완료.`);
    } else {
        console.log("[!] 이벤트 목록 수집 실패.");
    }
}

main();
