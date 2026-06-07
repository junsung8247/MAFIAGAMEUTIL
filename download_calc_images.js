const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = "https://xn--2v5bo7x.com";

const imagesToDownload = [
    {
        url: `${BASE_URL}/static/images/GameResources/etc/%ED%97%A4%EB%A5%B4%EB%A9%94%EC%8A%A4%EC%9D%98%20%EC%97%BD%EC%84%9C%EA%B0%80%EB%B0%A9.webp`,
        dest: 'static/images/GameResources/etc/헤르메스의 엽서가방.webp'
    },
    {
        url: `${BASE_URL}/static/images/GameResources/Duelcard/6%ED%8B%B0%EC%96%B4%20%EC%B9%B4%EB%93%9C.webp`,
        dest: 'static/images/GameResources/Duelcard/6티어 카드.webp'
    },
    {
        url: `${BASE_URL}/static/images/GameResources/Postcard/%EC%9D%BC%EB%B0%98%20%EC%97%BD%EC%84%9C.webp`,
        dest: 'static/images/GameResources/Postcard/일반 엽서.webp'
    },
    {
        url: `${BASE_URL}/static/images/GameResources/Postcard/%EA%B6%8C%EC%9C%84%EC%9D%98%20%EC%97%BD%EC%84%9C.webp`,
        dest: 'static/images/GameResources/Postcard/권위의 엽서.webp'
    }
];

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

                // 폴더 자동 생성
                fs.mkdirSync(path.dirname(filepath), { recursive: true });

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
    console.log("[-] 계산기용 게임 리소스 이미지 다운로드 중...");
    for (const item of imagesToDownload) {
        const success = await downloadFile(item.url, item.dest);
        if (success) {
            console.log(`[+] 다운로드 성공: ${item.dest}`);
        } else {
            console.log(`[!] 다운로드 실패: ${item.dest}`);
        }
    }
    console.log("[+] 완료.");
}

main();
