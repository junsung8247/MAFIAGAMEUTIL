// 마피아42 프로필 커스터마이저 스크립트

const BASE_ASSET_PATH = "/static/images/ProfileCustomizer";
let activeCategory = "ProfileBackground";
let currentSelections = {};
let allCategoryItems = {};

// 각 카테고리별 초기 기본 에셋 설정
const initialAssets = {
    ProfileBackground: "base_background.webp", // 기본값이 없다면 첫 에셋으로 세팅
    Skin: "base_skin.webp",
    Frame: "base_frame.webp",
    NameTag: "base_nametag.webp"
};

document.addEventListener('DOMContentLoaded', function() {
    initCategoryTabs();
    initInputs();
    loadCategoryItems(activeCategory, true); // 초기 로드
    initSearch();
});

// 1. 카테고리 탭 클릭 이벤트 바인딩
function initCategoryTabs() {
    const tabButtons = document.querySelectorAll('.cat-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const cat = this.getAttribute('data-category');
            activeCategory = cat;

            tabButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            loadCategoryItems(cat);
        });
    });
}

// 2. 텍스트 입력값 실시간 동기화
function initInputs() {
    const mappings = [
        { input: 'input-nickname', txt: 'txt-nickname' },
        { input: 'input-guild', txt: 'txt-guild' },
        { input: 'input-level', txt: 'txt-level', prefix: 'Lv.' },
        { input: 'input-fame', txt: 'txt-fame', prefix: '명성 ' },
        { input: 'input-rp', txt: 'txt-rp', prefix: 'RP ' },
        { input: 'input-rate', txt: 'txt-rate', prefix: '승률 ', suffix: '%' },
        { input: 'input-heart', txt: 'txt-heart', suffix: '개' }
    ];

    mappings.forEach(m => {
        const inpEl = document.getElementById(m.input);
        const txtEl = document.getElementById(m.txt);
        if (inpEl && txtEl) {
            // 초기 텍스트 설정
            updateText(inpEl.value, txtEl, m.prefix, m.suffix);

            // 실시간 이벤트
            inpEl.addEventListener('input', function() {
                updateText(this.value, txtEl, m.prefix, m.suffix);
            });
        }
    });
}

function updateText(val, el, prefix = '', suffix = '') {
    if (!val || val.trim() === '') {
        el.style.display = 'none';
    } else {
        el.style.display = 'block';
        el.innerText = `${prefix}${val}${suffix}`;
    }
}

// 3. 에셋 목록 API 조회 및 그리드 렌더링
function loadCategoryItems(category, isFirstLoad = false) {
    const grid = document.getElementById('assetsGrid');
    const loader = document.getElementById('items-loader');

    grid.innerHTML = '';
    loader.style.display = 'block';

    // 캐싱 처리
    if (allCategoryItems[category]) {
        loader.style.display = 'none';
        renderGrid(category, allCategoryItems[category], isFirstLoad);
        return;
    }

    fetch(`/get_items/profile/${category}`)
        .then(res => res.json())
        .then(items => {
            loader.style.display = 'none';
            // 정렬: _none.webp는 최상단
            allCategoryItems[category] = items;
            renderGrid(category, items, isFirstLoad);
        })
        .catch(err => {
            loader.style.display = 'none';
            grid.innerHTML = `<div class="w-100 text-center text-danger">에셋 데이터를 불러오지 못했습니다: ${err.message}</div>`;
        });
}

// 에셋 그리드 출력
function renderGrid(category, items, isFirstLoad) {
    const grid = document.getElementById('assetsGrid');
    grid.innerHTML = '';

    // 검색어 필터
    const searchVal = document.getElementById('asset-search').value.toLowerCase().trim();

    items.forEach(item => {
        // 검색 필터링
        const cleanName = getCleanItemName(item);
        if (searchVal && !cleanName.toLowerCase().includes(searchVal)) {
            return;
        }

        const card = document.createElement('div');
        card.className = 'asset-item-card';
        if (currentSelections[category] === item) {
            card.classList.add('selected');
        } else if (isFirstLoad && !currentSelections[category]) {
            // 최초 로드 시 기본값이거나 첫 번째 아이템 자동 선택
            if (item !== '_none.webp') {
                currentSelections[category] = item;
                card.classList.add('selected');
                updateCardLayer(category, item);
            }
        }

        // 아이콘 이미지
        const img = document.createElement('img');
        img.className = 'asset-item-img';
        
        if (item === '_none.webp') {
            img.src = `${BASE_ASSET_PATH}/selectNone.webp`;
        } else {
            img.src = `${BASE_ASSET_PATH}/${category}/${item}`;
        }
        
        img.onerror = function() {
            this.src = 'https://img.icons8.com/color/96/image.png'; // 대체 더미 이미지
        };

        // 이름 텍스트
        const nameEl = document.createElement('div');
        nameEl.className = 'asset-item-name';
        nameEl.innerText = cleanName;

        card.appendChild(img);
        card.appendChild(nameEl);

        // 클릭 이벤트
        card.addEventListener('click', function() {
            // 이전 선택 해제
            const siblings = grid.querySelectorAll('.asset-item-card');
            siblings.forEach(s => s.classList.remove('selected'));

            this.classList.add('selected');
            currentSelections[category] = item;

            updateCardLayer(category, item);
        });

        grid.appendChild(card);
    });

    if (grid.children.length === 0) {
        grid.innerHTML = '<div class="w-100 text-center text-muted my-4">검색 결과가 없습니다.</div>';
    }
}

// 파일명에서 읽기 쉬운 이름 추출
function getCleanItemName(filename) {
    if (filename === '_none.webp') return '선택 안 함';
    // 확장자 제거 및 언더바를 공백으로 교체
    let name = filename.replace(/\.[^/.]+$/, "");
    name = name.replace(/_/g, " ");
    return name;
}

// 4. 프로필 이미지 카드 레이어 소스 업데이트
function updateCardLayer(category, item) {
    const layer = document.getElementById(`layer-${category}`);
    if (!layer) return;

    if (item === '_none.webp' || !item) {
        layer.src = '';
        layer.style.display = 'none';
    } else {
        layer.src = `${BASE_ASSET_PATH}/${category}/${item}`;
        layer.style.display = 'block';
    }
}

// 5. 실시간 검색 바인딩
function initSearch() {
    const searchInput = document.getElementById('asset-search');
    searchInput.addEventListener('input', function() {
        renderGrid(activeCategory, allCategoryItems[activeCategory] || []);
    });
}

// 6. 이미지 병합 다운로드 기능 (Canvas API)
function downloadProfileImage() {
    const cardEl = document.getElementById('mafiaProfileCard');
    const width = 720; // 2배 고해상도
    const height = 960;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 겹쳐서 그릴 이미지 목록 정리 (Z-Index 순 정렬)
    const layers = [
        'ProfileBackground',
        'Header',
        'Skin',
        'Frame',
        'Collection',
        'RoleBadge',
        'Jewel',
        'NameTag',
        'Level',
        'Fame',
        'RP',
        'Rate',
        'Heart',
        'Mentor',
        'Guild'
    ];

    // 현재 화면에 출력 중인 유효한 레이어 이미지 객체 생성 및 로드 대기
    const loadPromises = [];

    layers.forEach(layerName => {
        const imgEl = document.getElementById(`layer-${layerName}`);
        if (imgEl && imgEl.style.display !== 'none' && imgEl.src && !imgEl.src.endsWith('_none.webp') && imgEl.src !== window.location.href) {
            const p = new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = "anonymous"; // CORS 이슈 방지
                img.src = imgEl.src;
                img.onload = () => resolve({ name: layerName, img: img });
                img.onerror = () => resolve(null); // 로드 오류 시 패스
            });
            loadPromises.push(p);
        }
    });

    // 모든 이미지 로딩 후 Canvas에 순서대로 그리기
    Promise.all(loadPromises).then(loadedLayers => {
        // 1. 배경 클리어
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // 2. 각 이미지 레이어 드로잉
        // 레이어 정렬 순서 보장을 위해 layers 배열의 인덱스 순서대로 로딩된 이미지를 찾아서 렌더링
        layers.forEach(layerName => {
            const found = loadedLayers.find(l => l && l.name === layerName);
            if (found && found.img) {
                ctx.drawImage(found.img, 0, 0, width, height);
            }
        });

        // 3. 텍스트 오버레이 렌더링
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px 'Noto Sans KR', sans-serif";
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        // 3-1. 닉네임 (하단 중앙)
        const nickname = document.getElementById('input-nickname').value;
        if (nickname) {
            ctx.textAlign = 'center';
            ctx.font = "bold 34px 'Noto Sans KR', sans-serif";
            ctx.fillText(nickname, width / 2, height - 60);
        }

        // 3-2. 길드명 (닉네임 위)
        const guild = document.getElementById('input-guild').value;
        if (guild) {
            ctx.textAlign = 'center';
            ctx.font = "500 24px 'Noto Sans KR', sans-serif";
            ctx.fillStyle = '#ffd700';
            ctx.fillText(guild, width / 2, height - 116);
        }

        // 3-3. 수치 정보 텍스트 (왼쪽 상단 구역)
        ctx.textAlign = 'left';
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 26px 'Noto Sans KR', sans-serif";

        const level = document.getElementById('input-level').value;
        if (level && document.getElementById('layer-Level').style.display !== 'none') {
            ctx.fillText(`Lv.${level}`, 90, 80);
        }

        ctx.font = "500 24px 'Noto Sans KR', sans-serif";

        const fame = document.getElementById('input-fame').value;
        if (fame && document.getElementById('layer-Fame').style.display !== 'none') {
            ctx.fillText(`명성 ${fame}`, 90, 150);
        }

        const rp = document.getElementById('input-rp').value;
        if (rp && document.getElementById('layer-RP').style.display !== 'none') {
            ctx.fillText(`RP ${rp}`, 90, 210);
        }

        const rate = document.getElementById('input-rate').value;
        if (rate && document.getElementById('layer-Rate').style.display !== 'none') {
            ctx.fillText(`승률 ${rate}%`, 90, 270);
        }

        const heart = document.getElementById('input-heart').value;
        if (heart && document.getElementById('layer-Heart').style.display !== 'none') {
            ctx.fillText(`${heart}개`, 90, 330);
        }

        // 4. 이미지 다운로드 트리거
        try {
            const dataUrl = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.download = `${nickname || 'mafia'}_profile.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            alert("이미지 병합에 실패했습니다. 로컬 자산 이미지 CORS 에러이거나 캔버스 관련 오류입니다.");
            console.error(e);
        }
    });
}
