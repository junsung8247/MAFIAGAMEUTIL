// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initScrollAnimations();
    initSmoothScroll();
});

// ============================================
// 네비게이션 및 사이드 메뉴
// ============================================
function initNavigation() {
    const navToggle = document.getElementById('navToggle');
    const sideMenu = document.getElementById('sideMenu');
    const closeMenu = document.getElementById('closeMenu');
    const menuOverlay = document.getElementById('menuOverlay');

    // 햄버거 메뉴 토글
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            toggleMenu(true);
        });
    }

    // 메뉴 닫기 버튼
    if (closeMenu) {
        closeMenu.addEventListener('click', function() {
            toggleMenu(false);
        });
    }

    // 오버레이 클릭시 메뉴 닫기
    if (menuOverlay) {
        menuOverlay.addEventListener('click', function() {
            toggleMenu(false);
        });
    }

    // 메뉴 아이템 클릭시 메뉴 닫기
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            toggleMenu(false);
        });
    });

    // ESC 키로 메뉴 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sideMenu && sideMenu.classList.contains('active')) {
            toggleMenu(false);
        }
    });

    // 스크롤시 네비게이션 바 스타일 변경
    const nav = document.getElementById('modernNav');
    if (nav) {
        window.addEventListener('scroll', function() {
            const currentScroll = window.pageYOffset;
            if (currentScroll > 100) {
                nav.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            } else {
                nav.style.boxShadow = 'none';
            }
        });
    }
}

function toggleMenu(show) {
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
// 스크롤 애니메이션
// ============================================
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('aos-animate');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('[data-aos]');
    animatedElements.forEach(el => observer.observe(el));

    // 카드 호버 효과
    const cards = document.querySelectorAll('.feature-card, .tool-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
}

// ============================================
// 부드러운 스크롤
// ============================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);

            if (target) {
                const offsetTop = target.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ============================================
// 카드 마우스 추적 및 클릭 파동 효과
// ============================================
function initCardInteractions() {
    const cards = document.querySelectorAll('.feature-card, .tool-card');
    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');

            const rect = card.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';

            card.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

window.addEventListener('load', function() {
    document.body.classList.add('loaded');
    initCardInteractions();
});

// CSS 애니메이션 추가 (동적)
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(99, 102, 241, 0.2);
        transform: scale(0);
        animation: rippleAnimation 0.6s ease-out;
        pointer-events: none;
    }
    @keyframes rippleAnimation {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
    body.loaded {
        animation: fadeIn 0.5s ease;
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    /* 모달 커스텀 스타일 지원 */
    .notice-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9999;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }
    .notice-modal.is-open {
        display: flex;
    }
    .notice-modal__backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
    }
    .notice-modal__dialog {
        position: relative;
        background: var(--background);
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow-xl);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        padding: 30px;
        z-index: 10;
        animation: modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes modalScaleUp {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }
    .notice-modal__eyebrow {
        font-size: 0.875rem;
        font-weight: 700;
        color: var(--primary-color);
        text-transform: uppercase;
        margin-bottom: 8px;
    }
    .notice-modal__title {
        font-size: 1.5rem;
        font-weight: 800;
        margin-bottom: 12px;
        color: var(--text-primary);
    }
    .notice-modal__lead {
        font-weight: 500;
        color: var(--text-secondary);
        margin-bottom: 20px;
    }
    .notice-modal__highlights {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 24px;
    }
    .notice-modal__highlight-card {
        background: var(--surface);
        border: 1px solid var(--border-color);
        padding: 12px;
        border-radius: var(--radius-md);
        text-align: center;
        font-size: 0.8125rem;
    }
    .notice-modal__highlight-label {
        display: block;
        color: var(--text-tertiary);
        margin-bottom: 4px;
    }
    .notice-modal__body {
        color: var(--text-secondary);
        font-size: 0.9375rem;
        line-height: 1.6;
        margin-bottom: 24px;
    }
    .notice-modal__body p {
        margin-bottom: 12px;
    }
    .notice-modal__signature {
        font-weight: 700;
        color: var(--secondary-color);
    }
    .notice-modal__actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
    }
    .notice-modal__button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 20px;
        font-weight: 600;
        font-size: 0.9375rem;
        border-radius: var(--radius-md);
        border: none;
        cursor: pointer;
        transition: all 0.2s;
    }
    .notice-modal__button--primary {
        background: var(--primary-color);
        color: white;
    }
    .notice-modal__button--primary:hover {
        background: var(--primary-dark);
    }
    .notice-modal__button--secondary {
        background: var(--surface);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
    }
    .notice-modal__button--secondary:hover {
        background: var(--surface-hover);
    }
    body.notice-modal-open {
        overflow: hidden;
    }
    @media (max-width: 576px) {
        .notice-modal__highlights {
            grid-template-columns: 1fr;
            gap: 8px;
        }
        .notice-modal__dialog {
            padding: 20px;
        }
    }
`;
document.head.appendChild(style);
