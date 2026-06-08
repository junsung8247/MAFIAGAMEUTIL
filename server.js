const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const eventDataMap = require('./data/event_data_map.json');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// static 폴더 서빙 (CSS, JS, 이미지)
app.use('/static', express.static(path.join(__dirname, 'static')));

// 간단한 메모리 내 데이터베이스 (Mock DB)
let myItems = new Set(); // 사용자 소유 아이템 ID (문자열 형태)
let currentUser = null; // 현재 로그인된 사용자 정보

// ============================================
// HTML 뷰 라우팅
// ============================================

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// 이벤트 상자 확률표 페이지
app.get('/randbox', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'randbox.html'));
});

// 계산기 페이지
app.get('/calc', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'calc.html'));
});

// 커스텀 프로필 페이지
app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

// ============================================
// API 엔드포인트
// ============================================

// 1. 이벤트 전체 목록 조회
app.get('/list_event_files', (req, res) => {
    const filePath = path.join(process.cwd(), 'data', 'events.json');
    if (!fs.existsSync(filePath)) {
        return res.status(500).json({ error: '이벤트 목록 데이터가 없습니다.' });
    }
    
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.send(fileContent);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. 개별 이벤트 상자 정보 조회 (메모리 맵 사용)
app.get('/get_event_data/:eventId', (req, res) => {
    let rawEventId = req.params.eventId;
    console.log(`[Server] get_event_data 요청 수신: rawEventId = "${rawEventId}"`);
    
    let eventId = rawEventId;
    try {
        if (eventId.includes('%')) {
            eventId = decodeURIComponent(eventId);
        }
    } catch (e) {
        console.error('[Server] URL 디코딩 오류:', e.message);
    }
    
    eventId = eventId.normalize('NFC');
    console.log(`[Server] NFC 정규화 완료: eventId = "${eventId}"`);
    
    const eventData = eventDataMap[eventId];
    if (!eventData) {
        console.warn(`[Server] 메모리 맵 매칭 실패: "${eventId}"`);
        return res.status(404).json({ error: '해당 이벤트를 찾을 수 없습니다.' });
    }

    res.json(eventData);
});

// 3. 특정 상자의 확률 아이템 상세 조회 (메모리 맵 사용)
app.get('/get_items/:eventFile/:boxType', (req, res) => {
    let { eventFile, boxType } = req.params;
    
    try {
        if (eventFile.includes('%')) {
            eventFile = decodeURIComponent(eventFile);
        }
    } catch (e) {
        console.error('[Server] URL 디코딩 오류:', e.message);
    }
    
    eventFile = eventFile.normalize('NFC');
    
    const eventData = eventDataMap[eventFile];
    if (!eventData) {
        return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
    }

    const box = eventData.boxes.find(b => b.type === boxType);
    if (!box) {
        return res.status(404).json({ error: '상자 종류를 찾을 수 없습니다.' });
    }

    // 아이템 리스트 포맷 반환
    const items = box.items.map((item, idx) => {
        return {
            item_id: item.item_id || item.id || (10000 + idx),
            name: item.name,
            chance: item.chance || item.drop_chance || 0,
            equip: item.equip !== undefined ? item.equip : true
        };
    });

    res.json(items);
});


// 4. 프로필 커스터마이저 카테고리별 자산 목록 조회
app.get('/get_items/profile/:category', (req, res) => {
    const { category } = req.params;
    const mapPath = path.join(process.cwd(), 'data', 'profile_assets_map.json');

    if (!fs.existsSync(mapPath)) {
        return res.status(404).json({ error: '프로필 자산 맵 데이터가 없습니다.' });
    }

    try {
        const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
        const items = map[category] || [];
        
        // _none.webp가 없는 경우 최상단에 수동으로 주입하여 선택 취소 옵션 지원
        if (!items.includes('_none.webp')) {
            items.unshift('_none.webp');
        }
        res.json(items);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================
// 사용자 아이템 API (Mock DB 연동)
// ============================================

app.get('/api/items/my-items', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: '인증되지 않은 사용자입니다.' });
    }

    const itemsList = Array.from(myItems).map(id => {
        return {
            item_id: parseInt(id),
            id: parseInt(id),
            name: `아이템 #${id}`,
            equip: true
        };
    });

    res.json({
        success: true,
        items: itemsList
    });
});

app.post('/api/items/add', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: '인증 필요' });
    }

    const { item_id } = req.body;
    if (item_id !== undefined) {
        myItems.add(String(item_id));
        console.log(`[MockDB] 아이템 추가됨: ${item_id}, 현재 개수: ${myItems.size}`);
    }
    
    res.json({ success: true });
});

app.post('/api/items/remove', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, error: '인증 필요' });
    }

    const { item_id } = req.body;
    if (item_id !== undefined) {
        myItems.delete(String(item_id));
        console.log(`[MockDB] 아이템 삭제됨: ${item_id}, 현재 개수: ${myItems.size}`);
    }

    res.json({ success: true });
});

// ============================================
// 인증 API (Mock Authentication)
// ============================================

app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && currentUser) {
        return res.json({
            success: true,
            user: currentUser
        });
    }
    res.status(401).json({ success: false, error: '로그인이 만료되었습니다.' });
});

app.post('/api/auth/signin', (req, res) => {
    const { email } = req.body;
    
    currentUser = {
        email: email || 'test@example.com',
        username: email ? email.split('@')[0] : 'testuser',
        nickname: '마피아계산기 마스터',
        avatar_url: null
    };

    res.json({
        success: true,
        user: currentUser,
        session: {
            access_token: "dummy_access_token",
            refresh_token: "dummy_refresh_token"
        }
    });
});

app.post('/api/auth/signup', (req, res) => {
    res.json({
        success: true,
        email_confirmation_required: false
    });
});

app.post('/api/auth/signout', (req, res) => {
    currentUser = null;
    res.json({ success: true });
});

app.post('/api/auth/refresh', (req, res) => {
    res.json({
        success: true,
        session: {
            access_token: "dummy_access_token",
            refresh_token: "dummy_refresh_token"
        }
    });
});

app.post('/api/auth/oauth', (req, res) => {
    res.json({
        success: true,
        url: "/randbox"
    });
});

app.get('/get_user_event/:eventId', (req, res) => {
    res.status(404).json({ error: '유저 이벤트를 찾을 수 없습니다.' });
});

// 서버 실행
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`[Server] 마피아계산기 서버 실행 중...`);
    console.log(`[Server] 주소: http://localhost:${PORT}`);
    console.log(`[Server] 확률표 주소: http://localhost:${PORT}/randbox`);
    console.log(`[Server] 계산기 주소: http://localhost:${PORT}/calc`);
    console.log(`[Server] 프로필 주소: http://localhost:${PORT}/profile`);
    console.log(`==================================================\n`);
});
