// ==================== UI CONTROLLER ====================
class UIController {
    /**
     * Show toast notification
     */
    static toast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <span class="toast-message">${Utils.sanitizeHTML(message)}</span>
            <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Close notification">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        // Auto remove
        const removeTimeout = setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, duration);
        
        // Click to dismiss
        toast.addEventListener('click', () => {
            clearTimeout(removeTimeout);
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        });
        
        // Limit number of toasts
        const toasts = container.querySelectorAll('.toast');
        if (toasts.length > 5) {
            toasts[0].classList.add('removing');
            setTimeout(() => toasts[0].remove(), 300);
        }
    }
    
    /**
     * Toggle theme
     */
    static toggleTheme() {
        const themes = ['dark', 'neon', 'light'];
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const currentIndex = themes.indexOf(current);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        
        document.documentElement.setAttribute('data-theme', nextTheme);
        StorageManager.updateSetting('theme', nextTheme);
        
        const themeNames = {
            dark: '🌙 Dark Mode',
            neon: '💜 Neon Mode',
            light: '☀️ Light Mode'
        };
        
        this.toast(`Theme: ${themeNames[nextTheme]}`, 'info', 2000);
    }
    
    /**
     * Toggle user dropdown menu
     */
    static toggleUserMenu() {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('active');
        }
    }
    
    /**
     * Show profile modal
     */
    static showProfile() {
        const user = AppState.currentUser;
        if (!user) return;
        
        // Close dropdown
        document.getElementById('user-dropdown')?.classList.remove('active');
        
        // Update profile modal
        document.getElementById('profile-avatar').textContent = user.avatar || user.name.charAt(0);
        document.getElementById('profile-name').textContent = Utils.sanitizeHTML(user.name);
        document.getElementById('profile-email').textContent = user.email;
        
        const memberSince = user.createdAt 
            ? `Member since ${new Date(user.createdAt).toLocaleDateString()}`
            : '';
        document.getElementById('profile-member-since').textContent = memberSince;
        
        // Update stats
        const watchlist = StorageManager.getWatchlist();
        const history = StorageManager.getContinueWatching();
        document.getElementById('watchlist-count').textContent = watchlist.length;
        document.getElementById('history-count').textContent = history.length;
        
        this.openModal('profile-modal');
    }
    
    /**
     * Set view mode (grid, compact, list)
     */
    static setViewMode(mode) {
        AppState.viewMode = mode;
        
        // Update buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === mode);
        });
        
        // Update grids
        document.querySelectorAll('.media-grid').forEach(grid => {
            grid.classList.remove('compact', 'list');
            if (mode !== 'grid') {
                grid.classList.add(mode);
            }
        });
        
        StorageManager.updateSetting('viewMode', mode);
    }
    
    /**
     * Open modal by ID
     */
    static openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Focus first focusable element
            const focusable = modal.querySelector('button, [href], input, select, textarea');
            if (focusable) {
                setTimeout(() => focusable.focus(), 100);
            }
        }
    }
    
    /**
     * Close modal by ID
     */
    static closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    /**
     * Update user UI after login/logout
     */
    static updateUserUI() {
        const user = AppState.currentUser;
        const signInBtn = document.getElementById('sign-in-btn');
        const userChip = document.getElementById('user-chip');
        
        if (user) {
            // User is logged in
            if (signInBtn) signInBtn.style.display = 'none';
            if (userChip) {
                userChip.style.display = 'flex';
                document.getElementById('nav-avatar').textContent = user.avatar || user.name.charAt(0);
                document.getElementById('nav-username').textContent = user.name;
                document.getElementById('dropdown-avatar').textContent = user.avatar || user.name.charAt(0);
                document.getElementById('dropdown-name').textContent = Utils.sanitizeHTML(user.name);
                document.getElementById('dropdown-email').textContent = user.email;
            }
            
            // Update watchlist count
            const watchlist = StorageManager.getWatchlist();
            const countBadge = document.getElementById('dropdown-watchlist-count');
            if (countBadge) {
                countBadge.textContent = watchlist.length;
                countBadge.style.display = watchlist.length > 0 ? 'inline-flex' : 'none';
            }
        } else {
            // User is logged out
            if (signInBtn) signInBtn.style.display = 'flex';
            if (userChip) userChip.style.display = 'none';
        }
    }
    
    /**
     * Show loading state
     */
    static showLoading() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.style.display = 'flex';
        AppState.isLoading = true;
    }
    
    /**
     * Hide loading state
     */
    static hideLoading() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.style.display = 'none';
        AppState.isLoading = false;
    }
    
    /**
     * Show error state
     */
    static showError(containerId, message, retryCallback = null) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <h3>Something went wrong</h3>
                <p>${Utils.sanitizeHTML(message)}</p>
                ${retryCallback ? `
                    <button class="btn btn-primary" onclick="(${retryCallback.toString()})()">
                        <i class="fa-solid fa-rotate"></i> Try Again
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Show empty state
     */
    static showEmpty(containerId, icon, title, message) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-${icon || 'inbox'}"></i>
                <h3>${Utils.sanitizeHTML(title || 'Nothing here')}</h3>
                <p>${Utils.sanitizeHTML(message || '')}</p>
            </div>
        `;
    }
    
    /**
     * Render skeleton loading cards
     */
    static renderSkeletons(containerId, count = 12) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = Array(count).fill(0).map(() => `
            <div class="card skeleton-card">
                <div class="skeleton" style="aspect-ratio:2/3;"></div>
                <div style="padding:14px;">
                    <div class="skeleton skeleton-text" style="width:80%;"></div>
                    <div class="skeleton skeleton-text" style="width:50%;"></div>
                </div>
            </div>
        `).join('');
    }
}

window.UI = UIController;
