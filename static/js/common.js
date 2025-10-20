// 플라스크 공통 JavaScript 함수들

// 유틸리티 함수들
const CommonUtils = {
    // 숫자 포맷팅
    formatNumber: function(num, decimals = 0) {
        return new Intl.NumberFormat('ko-KR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num);
    },

    // 통화 포맷팅
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },

    // 퍼센트 포맷팅
    formatPercentage: function(value) {
        return new Intl.NumberFormat('ko-KR', {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 2
        }).format(value);
    },

    // 날짜 포맷팅
    formatDate: function(date) {
        return new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);
    },

    // 현재 시간 문자열
    getCurrentTimeString: function() {
        return new Date().toLocaleString('ko-KR');
    },

    // 디바운스 함수
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 쿠키 설정
    setCookie: function(name, value, days = 7) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    },

    // 쿠키 가져오기
    getCookie: function(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    },

    // 로컬 스토리지에 저장
    saveToLocalStorage: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('로컬 스토리지 저장 오류:', error);
            return false;
        }
    },

    // 로컬 스토리지에서 가져오기
    loadFromLocalStorage: function(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('로컬 스토리지 로드 오류:', error);
            return null;
        }
    }
};

// 알림 관련 함수들
const NotificationManager = {
    // 성공 알림
    showSuccess: function(message, duration = 3000) {
        this.showAlert('success', message, duration);
    },

    // 오류 알림
    showError: function(message, duration = 5000) {
        this.showAlert('danger', message, duration);
    },

    // 경고 알림
    showWarning: function(message, duration = 4000) {
        this.showAlert('warning', message, duration);
    },

    // 정보 알림
    showInfo: function(message, duration = 3000) {
        this.showAlert('info', message, duration);
    },

    // 알림 표시 (내부 함수)
    showAlert: function(type, message, duration) {
        // 기존 알림 제거
        const existingAlert = document.querySelector(`.alert-${type}`);
        if (existingAlert) {
            existingAlert.remove();
        }

        // 새 알림 생성
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px; max-width: 400px;';
        
        const iconClass = this.getIconClass(type);
        alert.innerHTML = `
            <div class="d-flex align-items-center">
                <i data-lucide="${iconClass}" class="me-2"></i>
                <div class="flex-grow-1">${message}</div>
                <button type="button" class="btn-close ms-2" data-bs-dismiss="alert"></button>
            </div>
        `;

        // 페이지에 추가
        document.body.appendChild(alert);

        // 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 자동 제거
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, duration);
    },

    // 아이콘 클래스 반환
    getIconClass: function(type) {
        const iconMap = {
            'success': 'check-circle',
            'danger': 'alert-circle',
            'warning': 'alert-triangle',
            'info': 'info'
        };
        return iconMap[type] || 'info';
    }
};

// 폼 관련 함수들
const FormManager = {
    // 폼 데이터 수집
    collectFormData: function(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};

        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            // 숫자 필드는 숫자로 변환
            if (value && !isNaN(value) && value.trim() !== '') {
                data[key] = parseFloat(value);
            } else {
                data[key] = value;
            }
        }
        
        return data;
    },

    // 폼 유효성 검사
    validateForm: function(formId, rules) {
        const form = document.getElementById(formId);
        if (!form) return false;

        let isValid = true;
        
        // 모든 입력 필드에서 에러 클래스 제거
        form.querySelectorAll('.is-invalid').forEach(field => {
            field.classList.remove('is-invalid');
        });

        // 규칙에 따른 검증
        Object.keys(rules).forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (!field) return;

            const value = field.value;
            const rule = rules[fieldName];

            // 필수 필드 검사
            if (rule.required && (!value || value.trim() === '')) {
                this.showFieldError(field, rule.requiredMessage || `${fieldName}은(는) 필수입니다.`);
                isValid = false;
                return;
            }

            // 숫자 필드 검사
            if (rule.type === 'number') {
                const numValue = parseFloat(value);
                if (value && (isNaN(numValue) || numValue < 0)) {
                    this.showFieldError(field, rule.numberMessage || '올바른 숫자를 입력해주세요.');
                    isValid = false;
                    return;
                }
            }

            // 최대값 검사
            if (rule.max && parseFloat(value) > rule.max) {
                this.showFieldError(field, rule.maxMessage || `최대값은 ${rule.max}입니다.`);
                isValid = false;
                return;
            }

            // 최소값 검사
            if (rule.min && parseFloat(value) < rule.min) {
                this.showFieldError(field, rule.minMessage || `최소값은 ${rule.min}입니다.`);
                isValid = false;
                return;
            }
        });

        return isValid;
    },

    // 필드 에러 표시
    showFieldError: function(field, message) {
        field.classList.add('is-invalid');
        
        // 기존 에러 메시지 제거
        const existingFeedback = field.parentNode.querySelector('.invalid-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        // 새 에러 메시지 추가
        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        feedback.textContent = message;
        field.parentNode.appendChild(feedback);
    },

    // 폼 리셋
    resetForm: function(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            form.querySelectorAll('.is-invalid').forEach(field => {
                field.classList.remove('is-invalid');
            });
            form.querySelectorAll('.invalid-feedback').forEach(feedback => {
                feedback.remove();
            });
        }
    }
};

// API 관련 함수들
const ApiManager = {
    // 기본 fetch 함수
    fetch: async function(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const mergedOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await window.fetch(url, mergedOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API 요청 오류:', error);
            throw error;
        }
    },

    // POST 요청
    post: function(url, data) {
        return this.fetch(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // GET 요청
    get: function(url) {
        return this.fetch(url, {
            method: 'GET'
        });
    },

    // PUT 요청
    put: function(url, data) {
        return this.fetch(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // DELETE 요청
    delete: function(url) {
        return this.fetch(url, {
            method: 'DELETE'
        });
    }
};

// 전역 함수로 노출
window.CommonUtils = CommonUtils;
window.NotificationManager = NotificationManager;
window.FormManager = FormManager;
window.ApiManager = ApiManager;

// 편의 함수들
window.showSuccess = NotificationManager.showSuccess.bind(NotificationManager);
window.showError = NotificationManager.showError.bind(NotificationManager);
window.showWarning = NotificationManager.showWarning.bind(NotificationManager);
window.showInfo = NotificationManager.showInfo.bind(NotificationManager);
