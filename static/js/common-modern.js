// ============================================
// 공통 모던 JavaScript - 모든 페이지 적용
// ============================================

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    initCommonNavigation();
    initCommonTheme();
});

// ============================================
// 네비게이션 및 사이드 메뉴 (공통)
// ============================================
function initCommonNavigation() {
    const navToggle = document.getElementById('navToggle');
    const sideMenu = document.getElementById('sideMenu');
    const closeMenu = document.getElementById('closeMenu');
    const menuOverlay = document.getElementById('menuOverlay');

    // 햄버거 메뉴 토글
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            toggleCommonMenu(true);
        });
    }

    // 메뉴 닫기 버튼
    if (closeMenu) {
        closeMenu.addEventListener('click', function() {
            toggleCommonMenu(false);
        });
    }

    // 오버레이 클릭시 메뉴 닫기
    if (menuOverlay) {
        menuOverlay.addEventListener('click', function() {
            toggleCommonMenu(false);
        });
    }

    // 메뉴 아이템 클릭시 메뉴 닫기
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            toggleCommonMenu(false);
        });
    });

    // ESC 키로 메뉴 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sideMenu && sideMenu.classList.contains('active')) {
            toggleCommonMenu(false);
        }
    });

    // 스크롤시 네비게이션 바 스타일 변경
    const nav = document.getElementById('modernNav');
    if (nav) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 100) {
                nav.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            } else {
                nav.style.boxShadow = 'none';
            }
        });
    }
}

function toggleCommonMenu(show) {
    const navToggle = document.getElementById('navToggle');
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    const body = document.body;

    if (!sideMenu || !menuOverlay) return;

    if (show) {
        if (navToggle) navToggle.classList.add('active');
        sideMenu.classList.add('active');
        menuOverlay.classList.add('active');
        body.style.overflow = 'hidden';
    } else {
        if (navToggle) navToggle.classList.remove('active');
        sideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        body.style.overflow = '';
    }
}

// ============================================
// 테마 토글 (공통)
// ============================================
// 이벤트 리스너는 darkmode.js에서 관리하므로 여기서는 제거
function initCommonTheme() {
    // darkmode.js에서 이미 이벤트 리스너를 등록하므로 여기서는 아무 작업도 하지 않음
}

// ============================================
// 스크롤 애니메이션 유틸리티
// ============================================
function initScrollAnimations(selector = '[data-animate]') {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll(selector);
    animatedElements.forEach(el => observer.observe(el));
}

// ============================================
// 폼 유효성 검사 유틸리티
// ============================================
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;

    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
            showFieldError(field, '이 필드는 필수입니다.');
        } else {
            field.classList.remove('error');
            hideFieldError(field);
        }
    });

    return isValid;
}

function showFieldError(field, message) {
    let errorDiv = field.nextElementSibling;
    if (!errorDiv || !errorDiv.classList.contains('field-error')) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        field.parentNode.insertBefore(errorDiv, field.nextSibling);
    }
    errorDiv.textContent = message;
    errorDiv.style.color = 'var(--danger-color)';
    errorDiv.style.fontSize = '0.875rem';
    errorDiv.style.marginTop = '0.25rem';
}

function hideFieldError(field) {
    const errorDiv = field.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains('field-error')) {
        errorDiv.remove();
    }
}

// ============================================
// 토스트 알림
// ============================================
function showToast(message, type = 'info', duration = 3000) {
    // 토스트 컨테이너 생성 (없으면)
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }

    // 토스트 요소 생성
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    const colors = {
        success: 'var(--success-color)',
        error: 'var(--danger-color)',
        warning: 'var(--warning-color)',
        info: 'var(--info-color)'
    };

    toast.style.cssText = `
        background: ${colors[type] || colors.info};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        min-width: 250px;
        animation: slideInRight 0.3s ease;
    `;

    toast.textContent = message;
    toastContainer.appendChild(toast);

    // 애니메이션 CSS 추가
    if (!document.getElementById('toast-animation')) {
        const style = document.createElement('style');
        style.id = 'toast-animation';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 자동 제거
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================
// 로딩 스피너
// ============================================
function showLoading(target = 'body') {
    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) return;

    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
        <div class="spinner"></div>
        <p>로딩 중...</p>
    `;
    
    spinner.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        z-index: 1000;
    `;

    // 스피너 CSS
    if (!document.getElementById('spinner-style')) {
        const style = document.createElement('style');
        style.id = 'spinner-style';
        style.textContent = `
            .spinner {
                width: 50px;
                height: 50px;
                border: 4px solid var(--border-color);
                border-top-color: var(--primary-color);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            body.dark-mode .loading-spinner {
                background: rgba(15, 23, 42, 0.9) !important;
            }
        `;
        document.head.appendChild(style);
    }

    container.style.position = 'relative';
    container.appendChild(spinner);
}

function hideLoading(target = 'body') {
    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) return;

    const spinner = container.querySelector('.loading-spinner');
    if (spinner) {
        spinner.remove();
    }
}

// ============================================
// 모달 유틸리티
// ============================================
function showModal(title, content, buttons = []) {
    // 기존 모달 제거
    const existingModal = document.getElementById('common-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'common-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: var(--background);
        border-radius: var(--radius-lg);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: var(--shadow-xl);
        animation: slideUp 0.3s ease;
    `;

    const modalHeader = document.createElement('div');
    modalHeader.style.cssText = `
        padding: 1.5rem;
        border-bottom: 1px solid var(--border-color);
        font-size: 1.25rem;
        font-weight: 700;
    `;
    modalHeader.textContent = title;

    const modalBody = document.createElement('div');
    modalBody.style.cssText = `
        padding: 1.5rem;
        color: var(--text-secondary);
    `;
    modalBody.innerHTML = content;

    const modalFooter = document.createElement('div');
    modalFooter.style.cssText = `
        padding: 1.5rem;
        border-top: 1px solid var(--border-color);
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
    `;

    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = `btn ${btn.class || 'btn-secondary'}`;
        button.textContent = btn.text;
        button.onclick = () => {
            if (btn.onClick) btn.onClick();
            closeModal();
        };
        modalFooter.appendChild(button);
    });

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    if (buttons.length > 0) {
        modalContent.appendChild(modalFooter);
    }
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // 애니메이션 CSS
    if (!document.getElementById('modal-animation')) {
        const style = document.createElement('style');
        style.id = 'modal-animation';
        style.textContent = `
            @keyframes slideUp {
                from {
                    transform: translateY(50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 외부 클릭시 닫기
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
}

function closeModal() {
    const modal = document.getElementById('common-modal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 300);
    }
}

// ============================================
// 유틸리티 함수들
// ============================================

// 디바운스
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 쓰로틀
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 반응형 체크
function isMobile() {
    return window.innerWidth < 768;
}

function isTablet() {
    return window.innerWidth >= 768 && window.innerWidth < 1024;
}

function isDesktop() {
    return window.innerWidth >= 1024;
}

// ============================================
// Export (전역 사용)
// ============================================
window.commonUtils = {
    toggleCommonMenu,
    showToast,
    showLoading,
    hideLoading,
    showModal,
    closeModal,
    validateForm,
    initScrollAnimations,
    debounce,
    throttle,
    isMobile,
    isTablet,
    isDesktop
};
