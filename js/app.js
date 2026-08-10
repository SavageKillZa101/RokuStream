// ==================== MAIN APPLICATION ====================
class App {
    static currentPage = 1;
    static totalPages = 1;
    static currentSearchQuery = '';
    
    /**
     * Initialize the application
     */
    static async init() {
        console.log('🚀 StreamHub Pro Initializing...');
        
        // Initialize router
        Router.init();
        
        // Check for existing session
        Auth.checkSession();
        
        // Load saved settings
        this.loadSettings();
        
        // Bind global events
        this.bindEvents();
        
        // Update UI based on auth state
        UI.updateUserUI();
        
        // Listen for auth changes
        window.addEventListener('userChanged', () => {
            UI.updateUserUI();
            this.refreshContent();
        });
        
        // Listen for route changes
        window.addEventListener('routeChanged', (e) => {
            this.handleRouteChange(e.detail);
        });
        
        // Load initial content
        this.loadTrending();
        
        // Service worker registration
        this.registerServiceWorker();
        
        console.log('✅ StreamHub Pro Ready');
    }
    
    /**
     * Register service worker for PWA
     */
    static async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration.scope);
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    }
    
    /**
     * Load saved settings
     */
    static loadSettings() {
        const theme = StorageManager.getSetting('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        
        const viewMode = StorageManager.getSetting('viewMode') || 'grid';
        UI.setViewMode(viewMode);
        
        const defaultServer = StorageManager.getSetting('defaultServer') || 'vidsrc';
        const serverIndex = CONFIG.STREAMING_SERVERS.findIndex(s => s.id === defaultServer);
        if (serverIndex >= 0) {
            VideoPlayer.state.activeServerIndex = serverIndex;
        }
    }
    
    /**
     * Bind global event listeners
     */
    static bindEvents() {
        // Search with debounce
        const searchInput = document.getElementById('search-input');
        const clearSearch = document.getElementById('clear-search');
        
        if (searchInput) {
            const debouncedSearch = Utils.debounce((query) => {
                if (query.length >= 2) {
                    this.currentSearchQuery = query;
                    Router.navigate('search', { q: query });
                } else if (query.length === 0) {
                    this.currentSearchQuery = '';
                    Router.navigate('home');
                }
            }, 400);
            
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                if (clearSearch) {
                    clearSearch.style.display = query.length > 0 ? 'flex' : 'none';
                }
                debouncedSearch(query);
            });
            
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    searchInput.value = '';
                    this.currentSearchQuery = '';
                    if (clearSearch) clearSearch.style.display = 'none';
                    Router.navigate('home');
                    searchInput.blur();
                }
            });
        }
        
        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    this.currentSearchQuery = '';
                    clearSearch.style.display = 'none';
                    Router.navigate('home');
                    searchInput.focus();
                }
            });
        }
        
        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const navLinks = document.getElementById('nav-links');
        
        if (mobileMenuBtn && navLinks) {
            mobileMenuBtn.addEventListener('click', () => {
                navLinks.classList.toggle('mobile-open');
                const isOpen = navLinks.classList.contains('mobile-open');
                mobileMenuBtn.setAttribute('aria-expanded', isOpen);
                mobileMenuBtn.querySelector('i').className = isOpen 
                    ? 'fa-solid fa-xmark' 
                    : 'fa-solid fa-bars';
            });
        }
        
        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#user-menu-container')) {
                document.getElementById('user-dropdown')?.classList.remove('active');
            }
        });
        
        // Close modals on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Close player if open
                if (VideoPlayer.state.isOpen) {
                    VideoPlayer.close();
                    return;
                }
                
                // Close modals
                document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                });
                
                // Close mobile menu
                navLinks?.classList.remove('mobile-open');
            }
        });
        
        // Online/Offline handling
        window.addEventListener('online', () => {
            UI.toast('Back online! 📶', 'success', 3000);
            this.refreshContent();
        });
        
        window.addEventListener('offline', () => {
            UI.toast('You are offline. Some features may be limited.', 'warning', 5000);
        });
        
        // Handle errors globally
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            UI.toast('An unexpected error occurred', 'error');
        });
        
        // Pagination buttons
        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadCurrentContent();
            }
        });
        
        document.getElementById('next-page')?.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadCurrentContent();
            }
        });
    }
    
    /**
     * Handle route change
     */
    static handleRouteChange(route) {
        // Update search input if coming from search
        if (route !== 'search' && this.currentSearchQuery) {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = '';
                document.getElementById('clear-search').style.display = 'none';
            }
            this.currentSearchQuery = '';
        }
    }
    
    /**
     * Load content based on current route
     */
    static loadCurrentContent() {
        switch (Router.currentRoute) {
            case 'home':
            case 'trending':
                this.loadTrending();
                break;
            case 'movies':
                this.loadMovies();
                break;
            case 'tv':
                this.loadTV();
                break;
            case 'watchlist':
                this.loadWatchlist();
                break;
            case 'search':
                this.loadSearch(Router.params);
                break;
        }
    }
    
    /**
     * Load trending content
     */
    static async loadTrending(params = {}) {
        UI.showLoading();
        UI.renderSkeletons('main-grid', 12);
        
        try {
            const page = params.page || this.currentPage;
            const data = await APIService.getTrending(page);
            
            if (data.results && data.results.length > 0) {
                const media = data.results.map(item => APIService.transformMedia(item));
                
                // Update hero with first item
                this.updateHero(media[0]);
                
                // Render grid
                this.renderGrid(media, 'main-grid');
                
                // Update pagination
                this.totalPages = data.total_pages || 1;
                this.updatePagination(page);
                
                document.getElementById('section-title').innerHTML = '<i class="fa-solid fa-fire"></i> Trending Now';
            } else {
                UI.showEmpty('main-grid', 'film', 'No content found', 'Try refreshing or check back later.');
            }
        } catch (error) {
            console.error('Failed to load trending:', error);
            UI.showError('main-grid', 'Failed to load trending content. Please check your connection.', () => this.loadTrending());
        } finally {
            UI.hideLoading();
        }
    }
    
    /**
     * Load popular movies
     */
    static async loadMovies(params = {}) {
        UI.showLoading();
        UI.renderSkeletons('main-grid', 12);
        
        try {
            const page = params.page || this.currentPage;
            const data = await APIService.getPopularMovies(page);
            
            if (data.results && data.results.length > 0) {
                const movies = data.results.map(item => ({
                    ...APIService.transformMedia(item),
                    type: 'movie'
                }));
                
                this.updateHero(movies[0]);
                this.renderGrid(movies, 'main-grid');
                this.totalPages = data.total_pages || 1;
                this.updatePagination(page);
                
                document.getElementById('section-title').innerHTML = '<i class="fa-solid fa-film"></i> Popular Movies';
            }
        } catch (error) {
            UI.showError('main-grid', 'Failed to load movies.', () => this.loadMovies());
        } finally {
            UI.hideLoading();
        }
    }
    
    /**
     * Load popular TV shows
     */
    static async loadTV(params = {}) {
        UI.showLoading();
        UI.renderSkeletons('main-grid', 12);
        
        try {
            const page = params.page || this.currentPage;
            const data = await APIService.getPopularTV(page);
            
            if (data.results && data.results.length > 0) {
                const shows = data.results.map(item => ({
                    ...APIService.transformMedia(item),
                    type: 'tv'
                }));
                
                this.updateHero(shows[0]);
                this.renderGrid(shows, 'main-grid');
                this.totalPages = data.total_pages || 1;
                this.updatePagination(page);
                
                document.getElementById('section-title').innerHTML = '<i class="fa-solid fa-tv"></i> Popular TV Shows';
            }
        } catch (error) {
            UI.showError('main-grid', 'Failed to load TV shows.', () => this.loadTV());
        } finally {
            UI.hideLoading();
        }
    }
    
    /**
     * Load watchlist
     */
    static loadWatchlist(params = {}) {
        UI.showLoading();
        
        const watchlist = StorageManager.getWatchlist();
        
        if (watchlist.length > 0) {
            this.renderGrid(watchlist, 'main-grid');
            document.getElementById('pagination').style.display = 'none';
        } else {
            UI.showEmpty('main-grid', 'bookmark', 'Your watchlist is empty', 
                'Start adding movies and TV shows to build your collection!');
            document.getElementById('pagination').style.display = 'none';
        }
        
        document.getElementById('section-title').innerHTML = '<i class="fa-solid fa-bookmark"></i> My Watchlist';
        document.getElementById('continue-section').style.display = 'none';
        
        UI.hideLoading();
    }
    
    /**
     * Load search results
     */
    static async loadSearch(params = {}) {
        const query = params.q || this.currentSearchQuery;
        if (!query) {
            Router.navigate('home');
            return;
        }
        
        UI.showLoading();
        UI.renderSkeletons('main-grid', 12);
        
        try {
            const page = params.page || this.currentPage;
            const data = await APIService.search(query, page);
            
            if (data.results && data.results.length > 0) {
                const results = data.results
                    .filter(item => item.media_type !== 'person' && item.poster_path)
                    .map(item => APIService.transformMedia(item));
                
                if (results.length > 0) {
                    this.updateHero(results[0]);
                    this.renderGrid(results, 'main-grid');
                    this.totalPages = data.total_pages || 1;
                    this.updatePagination(page);
                }
            } else {
                UI.showEmpty('main-grid', 'search', 'No results found', 
                    `We couldn't find anything for "${Utils.sanitizeHTML(query)}". Try a different search term.`);
            }
            
            document.getElementById('section-title').innerHTML = 
                `<i class="fa-solid fa-search"></i> Results for "${Utils.sanitizeHTML(query)}"`;
        } catch (error) {
            UI.showError('main-grid', 'Search failed. Please try again.', () => this.loadSearch(params));
        } finally {
            UI.hideLoading();
        }
    }
    
    /**
     * Apply genre filters
     */
    static async applyFilters() {
        const genre = document.getElementById('genre-filter')?.value || '';
        const sortBy = 'popularity.desc';
        
        UI.showLoading();
        UI.renderSkeletons('main-grid', 12);
        
        try {
            const data = await APIService.discover(genre, sortBy, this.currentPage);
            
            if (data.results && data.results.length > 0) {
                const movies = data.results.map(item => ({
                    ...APIService.transformMedia(item),
                    type: 'movie'
                }));
                
                this.renderGrid(movies, 'main-grid');
                this.totalPages = data.total_pages || 1;
                this.updatePagination(this.currentPage);
            }
            
            document.getElementById('section-title').innerHTML = 
                '<i class="fa-solid fa-filter"></i> Filtered Results';
        } catch (error) {
            UI.showError('main-grid', 'Failed to apply filters.', () => this.applyFilters());
        } finally {
            UI.hideLoading();
        }
    }
    
    /**
     * Update hero section
     */
    static updateHero(media) {
        if (!media) return;
        
        AppState.currentHero = media;
        
        // Background
        const backdropUrl = APIService.getBackdropUrl(media.backdropPath);
        const heroBg = document.getElementById('hero-background');
        if (heroBg) {
            heroBg.style.backgroundImage = `url(${backdropUrl || APIService.getImageUrl(media.posterPath, 'original')})`;
        }
        
        // Content
        document.getElementById('hero-title').textContent = media.title;
        document.getElementById('hero-rating').innerHTML = `⭐ ${(media.voteAverage || 0).toFixed(1)}`;
        document.getElementById('hero-year').textContent = media.year || 'N/A';
        document.getElementById('hero-type').textContent = media.type === 'movie' ? '🎬 Movie' : '📺 TV Series';
        document.getElementById('hero-description').textContent = media.overview || 'No description available.';
        
        // Play button
        const playBtn = document.getElementById('hero-play-btn');
        if (playBtn) {
            playBtn.onclick = () => {
                VideoPlayer.launch(
                    media.id,
                    media.type,
                    media.title,
                    1,
                    1,
                    media.posterPath,
                    media.voteAverage
                );
            };
        }
        
        // Watchlist button
        const watchlistBtn = document.getElementById('hero-watchlist-btn');
        if (watchlistBtn) {
            const isInWatchlist = StorageManager.isInWatchlist(media.id, media.type);
            watchlistBtn.innerHTML = isInWatchlist
                ? '<i class="fa-solid fa-check"></i> In Watchlist'
                : '<i class="fa-solid fa-plus"></i> Add to Watchlist';
            
            watchlistBtn.onclick = () => {
                const added = StorageManager.toggleWatchlist({
                    id: media.id,
                    type: media.type,
                    title: media.title,
                    posterPath: media.posterPath,
                    voteAverage: media.voteAverage
                });
                
                watchlistBtn.innerHTML = added
                    ? '<i class="fa-solid fa-check"></i> In Watchlist'
                    : '<i class="fa-solid fa-plus"></i> Add to Watchlist';
                
                UI.toast(added ? 'Added to watchlist! 📋' : 'Removed from watchlist', added ? 'success' : 'info');
            };
        }
    }
    
    /**
     * Render media grid
     */
    static renderGrid(items, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!items || items.length === 0) {
            UI.showEmpty(containerId, 'film', 'No content to display');
            return;
        }
        
        container.innerHTML = items.map(item => this.createCardHTML(item)).join('');
        
        // Apply view mode
        if (AppState.viewMode && AppState.viewMode !== 'grid') {
            container.classList.add(AppState.viewMode);
        } else {
            container.classList.remove('compact', 'list');
        }
    }
    
    /**
     * Create card HTML
     */
    static createCardHTML(media) {
        const posterUrl = APIService.getImageUrl(media.posterPath);
        const isInWatchlist = StorageManager.isInWatchlist(media.id, media.type);
        const hasProgress = media.progressPct && media.progressPct > 0;
        
        return `
            <div class="card" 
                 data-id="${media.id}" 
                 data-type="${media.type}" 
                 data-title="${Utils.escapeAttr(media.title)}"
                 data-season="${media.season || 1}" 
                 data-episode="${media.episode || 1}"
                 data-poster="${media.posterPath || ''}"
                 data-rating="${media.voteAverage || 0}"
                 onclick="VideoPlayer.launchFromCard(this)"
                 tabindex="0"
                 role="article"
                 aria-label="${Utils.escapeAttr(media.title)} - ${media.type === 'movie' ? 'Movie' : 'TV Show'}">
                
                <div class="card-poster">
                    <img src="${posterUrl}" 
                         alt="${Utils.escapeAttr(media.title)}" 
                         loading="lazy"
                         onerror="this.src='data:image/svg+xml,${encodeURIComponent('<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22 fill=%22%231a2332%22><rect width=%22200%22 height=%22300%22/><text x=%22100%22 y=%22150%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2214%22>No Image</text></svg>')}'">
                    
                    ${media.type === 'movie' 
                        ? '<div class="card-badge quality">HD</div>'
                        : '<div class="card-badge type">TV</div>'}
                    
                    ${hasProgress ? `
                        <div class="card-progress">
                            <div class="card-progress-fill" style="width:${media.progressPct}%;"></div>
                        </div>
                    ` : ''}
                    
                    <div class="card-overlay">
                        <div class="card-actions">
                            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); VideoPlayer.launchFromCard(this.closest('.card'))">
                                <i class="fa-solid fa-play"></i> Play
                            </button>
                        </div>
                    </div>
                </div>
                
                <button class="card-fav-btn ${isInWatchlist ? 'active' : ''}" 
                        onclick="event.stopPropagation(); App.toggleWatchlist(${media.id}, '${media.type}', '${Utils.escapeAttr(media.title)}', '${media.posterPath || ''}')"
                        aria-label="${isInWatchlist ? 'Remove from' : 'Add to'} watchlist">
                    <i class="fa-solid fa-bookmark"></i>
                </button>
                
                <div class="card-body">
                    <div class="card-title" title="${Utils.escapeAttr(media.title)}">${Utils.sanitizeHTML(media.title)}</div>
                    <div class="card-meta">
                        <span>${media.type === 'movie' ? '🎬 Movie' : '📺 TV'}</span>
                        <span>⭐ ${(media.voteAverage || 0).toFixed(1)}</span>
                        ${hasProgress ? `<span>${media.progressPct}%</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Toggle watchlist item
     */
    static toggleWatchlist(id, type, title, posterPath) {
        const added = StorageManager.toggleWatchlist({ id, type, title, posterPath });
        UI.toast(added ? 'Added to watchlist! 📋' : 'Removed from watchlist', added ? 'success' : 'info');
        
        // Update the specific card
        const card = document.querySelector(`.card[data-id="${id}"][data-type="${type}"]`);
        if (card) {
            const favBtn = card.querySelector('.card-fav-btn');
            if (favBtn) {
                favBtn.classList.toggle('active', added);
            }
        }
        
        UI.updateUserUI();
    }
    
    /**
     * Render continue watching section
     */
    static renderContinueWatching() {
        const section = document.getElementById('continue-section');
        const grid = document.getElementById('continue-grid');
        
        if (!section || !grid) return;
        
        const history = StorageManager.getContinueWatching();
        
        if (history.length === 0) {
            section.style.display = 'none';
            return;
        }
        
        section.style.display = 'block';
        grid.innerHTML = history.map(item => this.createCardHTML(item)).join('');
    }
    
    /**
     * Update pagination UI
     */
    static updatePagination(currentPage) {
        this.currentPage = currentPage;
        
        const pagination = document.getElementById('pagination');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageInfo = document.getElementById('page-info');
        
        if (this.totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }
        
        pagination.style.display = 'flex';
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= this.totalPages;
        pageInfo.textContent = `Page ${currentPage} of ${this.totalPages}`;
    }
    
    /**
     * Refresh current content
     */
    static refreshContent() {
        this.currentPage = 1;
        this.loadCurrentContent();
        this.renderContinueWatching();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export for global access
window.App = App;
