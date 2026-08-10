// ==================== AUTHENTICATION SYSTEM ====================
class AuthManager {
    static DB_NAME = 'StreamHubAuthDB';
    static DB_VERSION = 2;
    static SALT = 'StreamHub_Secure_Salt_2024!@#$%';
    
    static async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'email' });
                    userStore.createIndex('email_idx', 'email', { unique: true });
                }
                
                if (!db.objectStoreNames.contains('sessions')) {
                    db.createObjectStore('sessions', { keyPath: 'token' });
                }
            };
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    static async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + this.SALT);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    
    static generateToken() {
        return 'sh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // UI Methods
    static showAuth(mode = 'login') {
        document.getElementById('auth-overlay').classList.add('active');
        this.switchTab(mode);
        this.clearMessages();
        document.getElementById('auth-form').reset();
    }
    
    static hideAuth() {
        document.getElementById('auth-overlay').classList.remove('active');
    }
    
    static switchTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
        
        const isRegister = tab === 'register';
        document.getElementById('name-group').style.display = isRegister ? 'block' : 'none';
        document.getElementById('confirm-group').style.display = isRegister ? 'block' : 'none';
        document.getElementById('remember-me-group').style.display = isRegister ? 'none' : 'flex';
        
        const btn = document.getElementById('auth-submit-btn');
        btn.innerHTML = isRegister 
            ? '<i class="fa-solid fa-user-plus"></i> Create Account'
            : '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
        
        this.clearMessages();
    }
    
    static togglePassword() {
        const pw = document.getElementById('auth-password');
        const icon = document.querySelector('.password-toggle i');
        const isPassword = pw.type === 'password';
        pw.type = isPassword ? 'text' : 'password';
        icon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    }
    
    static showError(msg) {
        const el = document.getElementById('auth-error');
        el.textContent = msg;
        el.classList.add('visible');
        document.getElementById('auth-success').classList.remove('visible');
    }
    
    static showSuccess(msg) {
        const el = document.getElementById('auth-success');
        el.textContent = msg;
        el.classList.add('visible');
        document.getElementById('auth-error').classList.remove('visible');
    }
    
    static clearMessages() {
        document.getElementById('auth-error').classList.remove('visible');
        document.getElementById('auth-success').classList.remove('visible');
    }
    
    // Password strength checker
    static checkPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        const strengthBar = document.getElementById('password-strength');
        const strengthFill = document.getElementById('strength-fill');
        const strengthText = document.getElementById('strength-text');
        
        if (password.length === 0) {
            strengthBar.style.display = 'none';
            return;
        }
        
        strengthBar.style.display = 'block';
        const percentages = ['20%', '40%', '60%', '80%', '100%'];
        const colors = ['#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];
        const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
        
        strengthFill.style.width = percentages[Math.min(score, 4)];
        strengthFill.style.background = colors[Math.min(score, 4)];
        strengthText.textContent = labels[Math.min(score, 4)];
    }
    
    // Form handler
    static async handleSubmit(e) {
        e.preventDefault();
        this.clearMessages();
        
        const isRegister = document.getElementById('name-group').style.display !== 'none';
        const email = document.getElementById('auth-email').value.trim().toLowerCase();
        const password = document.getElementById('auth-password').value;
        
        if (!email || !password) {
            this.showError('Please fill in all required fields');
            return;
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.showError('Please enter a valid email address');
            return;
        }
        
        if (password.length < 8) {
            this.showError('Password must be at least 8 characters');
            return;
        }
        
        const btn = document.getElementById('auth-submit-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Please wait...';
        
        try {
            if (isRegister) {
                const name = document.getElementById('auth-name').value.trim();
                const confirm = document.getElementById('auth-confirm').value;
                
                if (!name) {
                    this.showError('Please enter your full name');
                    btn.disabled = false;
                    return;
                }
                
                if (password !== confirm) {
                    this.showError('Passwords do not match');
                    btn.disabled = false;
                    return;
                }
                
                await this.register(email, password, name);
                this.showSuccess('Account created successfully! Signing you in...');
                setTimeout(() => this.login(email, password), 1000);
            } else {
                await this.login(email, password);
            }
        } catch (err) {
            this.showError(err.message);
            btn.disabled = false;
            btn.innerHTML = isRegister 
                ? '<i class="fa-solid fa-user-plus"></i> Create Account'
                : '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
        }
    }
    
    // Core auth methods
    static async register(email, password, name) {
        const db = await this.initDB();
        const hashedPassword = await this.hashPassword(password);
        
        return new Promise((resolve, reject) => {
            const tx = db.transaction('users', 'readwrite');
            const store = tx.objectStore('users');
            
            const checkRequest = store.get(email);
            checkRequest.onsuccess = () => {
                if (checkRequest.result) {
                    reject(new Error('An account with this email already exists'));
                    return;
                }
                
                const user = {
                    email,
                    password: hashedPassword,
                    name,
                    avatar: name.charAt(0).toUpperCase(),
                    createdAt: new Date().toISOString(),
                    lastLogin: null,
                    settings: CONFIG.DEFAULT_SETTINGS
                };
                
                store.add(user);
                tx.oncomplete = () => resolve(user);
                tx.onerror = () => reject(new Error('Registration failed'));
            };
        });
    }
    
    static async login(email, password) {
        const db = await this.initDB();
        const hashedPassword = await this.hashPassword(password);
        
        return new Promise((resolve, reject) => {
            const tx = db.transaction('users', 'readwrite');
            const store = tx.objectStore('users');
            const request = store.get(email);
            
            request.onsuccess = () => {
                const user = request.result;
                
                if (!user) {
                    reject(new Error('No account found with this email'));
                    return;
                }
                
                if (user.password !== hashedPassword) {
                    reject(new Error('Incorrect password'));
                    return;
                }
                
                // Update last login
                user.lastLogin = new Date().toISOString();
                store.put(user);
                
                // Create session
                const sessionUser = { ...user };
                delete sessionUser.password;
                
                const rememberMe = document.getElementById('remember-me').checked;
                const sessionData = {
                    ...sessionUser,
                    token: this.generateToken(),
                    loginTime: Date.now()
                };
                
                if (rememberMe) {
                    localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
                }
                
                AppState.setUser(sessionUser);
                this.hideAuth();
                UI.toast(`Welcome back, ${user.name}! 👋`, 'success');
                
                tx.oncomplete = () => resolve(sessionUser);
            };
            
            request.onerror = () => reject(new Error('Login failed'));
        });
    }
    
    static guestLogin() {
        const guestUser = {
            email: 'guest@streamhub.local',
            name: 'Guest User',
            avatar: 'G',
            isGuest: true,
            createdAt: new Date().toISOString()
        };
        
        AppState.setUser(guestUser);
        this.hideAuth();
        UI.toast('Signed in as Guest', 'info');
    }
    
    static async logout() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION);
        AppState.setUser(null);
        document.getElementById('user-dropdown')?.classList.remove('active');
        UI.closeModal('profile-modal');
        UI.toast('Signed out successfully', 'info');
    }
    
    static checkSession() {
        const sessionData = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
        if (sessionData) {
            try {
                const user = JSON.parse(sessionData);
                if (user.email && user.token) {
                    AppState.setUser(user);
                    return true;
                }
            } catch (e) {
                localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION);
            }
        }
        return false;
    }
    
    static forgotPassword() {
        UI.toast('Password reset feature coming soon. Please contact support.', 'warning');
    }
}

// Initialize password strength checker
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('auth-password');
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            AuthManager.checkPasswordStrength(e.target.value);
        });
    }
});

window.Auth = AuthManager;
