console.log('[Randbox] script loaded');

document.addEventListener("DOMContentLoaded", async function () {
  const eventSelect = document.getElementById("event-file");
  const boxTypeSelect = document.getElementById("box-type");
  const itemsList = document.getElementById("items-list");
  const remainingEquipSumElement = document.getElementById("remaining-equip-sum");

  // 사용자 보유 아이템 목록 (item_id 기반)
  let userOwnedItemIds = new Set();
  // 사용자 보유 아이템 이름 기반(소문자 정규화)
  let userOwnedItemNames = new Set();
  let itemIdToNameMap = {}; // item_id -> name 매핑

  function normalizeName(name) {
    if (!name) return '';
    // 공백을 무시하도록 모든 공백 문자 제거 후 소문자화
    return name.toLowerCase().replace(/\s+/g, '');
  }

  // 보유 아이템 모드 관련 헬퍼
  const RANDBOX_MODE_KEY = 'randbox_ownership_mode';
  const RANDBOX_CACHE_KEY = 'randbox_saved_state';

  function getOwnershipMode() {
    return localStorage.getItem(RANDBOX_MODE_KEY) || 'server';
  }

  function getSavedStateCache() {
    try { return JSON.parse(localStorage.getItem(RANDBOX_CACHE_KEY)); } catch { return null; }
  }

  function setSavedStateCache(ids, names, nameToId) {
    localStorage.setItem(RANDBOX_CACHE_KEY, JSON.stringify({
      idsOwned: Array.from(ids),
      namesOwned: Array.from(names),
      nameToId
    }));
  }

  // authManager 접근 헬퍼 (global const/let으로 선언된 authManager를 window에서 찾지 못하는 경우 대비)
  function getAuthManager() {
    if (typeof window !== 'undefined' && window.authManager) return window.authManager;
    if (typeof authManager !== 'undefined') return authManager;
    return null;
  }

  // 로그인 상태 변경 시 내 아이템을 다시 불러오고 리스트를 갱신
  window.addEventListener('authStateChanged', async (e) => {
    try {
      console.log('[Randbox] authStateChanged event:', e.detail);
      updatePanelVisibility();
      resetItemChanges();
      await loadUserItems();
      const eventId = eventSelect.value;
      const boxType = boxTypeSelect.value;
      fetchItems(eventId, boxType);
    } catch (err) {
      console.error('[Randbox] authStateChanged 처리 오류:', err);
    }
  });

  // auth 초기화 완료 대기 후 사용자 아이템 로드
  if (window.authManager && typeof window.authManager.waitForReady === 'function') {
    await window.authManager.waitForReady();
  }
  await loadUserItems();

  // 사용자가 수동으로 변경한 체크 상태를 저장 (렌더링 간 유지)
  const userModifiedStates = {}; // nameKey -> boolean
  // 소유 아이템 적용이 이미 수행되었는지 플래그
  let appliedOwnedMarks = false;

  // 변경 추적용 (로그인 사용자)
  const itemChanges = {
    added: new Set(),    // 새로 체크한 아이템 (item_id)
    removed: new Set()   // 체크 해제한 아이템 (item_id)
  };

  // UI 요소
  const guestInfoPanel = document.getElementById('guest-info');
  const userSavePanel = document.getElementById('user-save-panel');
  const saveItemsBtn = document.getElementById('save-items-btn');

  // 패널 표시 상태 업데이트
  function updatePanelVisibility() {
    const mode = getOwnershipMode();
    if (mode === 'local') {
      if (guestInfoPanel) guestInfoPanel.style.display = 'none';
      if (userSavePanel) userSavePanel.style.display = 'none';
      return;
    }
    const am = getAuthManager();
    const isLoggedIn = am && am.isAuthenticated();
    if (guestInfoPanel) guestInfoPanel.style.display = isLoggedIn ? 'none' : 'block';
    if (userSavePanel) userSavePanel.style.display = isLoggedIn ? 'flex' : 'none';
  }

  // 변경 카운터 UI 업데이트
  function updateChangeCounter() {
    const counter = document.getElementById('change-counter');
    if (!counter) return;

    const addedCount = itemChanges.added.size;
    const removedCount = itemChanges.removed.size;

    let html = '';
    if (addedCount > 0) {
      html += `<span class="added">+${addedCount}</span>`;
    }
    if (removedCount > 0) {
      html += `<span class="removed">-${removedCount}</span>`;
    }

    counter.innerHTML = html;

    // 변경이 있으면 버튼 활성화
    const btn = document.getElementById('save-items-btn');
    if (btn) {
      btn.disabled = (addedCount === 0 && removedCount === 0);
    }
  }

  // 변경 상태 초기화
  function resetItemChanges() {
    itemChanges.added.clear();
    itemChanges.removed.clear();
    updateChangeCounter();
  }

  // 체크박스 변경 시 변경 추적
  function trackItemChange(itemId, isChecked, wasOriginallyOwned) {
    console.log('[Randbox] trackItemChange 호출:', { itemId, isChecked, wasOriginallyOwned });
    if (!itemId || itemId === 'null') return;

    const itemIdStr = String(itemId);

    if (isChecked) {
      // 체크됨
      if (wasOriginallyOwned) {
        // 원래 보유했던 아이템 -> removed에서 제거
        itemChanges.removed.delete(itemIdStr);
      } else {
        // 원래 없던 아이템 -> added에 추가
        itemChanges.added.add(itemIdStr);
      }
    } else {
      // 체크 해제됨
      if (wasOriginallyOwned) {
        // 원래 보유했던 아이템 -> removed에 추가
        itemChanges.removed.add(itemIdStr);
      } else {
        // 원래 없던 아이템 -> added에서 제거
        itemChanges.added.delete(itemIdStr);
      }
    }

    console.log('[Randbox] 현재 변경 상태:', {
      added: Array.from(itemChanges.added),
      removed: Array.from(itemChanges.removed)
    });
    updateChangeCounter();
  }

  // 저장 버튼 클릭 핸들러
  async function saveItemChanges() {
    const am = getAuthManager();
    if (!am || !am.isAuthenticated()) {
      alert('로그인이 필요합니다.');
      return;
    }

    const addedItems = Array.from(itemChanges.added);
    const removedItems = Array.from(itemChanges.removed);

    if (addedItems.length === 0 && removedItems.length === 0) {
      return;
    }

    saveItemsBtn.disabled = true;
    saveItemsBtn.textContent = '저장 중...';

    try {
      // 추가할 아이템 처리
      for (const itemId of addedItems) {
        const response = await am.authenticatedFetch('/api/items/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id: parseInt(itemId) })
        });
        if (!response.ok) {
          const err = await response.json();
          console.error('아이템 추가 실패:', itemId, err);
        }
      }

      // 삭제할 아이템 처리
      for (const itemId of removedItems) {
        const response = await am.authenticatedFetch('/api/items/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id: parseInt(itemId) })
        });
        if (!response.ok) {
          const err = await response.json();
          console.error('아이템 삭제 실패:', itemId, err);
        }
      }

      // 성공 후 사용자 아이템 다시 로드
      const mode = getOwnershipMode();
      if (mode === 'save-only') {
        // 캐시 무효화 후 서버에서 재fetching → 새 캐시로 갱신
        localStorage.removeItem(RANDBOX_CACHE_KEY);
      }
      await loadUserItems();

      // 변경 상태 초기화
      resetItemChanges();

      if (mode === 'save-only') {
        // 아이템 목록 재렌더링 (새 캐시 반영)
        appliedOwnedMarks = false;
        Object.keys(userModifiedStates).forEach(k => delete userModifiedStates[k]);
        fetchItems(eventSelect.value, boxTypeSelect.value);
      }

      restoreSaveButtonUI();
      alert(`저장 완료! (추가: ${addedItems.length}개, 삭제: ${removedItems.length}개)`);

    } catch (error) {
      console.error('저장 중 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
      restoreSaveButtonUI();
      updateChangeCounter();
    }
  }

  // 저장 버튼 UI 복원
  function restoreSaveButtonUI() {
    if (saveItemsBtn) {
      saveItemsBtn.innerHTML = '상태 저장하기 <span id="change-counter"></span>';
      saveItemsBtn.disabled = true;
    }
  }

  // 저장 버튼 이벤트 리스너
  if (saveItemsBtn) {
    saveItemsBtn.addEventListener('click', saveItemChanges);
  }

  // 초기 패널 상태 설정
  updatePanelVisibility();

  // URL 파라미터에서 user_event 확인
  const urlParams = new URLSearchParams(window.location.search);
  const userEventId = urlParams.get('user_event');

  if (userEventId) {
    // 유저 이벤트 로드
    loadUserEvent(userEventId);
  } else {
    // 기존 방식으로 이벤트 목록 로드
    fetch('/list_event_files')
      .then(res => res.json())
      .then(events => {
        events.forEach(ev => {
          const opt = document.createElement("option");
          opt.value = ev.id;
          opt.textContent = `${ev.name} (${ev.start} ~ ${ev.end})`;
          eventSelect.appendChild(opt);
        });
        
        // 첫 항목 강제 선택 후 이벤트 발생
        eventSelect.dispatchEvent(new Event("change"));
      });
  }

  function loadUserEvent(eventId) {
    fetch(`/get_user_event/${eventId}`)
      .then(res => res.json())
      .then(eventData => {
        if (!eventData || eventData.error) {
          alert('유저 이벤트를 불러올 수 없습니다.');
          window.location.href = '/randbox';
          return;
        }

        // 이벤트 선택 드롭다운에 추가
        const opt = document.createElement("option");
        opt.value = 'user_' + eventId;
        opt.textContent = `[유저] ${eventData.event_name} (${eventData.start} ~ ${eventData.end})`;
        opt.selected = true;
        eventSelect.appendChild(opt);

        // 유저 이벤트 데이터를 전역으로 저장 (fetchItems보다 먼저 해야 함)
        window.currentUserEvent = eventData;

        // 상자 목록 업데이트
        updateBoxSelect(eventData.boxes);

        // 750luna 상자가 있으면 선택, 없으면 첫 번째 상자 선택
        if (eventData.boxes.length > 0) {
          const box750 = eventData.boxes.find(b => b.type === '750luna');
          boxTypeSelect.value = box750 ? '750luna' : eventData.boxes[0].type;
          boxTypeSelect.dispatchEvent(new Event("change"));
        }
      });
  }

  function fetchItems(eventFile, boxType) {
    // 유저 이벤트인 경우
    if (window.currentUserEvent) {
      const box = window.currentUserEvent.boxes.find(b => b.type === boxType);
      if (box) {
        updateItemsList(boxType, box.items);
      }
      return;
    }

    // 기본 이벤트인 경우
    fetch(`/get_items/${eventFile}/${boxType}`)
      .then(response => response.json())
      .then(data => updateItemsList(boxType, data));
  }

  function updateBoxSelect(boxes) {
  const boxTypeSelect = document.getElementById("box-type");
  boxTypeSelect.innerHTML = '';

  const boxTypeLabels = {
    "2500rubble": "2500 루블 상자",
    "150luna": "150 루나 상자",
    "750luna": "750 루나 상자",
    "legend": "패키지 전설 상자"
  };

  boxes.forEach(box => {
    const option = document.createElement("option");
    option.value = box.type;
    option.textContent = boxTypeLabels[box.type] || box.type;  // 매핑이 없으면 원래 이름 사용
    boxTypeSelect.appendChild(option);
  });
}


  function updateItemsList(boxType, items) {
    const eventId = eventSelect.value;
    itemsList.innerHTML = '';
    const savedState = getGlobalState();
    // savedState 키들을 정규화해서 사용
    const savedStateNorm = {};
    Object.keys(savedState || {}).forEach(k => { savedStateNorm[normalizeName(k)] = savedState[k]; });

    items.forEach(item => {
      console.log('[Randbox] 원본 아이템 객체:', item);
      const rowElement = document.createElement('div');
      rowElement.classList.add('row');

      const checkBoxCell = document.createElement('div');
      checkBoxCell.classList.add('cell');
      // 다양한 응답 포맷 대응: item_id가 없으면 id 또는 nested items.item_id 사용
      const resolvedItemId = item.item_id ?? item.id ?? (item.items && item.items.item_id) ?? (item.item && item.item.item_id) ?? null;
      if (item.equip || (item.items && item.items.is_equipable) || (item.item && item.item.is_equipable)) {
        const checkBox = document.createElement('input');
        checkBox.type = 'checkbox';
        checkBox.classList.add('item-checkbox');
        checkBox.dataset.name = item.name || (item.items && item.items.name) || (item.item && item.item.name) || '';
        checkBox.dataset.itemId = resolvedItemId; // item_id 저장
        checkBox.dataset.chance = item.chance ?? item.drop_chance ?? (item.items && item.items.chance) ?? 0;
        checkBox.dataset.equip = (item.equip ?? item.items?.is_equipable ?? item.item?.is_equipable) || false;
        checkBox.dataset.originalChance = item.chance ?? item.drop_chance ?? 0;
        
        const nameKey = normalizeName(checkBox.dataset.name);
        if (userModifiedStates.hasOwnProperty(nameKey)) {
          checkBox.checked = userModifiedStates[nameKey];
        } else if (!appliedOwnedMarks) {
          const mode = getOwnershipMode();
          const am = getAuthManager();
          const isLoggedIn = am && am.isAuthenticated();
          if (mode === 'local' || !isLoggedIn) {
            // 비로그인 또는 로컬 모드: localStorage 상태 사용
            checkBox.checked = savedStateNorm[nameKey] || false;
          } else {
            // 로그인 + server/save-only: 서버/캐시 데이터 사용
            const hasByName = nameKey ? userOwnedItemNames.has(nameKey) : false;
            const hasById = resolvedItemId ? userOwnedItemIds.has(String(resolvedItemId)) : false;
            checkBox.checked = hasByName || hasById;
          }
        } else {
          checkBox.checked = savedStateNorm[nameKey] || false;
        }

        checkBox.addEventListener('change', (e) => {
          const cb = e.target;
          const nk = normalizeName(cb.dataset.name);
          const itemId = cb.dataset.itemId;
          userModifiedStates[nk] = cb.checked;

          const mode = getOwnershipMode();
          const am = getAuthManager();
          const isLoggedIn = am && am.isAuthenticated();

          if (mode === 'local' || !isLoggedIn) {
            // 로컬 모드 또는 비로그인: 체크 상태를 즉시 localStorage에 기록
            saveGlobalState();
          }
          if (mode !== 'local' && isLoggedIn && itemId && itemId !== 'null') {
            // 로그인 + 서버 모드: 서버 변경 추적
            const wasOriginallyOwned = userOwnedItemIds.has(String(itemId));
            trackItemChange(itemId, cb.checked, wasOriginallyOwned);
          }

          updateChances();
        });
        checkBoxCell.appendChild(checkBox);
      }
      rowElement.appendChild(checkBoxCell);

      const imageCell = document.createElement('div');
      imageCell.classList.add('cell');
      const imagePath = `/static/images/EquipImage/${replaceColonOnItemName(item.name)}.webp`;
      const imageElement = document.createElement('img');
      imageElement.src = imagePath;
      imageElement.alt = item.name;
      imageElement.classList.add('item-image');
      imageCell.appendChild(imageElement);
      rowElement.appendChild(imageCell);
      
      const nameCell = document.createElement('div');
      nameCell.classList.add('cell');
      nameCell.dataset.name = item.name;
      nameCell.dataset.originalChance = item.chance;
      nameCell.textContent = item.name;
      rowElement.appendChild(nameCell);

      const chanceCell = document.createElement('div');
      chanceCell.classList.add('cell');
      chanceCell.dataset.originalChance = item.chance;
      chanceCell.textContent = `${parseFloat(item.chance).toFixed(6)}%`;
      rowElement.appendChild(chanceCell);

      itemsList.appendChild(rowElement);
    });

    updateChances();
    // 보유 아이템 적용이 완료되었음을 표시 (처음 렌더링 이후에는 보유 기반 자동 변경 금지)
    appliedOwnedMarks = true;
  }

  function replaceColonOnItemName(name) {
    return name.replace(' : ', '-').replace(': ', '-').replace(':', '-');
  }

  function updateChances() {
    const itemRows = document.querySelectorAll('.row');
    const items = [];

    itemRows.forEach((row) => {
      const checkbox = row.querySelector('.item-checkbox');
      const nameCell = row.children[2];
      const chanceCell = row.children[3];
      items.push({
        element: row,
        name: nameCell.dataset.name,
        originalChance: parseFloat(chanceCell.dataset.originalChance),
        equip: checkbox ? checkbox.dataset.equip === 'true' : false,
        checked: checkbox ? checkbox.checked : false
      });
    });

    // 디버깅 로그
    console.log('총 아이템 수:', items.length);
    console.log('체크된 아이템:', items.filter(item => item.checked).map(item => ({ name: item.name, chance: item.originalChance })));

    // 1단계: 체크된 아이템의 확률 합 계산
    const checkedSum = items
      .filter(item => item.checked)
      .reduce((sum, item) => sum + item.originalChance, 0);

    // 2단계: 체크되지 않은 아이템들의 원래 확률 합
    const uncheckedOriginalSum = items
      .filter(item => !item.checked)
      .reduce((sum, item) => sum + item.originalChance, 0);

    // 예외 처리: 모든 아이템이 체크되었거나 체크된 아이템이 없는 경우
    if (uncheckedOriginalSum === 0) {
      items.forEach(item => {
        const chanceCell = item.element.children[3];
        if (item.checked) {
          chanceCell.textContent = '0.00%';
        } else {
          chanceCell.textContent = `${item.originalChance.toFixed(6)}%`;
        }
      });
      remainingEquipSumElement.textContent = '0.00%';
      return;
    }

    // 3단계: 체크되지 않은 아이템들을 기본 비례로 재분배
    const redistributionRatio = 100 / uncheckedOriginalSum;

    // 4단계: 최종 확률 적용
    let remainingEquipSum = 0;
    items.forEach(item => {
      const chanceCell = item.element.children[3];
      
      if (item.checked) {
        chanceCell.textContent = '0.00%';
      } else {
        const finalChance = item.originalChance * redistributionRatio;
        chanceCell.textContent = `${finalChance.toFixed(6)}%`;
        
        if (item.equip) {
          remainingEquipSum += finalChance;
        }
      }
    });

    remainingEquipSumElement.textContent = `${remainingEquipSum.toFixed(6)}%`;
  }

  function saveGlobalState() {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    
    // 기존 저장된 상태를 먼저 불러옴
    const state = getGlobalState();
    
    // 현재 화면의 체크박스 상태만 업데이트
    checkboxes.forEach(checkbox => {
      state[checkbox.dataset.name] = checkbox.checked;
    });
    
    // localStorage에 저장 (비로그인 사용자용)
    localStorage.setItem('globalItemEquipState', JSON.stringify(state));
  }

  async function handleCheckboxChange(checkbox) {
    // 이 함수는 더 이상 서버에 아이템 추가/제거를 요청하거나
    // localStorage에 상태를 저장하지 않습니다.
    // randbox 페이지는 단순히 확률표를 보여주고 사용자가 체크하여
    // 확률 변화를 체감하는 용도이며, 실제 보유 아이템 추가/삭제는
    // '내 아이템' 메뉴에서 처리해야 합니다.
    return;
  }

  async function loadUserItems() {
    const mode = getOwnershipMode();

    // 브라우저 저장 모드: 서버 요청 없이 빈 세트 유지 (savedState가 체크 상태 담당)
    if (mode === 'local') {
      userOwnedItemIds = new Set();
      userOwnedItemNames = new Set();
      itemIdToNameMap = {};
      return;
    }

    // 상태 저장 시 갱신 모드: 캐시가 있으면 캐시에서 로드
    if (mode === 'save-only') {
      const cache = getSavedStateCache();
      if (cache) {
        userOwnedItemIds = new Set(cache.idsOwned || []);
        userOwnedItemNames = new Set(cache.namesOwned || []);
        itemIdToNameMap = cache.nameToId || {};
        return;
      }
      // 캐시 없으면 서버에서 최초 1회 fetch 후 캐시 저장
    }

    // 서버에서 fetch (mode server 또는 save-only 첫 로드)
    const am = getAuthManager();
    if (!am || !am.isAuthenticated()) {
      userOwnedItemIds = new Set();
      userOwnedItemNames = new Set();
      itemIdToNameMap = {};
      return;
    }

    try {
      const response = await am.authenticatedFetch('/api/items/my-items');
      const data = await response.json();

      if (response.ok && data && data.success) {
        userOwnedItemIds = new Set(data.items.map(item => String(item.item_id ?? item.id ?? (item.items && item.items.item_id) ?? '')));
        userOwnedItemNames = new Set(data.items.map(item => normalizeName(item.name ?? item.items?.name ?? item.item?.name ?? '')));
        itemIdToNameMap = {};
        data.items.forEach(item => {
          const id = String(item.item_id ?? item.id ?? (item.items && item.items.item_id) ?? '');
          const nm = item.name ?? item.items?.name ?? item.item?.name ?? '';
          if (id) itemIdToNameMap[id] = nm;
        });

        // save-only 모드: 서버에서 받은 데이터를 캐시로 저장
        if (mode === 'save-only') {
          setSavedStateCache(userOwnedItemIds, userOwnedItemNames, itemIdToNameMap);
        }
      } else {
        console.warn('[Randbox] /api/items/my-items 요청 실패', data);
      }
    } catch (error) {
      console.error('[Randbox] 사용자 아이템 로드 실패:', error);
    }
  }

  async function syncToSupabase(state) {
    // 더 이상 사용하지 않음 - handleCheckboxChange로 대체
  }

  function getGlobalState() {
    return JSON.parse(localStorage.getItem('globalItemEquipState')) || {};
  }

  eventSelect.addEventListener('change', () => {
    // 이벤트 변경 시 체크 상태 초기화 (내 아이템 기반으로 다시 체크)
    appliedOwnedMarks = false;
    Object.keys(userModifiedStates).forEach(key => delete userModifiedStates[key]);
    resetItemChanges();

    const eventId = eventSelect.value;
    fetch(`/get_event_data/${eventId}`)
      .then(res => res.json())
      .then(data => {
        boxTypeSelect.innerHTML = '';
        data.boxes.forEach(box => {
          const option = document.createElement("option");
          option.value = box.type;
          option.textContent = box.type;
          boxTypeSelect.appendChild(option);
        });
        updateBoxSelect(data.boxes);

        const targetOption = Array.from(boxTypeSelect.options).find(opt => opt.value === '750luna');
        if (targetOption) {
          targetOption.selected = true;
        }
        boxTypeSelect.dispatchEvent(new Event("change"));
      });
  });

  boxTypeSelect.addEventListener('change', () => {
    // 박스 타입 변경 시 체크 상태 초기화 (내 아이템 기반으로 다시 체크)
    appliedOwnedMarks = false;
    Object.keys(userModifiedStates).forEach(key => delete userModifiedStates[key]);
    resetItemChanges();

    const eventId = eventSelect.value;
    const boxType = boxTypeSelect.value;
    fetchItems(eventId, boxType);
  });

  // 뽑기 버튼 이벤트
  const drawButton = document.getElementById('draw-button');
  drawButton.addEventListener('click', performDraw);



  function performDraw() {
    const items = getCurrentItems();
    if (items.length === 0) {
      alert('뽑을 수 있는 아이템이 없습니다. 이벤트와 상자 종류를 선택해주세요.');
      return;
    }

    // 확률 기반 뽑기 실행
    const drawnItem = drawRandomItem(items);
    displayDrawResult(drawnItem);
  }

  function getCurrentItems() {
    const itemRows = document.querySelectorAll('.row');
    const items = [];

    itemRows.forEach((row) => {
      const checkbox = row.querySelector('.item-checkbox');
      const nameCell = row.children[2];
      const chanceCell = row.children[3];
      
      // 체크되지 않은 아이템만 뽑기 대상
      if (!checkbox || !checkbox.checked) {
        const chanceText = chanceCell.textContent;
        const chance = parseFloat(chanceText.replace('%', ''));
        
        if (chance > 0) {
          items.push({
            name: nameCell.dataset.name,
            chance: chance,
            equip: checkbox ? checkbox.dataset.equip === 'true' : false
          });
        }
      }
    });

    return items;
  }

  function drawRandomItem(items) {
    // 누적 확률 계산
    let totalChance = 0;
    const cumulativeChances = [];
    
    for (let item of items) {
      totalChance += item.chance;
      cumulativeChances.push({
        item: item,
        cumulativeChance: totalChance
      });
    }

    // 0~100 사이의 랜덤 값 생성
    const randomValue = Math.random() * totalChance;
    
    // 뽑힌 아이템 찾기
    for (let cumulative of cumulativeChances) {
      if (randomValue <= cumulative.cumulativeChance) {
        return cumulative.item;
      }
    }
    
    // 만약의 경우를 위한 fallback (마지막 아이템 반환)
    return items[items.length - 1];
  }

  function displayDrawResult(item) {
    const drawResult = document.getElementById('draw-result');
    const imagePath = `/static/images/EquipImage/${replaceColonOnItemName(item.name)}.webp`;
    
    drawResult.innerHTML = `
      <div class="result-item">
        <img src="${imagePath}" alt="${item.name}" onerror="this.src='/static/images/noimg.webp'">
        <div class="result-info">
          <div class="result-name">${item.name}</div>
          <div class="result-probability">${item.chance.toFixed(6)}%</div>
        </div>
      </div>
    `;
  }


});
