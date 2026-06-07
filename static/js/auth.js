// 인증 관련 JavaScript

class AuthManager {
    constructor() {
        this.storageKey = 'mafia_auth';
        this.user = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.lastVerifyTime = 0; // 마지막 검증 시간
        this.verifyCache = 5 * 60 * 1000; // 5분 캐시
        this._initialized = false;
        this._readyPromise = new Promise((resolve) => {
            this._resolveReady = resolve;
        });
        // init()은 DOMContentLoaded에서 호출됨
    }

    init() {
        // 중복 초기화 방지
        if (this._initialized) {
            return this._readyPromise;
        }
        this._initialized = true;

        // localStorage에서 인증 정보 로드
        const authData = localStorage.getItem(this.storageKey);

        // 인증 상태 변경 이벤트 리스너 등록
        window.addEventListener('authStateChanged', (e) => {
            this.user = e.detail.user;
            this.updateUserMenu();
        });

        // 페이지 포커스 시 인증 상태 재확인 (다른 탭에서 로그인/아웃 했을 경우 대응)
        window.addEventListener('focus', () => {
            this.handleVisibilityOrFocus();
        });

        // 탭 활성화 시 토큰 유효성 재확인
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.handleVisibilityOrFocus();
            }
        });

        if (authData) {
            try {
                const data = JSON.parse(authData);
                this.user = data.user;
                this.accessToken = data.session?.access_token;
                this.refreshToken = data.session?.refresh_token;

                // 검증 전까지 로그아웃 상태 유지 (플래시 방지)
                const tempUser = this.user;
                this.user = null;

                // 토큰 유효성 검증 및 자동 갱신 (비동기)
                this.checkAndRefreshToken().then((isValid) => {
                    console.log('[AuthManager] Token validation result:', isValid);
                    if (isValid) {
                        // 검증 성공한 경우 사용자 정보 복원 및 UI 업데이트
                        if (!this.user) this.user = tempUser; // verifyToken에서 설정되지 않았다면 복원
                        this.updateUserMenu();
                    }
                    // 실패한 경우 clearAuth()가 이미 updateUserMenu() 호출함
                    this._markReady();
                });
            } catch (e) {
                this.clearAuth();
                this.updateUserMenu();
                this._markReady();
            }
        } else {
            // 인증 데이터 없음
            this.updateUserMenu();
            this._markReady();
        }

        return this._readyPromise;
    }

    waitForReady() {
        return this._readyPromise;
    }

    _markReady() {
        if (this._resolveReady) {
            this._resolveReady();
            this._resolveReady = null;
        }
    }

    /**
     * 페이지 포커스/활성화 시 인증 상태 재확인
     */
    handleVisibilityOrFocus() {
        const currentAuthData = localStorage.getItem(this.storageKey);

        // localStorage 변경 확인 (다른 탭에서 로그인/로그아웃)
        if (currentAuthData) {
            const data = JSON.parse(currentAuthData);
            const currentUser = data.user;

            if (JSON.stringify(this.user) !== JSON.stringify(currentUser)) {
                this.user = currentUser;
                this.accessToken = data.session?.access_token;
                this.refreshToken = data.session?.refresh_token;
            }
        } else if (this.user) {
            // localStorage가 비었는데 현재 로그인 상태면 로그아웃
            this.clearAuth();
            return;
        }

        // 토큰 유효성 재검증
        if (this.accessToken) {
            this.verifyToken(true).then((isValid) => { // 강제 검증
                this.updateUserMenu();
            });
        }
    }

    async verifyToken(forceCheck = false) {
        if (!this.accessToken) {
            return false;
        }

        // 캐시된 검증 결과 사용 (5분 이내) - forceCheck가 true면 무시
        const now = Date.now();
        if (!forceCheck && this.user && (now - this.lastVerifyTime) < this.verifyCache) {

            console.log('[AuthManager] 캐시된 검증 결과 사용');
            return true;
        }

        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.user = data.user;
                    this.lastVerifyTime = now; // 검증 시간 업데이트
                    return true;
                }
            } else if (response.status === 401) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    // 리프레시 성공 시 새 토큰으로 직접 한 번만 검증
                    const retryResponse = await fetch('/api/auth/me', {
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`
                        }
                    });
                    
                    if (retryResponse.ok) {
                        const retryData = await retryResponse.json();
                        if (retryData.success) {
                            this.user = retryData.user;
                            this.lastVerifyTime = now; // 검증 시간 업데이트
                            return true;
                        }
                    }
                }
                this.clearAuth();
                return false;
            }
            
            this.clearAuth();
            return false;
        } catch (e) {
            console.error('[AuthManager] 토큰 검증 실패:', e);
            this.clearAuth();
            return false;
        }
    }

    async refreshAccessToken() {
        if (!this.refreshToken) {
            this.clearAuth();
            return false;
        }

        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh_token: this.refreshToken
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.accessToken = data.session.access_token;
                    this.refreshToken = data.session.refresh_token;
                    
                    // localStorage 업데이트
                    localStorage.setItem(this.storageKey, JSON.stringify({
                        user: this.user,
                        session: {
                            access_token: this.accessToken,
                            refresh_token: this.refreshToken
                        }
                    }));
                    
                    return true;
                }
            }
            
            this.clearAuth();
            return false;
        } catch (error) {
            this.clearAuth();
            return false;
        }
    }

    async signUp(email, password, username, nickname) {
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, username, nickname })
            });

            const data = await response.json();
            
            if (data.success) {
                // 이메일 인증이 필요한 경우
                if (data.email_confirmation_required) {
                    return data; // 프론트엔드에서 안내 메시지 표시
                }
                
                // 이메일 인증이 필요 없는 경우 자동 로그인
                return await this.signIn(email, password);
            }
            
            return data;
        } catch (e) {
            return { success: false, error: '네트워크 오류가 발생했습니다.' };
        }
    }

    async signIn(email, password) {
        try {
            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            if (data.success) {
                // 인증 정보 저장
                this.user = data.user;
                this.accessToken = data.session.access_token;
                this.refreshToken = data.session.refresh_token;
                
                localStorage.setItem(this.storageKey, JSON.stringify(data));
                this.updateUserMenu();
                
                // 로그인 성공 이벤트 발송
                window.dispatchEvent(new CustomEvent('authStateChanged', {
                    detail: { user: data.user, authenticated: true }
                }));
            }
            
            return data;
        } catch (e) {
            return { success: false, error: '네트워크 오류가 발생했습니다.' };
        }
    }

    async signInWithProvider(provider) {
        try {
            // 백엔드 API를 통해 OAuth URL 생성
            const response = await fetch('/api/auth/oauth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ provider })
            });
            
            const data = await response.json();
            
            if (data.success && data.url) {
                // OAuth 페이지로 리다이렉트
                window.location.href = data.url;
            } else {
                return { success: false, error: data.error || 'OAuth URL 생성 실패' };
            }
        } catch (e) {
            return { success: false, error: '네트워크 오류가 발생했습니다.' };
        }
    }

    async signOut() {
        try {
            await fetch('/api/auth/signout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ access_token: this.accessToken })
            });
        } catch (e) {
            // 오류 무시
        } finally {
            this.clearAuth();
            // 로그아웃 이벤트 발송
            window.dispatchEvent(new CustomEvent('authStateChanged', {
                detail: { user: null, authenticated: false }
            }));
            window.location.href = '/';
        }
    }

    async checkUsername(username) {
        try {
            const response = await fetch('/api/auth/check-username', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });

            const data = await response.json();
            return data.available;
        } catch (e) {
            return false;
        }
    }

    clearAuth() {
        this.user = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.lastVerifyTime = 0; // 캐시 무효화
        localStorage.removeItem(this.storageKey);
        this.updateUserMenu();
        
        // 인증 상태 변경 이벤트 발송
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { user: null, authenticated: false }
        }));
    }

    isAuthenticated() {
        return this.user !== null && this.accessToken !== null;
    }

    getUser() {
        return this.user;
    }

    getAccessToken() {
        return this.accessToken;
    }

    /**
     * JWT 토큰이 만료되었는지 확인
     * @returns {boolean} - 만료되었으면 true
     */
    isTokenExpired() {
        if (!this.accessToken) {
            return true;
        }

        try {
            const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
            const expiresAt = payload.exp * 1000; // 초 -> 밀리초
            return Date.now() >= expiresAt;
        } catch (e) {
            return true; // 파싱 실패 시 만료된 것으로 간주
        }
    }

    /**
     * 인증된 API 요청 (자동 토큰 갱신 포함)
     * @param {string} url - 요청할 URL
     * @param {object} options - fetch 옵션
     * @returns {Promise<Response>} - fetch 응답
     */
    async authenticatedFetch(url, options = {}) {
        // 토큰이 없으면 바로 실패
        if (!this.accessToken) {
            throw new Error('인증이 필요합니다.');
        }

        // 헤더에 Authorization 추가
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.accessToken}`
        };

        // 첫 번째 요청
        let response = await fetch(url, { ...options, headers });

        // 401 에러면 토큰 갱신 후 재시도
        if (response.status === 401) {
            const refreshed = await this.refreshAccessToken();
            
            if (refreshed) {
                // 갱신된 토큰으로 재요청
                headers.Authorization = `Bearer ${this.accessToken}`;
                response = await fetch(url, { ...options, headers });
            } else {
                // 갱신 실패 시 로그아웃
                this.clearAuth();
                throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
            }
        }

        return response;
    }

    /**
     * 토큰 만료 체크 및 자동 갱신
     * 토큰이 만료되었거나 곧 만료될 예정이면 갱신
     * 서버에서 실제 토큰 유효성도 검증
     * @returns {boolean} - 유효한 토큰이 있으면 true
     */
    async checkAndRefreshToken() {
        if (!this.accessToken) {
            return false;
        }

        try {
            // 1. 먼저 서버에서 토큰 유효성 검증 (강제 검증)
            const isValid = await this.verifyToken(true);
            if (!isValid) {
                console.log('[AuthManager] 서버 토큰 검증 실패 - 로그아웃');
                return false;
            }

            // 2. JWT 토큰에서 만료 시간 추출 (추가 체크)
            const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
            const expiresAt = payload.exp * 1000; // 초 -> 밀리초
            const now = Date.now();

            // 만료 5분 전이면 미리 갱신
            const fiveMinutes = 5 * 60 * 1000;
            if (expiresAt - now < fiveMinutes) {
                if (!this.refreshToken) {
                    return true; // 리프레시 토큰 없으면 일단 유효한 토큰 사용
                }
                return await this.refreshAccessToken();
            }

            return true;
        } catch (e) {
            console.error('[AuthManager] 토큰 체크 실패:', e);
            this.clearAuth();
            return false;
        }
    }

    updateUserMenu() {
        const authButtons = document.getElementById('auth-buttons');
        const userMenu = document.getElementById('user-menu');
        
        // 모바일 메뉴 요소들
        const mobileAuthButtons = document.getElementById('mobile-auth-buttons');
        const mobileUserProfile = document.getElementById('mobile-user-profile');
        
        if (!authButtons || !userMenu) {
            return;
        }

        if (this.isAuthenticated()) {
            // 데스크톱: 로그인 버튼들 숨기고 사용자 메뉴 표시
            authButtons.style.display = 'none';
            userMenu.style.display = 'block';
            
            // 모바일: 로그인 버튼들 숨기고 사용자 프로필 표시
            if (mobileAuthButtons) mobileAuthButtons.style.display = 'none';
            if (mobileUserProfile) mobileUserProfile.style.display = 'block';
            
            // 데스크톱 사용자 정보 업데이트
            const usernameEl = document.getElementById('user-menu-username');
            const avatarEl = document.getElementById('user-avatar');
            
            // 모바일 사용자 정보 업데이트
            const mobileUserName = document.getElementById('mobile-user-name');
            const mobileUserEmail = document.getElementById('mobile-user-email');
            const mobileUserAvatar = document.getElementById('mobile-user-avatar');
            
            const displayName = this.user.nickname || this.user.username || this.user.email;
            
            // 데스크톱 업데이트
            if (usernameEl) usernameEl.textContent = displayName;
            if (avatarEl) {
                if (this.user.avatar_url) {
                    avatarEl.innerHTML = `<img src="${this.user.avatar_url}" alt="Avatar">`;
                } else {
                    avatarEl.innerHTML = displayName.charAt(0).toUpperCase();
                }
            }
            
            // 모바일 업데이트
            if (mobileUserName) mobileUserName.textContent = displayName;
            if (mobileUserEmail) mobileUserEmail.textContent = this.user.email;
            if (mobileUserAvatar) {
                if (this.user.avatar_url) {
                    mobileUserAvatar.innerHTML = `<img src="${this.user.avatar_url}" alt="Avatar">`;
                } else {
                    mobileUserAvatar.innerHTML = displayName.charAt(0).toUpperCase();
                }
            }
        } else {
            // 데스크톱: 사용자 메뉴 숨기고 로그인 버튼들 표시
            userMenu.style.display = 'none';
            authButtons.style.display = 'block';
            
            // 모바일: 사용자 프로필 숨기고 로그인 버튼들 표시
            if (mobileAuthButtons) mobileAuthButtons.style.display = 'flex';
            if (mobileUserProfile) mobileUserProfile.style.display = 'none';
        }
    }
}

// 전역 인스턴스
window.authManager = new AuthManager();

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.authManager.init();
    
    // 사용자 메뉴 토글
    const userMenuTrigger = document.getElementById('user-menu-trigger');
    const userMenuDropdown = document.getElementById('user-menu-dropdown');
    
    if (userMenuTrigger && userMenuDropdown) {
        userMenuTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenuDropdown.classList.toggle('show');
        });
        
        // 외부 클릭 시 메뉴 닫기
        document.addEventListener('click', (e) => {
            if (!userMenuDropdown.contains(e.target) && !userMenuTrigger.contains(e.target)) {
                userMenuDropdown.classList.remove('show');
            }
        });
    }
    
    // 로그아웃 버튼
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('로그아웃하시겠습니까?')) {
                window.authManager.signOut();
            }
        });
    }
    
    // 모바일 로그아웃 버튼 이벤트 리스너
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('로그아웃하시겠습니까?')) {
                window.authManager.signOut();
            }
        });
    }
});

// 유틸리티 함수들
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.auth-container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function validateUsername(username) {
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    return re.test(username);
}

// 디버깅을 위한 전역 함수들
window.checkAuthStatus = function() {
    if (window.authManager) {
        if (window.authManager.getAccessToken()) {
            try {
                const payload = JSON.parse(atob(window.authManager.getAccessToken().split('.')[1]));
                const expiresAt = payload.exp * 1000;
            } catch (e) {
                // 토큰 파싱 실패
            }
        }
    }
};

window.forceTokenCheck = function() {
    if (window.authManager) {
        window.authManager.verifyToken(true);
    }
};
