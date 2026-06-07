// 페이지가 로드될 때 localStorage에 저장된 테마 적용
// 초기화 함수: DOM이 이미 준비된 경우 즉시 실행되도록 함
function initDarkMode() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    applyTheme(currentTheme);

    // 기존 토글 버튼 (구버전 페이지용)
    const toggleButton = document.getElementById('theme-toggle');
    if (toggleButton) {
      updateToggleButtonText(toggleButton, currentTheme);
      toggleButton.addEventListener('click', () => toggleDarkMode());
    }

    // 새로운 토글 버튼들 (modern-index.html용)
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleMobile = document.getElementById('themeToggleMobile');

    if (themeToggle) {
      themeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // 이벤트 버블링 방지
        toggleDarkMode();
      });
    }

    if (themeToggleMobile) {
      themeToggleMobile.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // 이벤트 버블링 방지
        toggleDarkMode();
      });
    }
}

// DOMContentLoaded가 이미 발생했으면 즉시 초기화, 아니면 이벤트로 대기
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initDarkMode);
} else {
  initDarkMode();
}

// 테마 적용 함수
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  
  // body에 dark-mode 클래스 추가/제거 (modern-index.css 호환)
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

// 다크모드 토글 함수 (전역 함수로 export)
function toggleDarkMode() {
  // localStorage에서 현재 테마 가져오기 (더 신뢰할 수 있음)
  const currentTheme = localStorage.getItem('theme') || document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  console.log('현재 테마:', currentTheme, '→ 새 테마:', newTheme);
  
  applyTheme(newTheme);
  localStorage.setItem('theme', newTheme);
  
  console.log('적용 후 - data-theme:', document.documentElement.getAttribute('data-theme'));
  console.log('적용 후 - body classes:', document.body.className);

  // 기존 버튼 텍스트 업데이트
  const toggleButton = document.getElementById('theme-toggle');
  if (toggleButton) {
    updateToggleButtonText(toggleButton, newTheme);
  }
}

// 토글 버튼 텍스트 업데이트
function updateToggleButtonText(button, theme) {
  if (theme === 'dark') {
    button.textContent = '라이트 모드';
  } else {
    button.textContent = '다크 모드';
  }
}

// 전역으로 export (modern-index.js에서 사용)
window.toggleDarkMode = toggleDarkMode;
  