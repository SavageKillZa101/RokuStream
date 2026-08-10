// ==================== STORAGE MANAGER ====================
class StorageManager {
    static getUserKey() {
        const user = AppState.currentUser;
        if (user && !user.isGuest) {
            return `streamhub_${user.email}`;
        }
        return 'streamhub_guest';
    }
    
    static getData() {
        try {
            const key = this.getUserKey();
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : {
                watchlist: {},
                history: {},
                settings: CONFIG.DEFAULT_SETTINGS
            };
        } catch (e) {
            console.error('Storage read error:', e);
            return { watchlist: {}, history: {}, settings: CONFIG.DEFAULT_SETTINGS };
        }
    }
    
    static saveData(data) {
        try {
            const key = this.getUserKey();
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Storage write error:', e);
            UI.toast('Storage full! Try clearing some data.', 'error');
            return false;
        }
    }
    
    static updateData(updates) {
        const data = this.getData();
        Object.assign(data, updates);
        return this.saveData(data);
    }
    
    // Watchlist operations
    static toggleWatchlist(media) {
        const data = this.getData();
        const key = `${media.id}_${media.type}`;
        
        if (data.watchlist[key]) {
            delete data.watchlist[key];
            this.saveData(data);
            return false;
        } else {
            data.watchlist[key] = {
                ...media,
                addedAt: Date.now()
            };
            this.saveData(data);
            return true;
        }
    }
    
    static isInWatchlist(id, type) {
        const data = this.getData();
        return !!data.watchlist[`${id}_${type}`];
    }
    
    static getWatchlist() {
        const data = this.getData();
        return Object.values(data.watchlist)
            .sort((a, b) => b.addedAt - a.addedAt);
    }
    
    // History operations
    static saveProgress(media) {
        const data = this.getData();
        const key = `${media.id}_${media.type}`;
        
        data.history[key] = {
            ...media,
            progressPct: media.progressPct || Math.floor(Math.random() * 50) + 25,
            timestamp: Date.now()
        };
        
        return this.saveData(data);
    }
    
    static getContinueWatching() {
        const data = this.getData();
        return Object.values(data.history)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 12);
    }
    
    static clearHistory() {
        const data = this.getData();
        data.history = {};
        this.saveData(data);
        UI.toast('Watch history cleared', 'info');
        App.renderContinueWatching();
    }
    
    // Settings
    static getSetting(key) {
        const data = this.getData();
        return data.settings?.[key] ?? CONFIG.DEFAULT_SETTINGS[key];
    }
    
    static updateSetting(key, value) {
        const data = this.getData();
        if (!data.settings) data.settings = {};
        data.settings[key] = value;
        return this.saveData(data);
    }
    
    // Export/Import
    static exportData() {
        const data = {
            ...this.getData(),
            exportDate: new Date().toISOString(),
            version: '2.0',
            user: AppState.currentUser?.email || 'guest'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `streamhub_backup_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        UI.toast('Data exported successfully! 💾', 'success');
    }
    
    static importData() {
        document.getElementById('import-file-input').click();
    }
    
    static handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                
                // Validate import data
                if (!imported.watchlist && !imported.history) {
                    throw new Error('Invalid backup file');
                }
                
                // Merge with existing data
                const currentData = this.getData();
                const merged = {
                    ...currentData,
                    watchlist: { ...currentData.watchlist, ...imported.watchlist },
                    history: { ...currentData.history, ...imported.history }
                };
                
                if (this.saveData(merged)) {
                    UI.toast('Data imported successfully! ✅', 'success');
                    App.refreshContent();
                }
            } catch (err) {
                UI.toast('Invalid backup file format', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
}

window.StorageManager = StorageManager;
