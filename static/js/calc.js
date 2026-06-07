// 마피아42 계산기 스크립트

let isDiscountApplied = false;

document.addEventListener('DOMContentLoaded', function() {
    initCalcTabs();
});

// 탭 전환 기능
function initCalcTabs() {
    const tabButtons = document.querySelectorAll('.calc-menu-btn');
    const tabPanes = document.querySelectorAll('.tab-pane-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // 활성화 버튼 클래스 변경
            tabButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 활성화 콘텐츠 변경
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === `tab-${targetTab}`) {
                    pane.classList.add('active');
                }
            });
        });
    });
}

// 1. 우체통 계산기
function calcMailbox() {
    const currentInput = document.getElementById('mail-current');
    const targetInput = document.getElementById('mail-target');
    
    let current = parseInt(currentInput.value);
    let target = parseInt(targetInput.value);

    // 유효성 검사
    if (isNaN(current) || current < 42) {
        alert("현재 칸 수는 42칸 이상이어야 합니다.");
        currentInput.value = 42;
        return;
    }
    if (isNaN(target) || target <= current) {
        alert("목표 칸 수는 현재 칸 수보다 커야 합니다.");
        targetInput.value = current + 10;
        return;
    }

    // 우체통 확장은 10칸 단위로만 진행 가능 (예: 42 -> 52 -> 62)
    // 입력된 값이 2로 끝나지 않으면 2로 끝나도록 맞추어 줌
    if ((current - 2) % 10 !== 0) {
        current = Math.floor((current - 2) / 10) * 10 + 2;
        currentInput.value = current;
    }
    if ((target - 2) % 10 !== 0) {
        target = Math.ceil((target - 2) / 10) * 10 + 2;
        targetInput.value = target;
    }

    let totalRubles = 0;
    let count = 0;
    let currentMailbox = current;

    while (currentMailbox < target) {
        const cost = (currentMailbox - 32) * 1000;
        totalRubles += cost;
        count++;
        currentMailbox += 10;
    }

    document.getElementById('res-mail-count').innerText = count;
    document.getElementById('res-mail-rubles').innerText = totalRubles.toLocaleString();
    
    document.getElementById('mailbox-result').style.display = 'block';
}

// 2. 카드 강화 계산기 할인 세팅
function setDiscount(applied) {
    isDiscountApplied = applied;
    const noneBtn = document.getElementById('discount-none');
    const appliedBtn = document.getElementById('discount-applied');

    if (applied) {
        noneBtn.classList.remove('active');
        appliedBtn.classList.add('active');
    } else {
        noneBtn.classList.add('active');
        appliedBtn.classList.remove('active');
    }
}

// 2. 카드 강화 계산기
function calcUpgrade() {
    const currentTier = parseInt(document.getElementById('upgrade-current').value);
    const targetTier = parseInt(document.getElementById('upgrade-target').value);

    if (currentTier >= targetTier) {
        alert("목표 티어는 현재 티어보다 높아야 합니다.");
        return;
    }

    // 티어별 필요한 1티어 카드 수량 테이블
    // 1T = 1장
    // 2T = 2장
    // 3T = 6장
    // 4T = 24장
    // 5T = 120장
    // 6T = 720장
    const cardRatio = {
        1: 1,
        2: 2,
        3: 6,
        4: 24,
        5: 120,
        6: 720
    };

    // 티어별 승급 기본 비용 (루블)
    // 1->2티어: 10,000
    // 2->3티어: 50,000
    // 3->4티어: 300,000
    // 4->5티어: 1,000,000
    // 5->6티어: 3,000,000
    const upgradeCosts = {
        1: 10000,
        2: 50000,
        3: 300000,
        4: 1000000,
        5: 3000000
    };

    // 필요한 1티어 카드 총 수량 = 목표 티어 1장에 들어가는 1T 개수 - 현재 티어 1장에 들어가는 1T 개수
    // (본체 제외 추가로 들어가는 순수 재료 카드 개수)
    // 단, 3T 1장을 만들기 위해서는 2T 3장이 필요하므로 (본체 1 + 재료 2)
    // 총 6장의 1T 카드가 녹아들어갑니다.
    const currentCardsCount = cardRatio[currentTier];
    const targetCardsCount = cardRatio[targetTier];
    const needCards = targetCardsCount - currentCardsCount;

    // 승급에 소모되는 총 루블 비용 계산 (누적형)
    // 예: 1티어에서 3티어로 갈 때, (1->2티어 비용 * 3) + (2->3티어 비용 * 1) 과 같이
    // 상위 카드를 합성하기 위해 하위 승급 비용이 배수 형태로 누적되어야 합니다.
    // 6T 1장을 만들기 위해 거쳐야 하는 모든 승급 횟수를 추적해야 합니다.
    // 6티어 하나를 만들기 위해서 5티어 6장이 필요하고, 5티어 한 장당 4티어 5장이 필요하므로...
    // 각 승급 레벨별로 승급이 몇 번 발생하는지 카운팅합니다.
    
    let subUpgradeCounts = {};
    for (let t = 1; t <= 5; t++) {
        subUpgradeCounts[t] = 0;
    }

    // 목표 티어 1장을 완성하기 위해 각 단계별 필요한 완성 카드 수량
    // 예: 6티어 1장을 위해 -> 5티어 6장 -> 4티어 30장 -> 3티어 120장 -> 2티어 720장 -> 1티어 1440장(승급 720번)
    let neededAtTier = {};
    neededAtTier[targetTier] = 1;

    for (let t = targetTier - 1; t >= currentTier; t--) {
        // 티어 t+1 카드 1장을 만들기 위해 필요한 티어 t 카드 개수
        const multiplier = (t + 1); // 2T를 위해 1T 2장, 3T를 위해 2T 3장, 4T를 위해 3T 4장...
        neededAtTier[t] = neededAtTier[t + 1] * multiplier;
    }

    // 필요한 총 승급 횟수: 각 티어 t에서 t+1로 올리는 동작은 neededAtTier[t+1] 번 수행됩니다.
    let totalRubles = 0;
    let detailLog = "";

    for (let t = currentTier; t < targetTier; t++) {
        const upgradeCount = neededAtTier[t + 1];
        let baseCost = upgradeCosts[t] * upgradeCount;
        if (isDiscountApplied) {
            baseCost = Math.floor(baseCost * 0.9);
        }
        totalRubles += baseCost;

        detailLog += `<div class="log-line">🔹 [${t}티어 ➡️ ${t+1}티어] 승급 ${upgradeCount}회: <span class="log-cost">${baseCost.toLocaleString()} 루블</span> (${upgradeCosts[t].toLocaleString()} 루블 x ${upgradeCount}회${isDiscountApplied ? ' - 10% 할인' : ''})</div>`;
    }

    document.getElementById('res-upgrade-cards').innerText = needCards.toLocaleString();
    document.getElementById('res-upgrade-rubles').innerText = totalRubles.toLocaleString();
    document.getElementById('res-upgrade-details').innerHTML = detailLog;

    document.getElementById('upgrade-result').style.display = 'block';
}

// 3. 출석 보상 계산기
function calcAttendance() {
    const fameInput = document.getElementById('att-fame');
    const buffInput = document.getElementById('att-guild-buff');

    let fame = parseInt(fameInput.value);
    let buff = parseInt(buffInput.value);

    if (isNaN(fame) || fame < 0) {
        alert("명성 수치는 0 이상이어야 합니다.");
        fameInput.value = 0;
        fame = 0;
    }
    if (isNaN(buff) || buff < 0 || buff > 100) {
        alert("길드 버프는 0% ~ 100% 사이로 입력해 주세요.");
        buffInput.value = 0;
        buff = 0;
    }

    // 명성 1당 100루블 추가
    const rubleFame = fame * 100;
    // 길드 버프 추가 루블
    const rubleGuild = Math.floor(rubleFame * (buff / 100));
    // 최종 추가 루블
    const rubleTotal = rubleFame + rubleGuild;

    // 명성 42당 1루나 추가
    const lunaTotal = Math.floor(fame / 42);

    document.getElementById('res-att-ruble-fame').innerText = rubleFame.toLocaleString();
    document.getElementById('res-att-ruble-guild').innerText = rubleGuild.toLocaleString();
    document.getElementById('res-att-ruble-total').innerText = rubleTotal.toLocaleString();
    document.getElementById('res-att-luna').innerText = lunaTotal.toLocaleString();

    document.getElementById('attendance-result').style.display = 'block';
}

// 4. 권위의 엽서 계산기
function calcPostcard() {
    const fameInput = document.getElementById('post-fame');
    let fame = parseInt(fameInput.value);

    if (isNaN(fame) || fame < 0) {
        alert("명성은 0 이상이어야 합니다.");
        fameInput.value = 0;
        fame = 0;
    }

    // 공식: 20 + 1.2 * √명성 (소수점 이하 절사)
    const deduct = Math.floor(20 + 1.2 * Math.sqrt(fame));

    document.getElementById('res-post-deduct').innerText = deduct.toLocaleString();
    document.getElementById('postcard-result').style.display = 'block';
}
