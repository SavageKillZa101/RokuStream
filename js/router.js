// ==================== ROUTER ====================
class Router {
    static routes = {
        home: { title: 'Home', handler: 'loadTrending' },
        movies: { title: 'Movies', handler: 'loadMovies' },
        tv: { title: 'TV Shows', handler: 'loadTV' },
        trending: { title: 'Trending', handler: 'loadTrending' },
        watchlist: { title: 'Watchlist', handler: 'loadWatchlist' },
        search: { title: 'Search', handler: 'loadSearch' }
    };
    
    static currentRoute = 'home';
    static params = {};
    
    /**
     * Initialize router
     */
    static init() {
        // Handle hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
        
        // Handle popstate (browser back/forward)
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.route) {
                this.navigate(e.state.route, e.state.params, false);
            }
        });
        
        // Handle initial route
        this.handleRoute();
        
        // Handle nav link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-route]');
            if (link) {
                e.preventDefault();
                const route = link.dataset.route;
                this.navigate(route);
            }
        });
    }
    
    /**
     * Handle current hash route
     */
    static handleRoute() {
        const hash = window.location.hash.slice(1) || 'home';
        const [route, ...paramParts] = hash.split('/');
        const params = {};
        
        // Parse params from hash
        paramParts.forEach(part => {
            const [key, value] = part.split('=');
            if (key && value) params[key] = decodeURIComponent(value);
        });
        
        if (this.routes[route]) {
            this.loadRoute(route, params);
        } else {
            this.navigate('home');
        }
    }
    
    /**
     * Navigate to a route
     */
    static navigate(route, params = {}, addToHistory = true) {
        if (!this.routes[route]) {
            console.warn(`Route "${route}" not found`);
            route = 'home';
        }
        
        this.currentRoute = route;
        this.params = params;
        
        // Update URL
        const paramString = Object.entries(params)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('/');
        
        const hash = paramString ? `#${route}/${paramString}` : `#${route}`;
        
        if (addToHistory) {
            window.history.pushState({ route, params }, '', hash);
        } else {
            window.history.replaceState({ route, params }, '', hash);
        }
        
        // Update UI
        this.updateActiveLink(route);
        this.loadRoute(route, params);
        
        // Update page title
        document.title = `${this.routes[route].title} - StreamHub Pro`;
    }
    
    /**
     * Load route content
     */
    static loadRoute(route, params = {}) {
        const routeConfig = this.routes[route];
        
        if (routeConfig.handler && typeof App[routeConfig.handler] === 'function') {
            App[routeConfig.handler](params);
        }
        
        AppState.setRoute(route);
    }
    
    /**
     * Update active nav link
     */
    static updateActiveLink(route) {
        document.querySelectorAll('.nav-links a[data-route]').forEach(link => {
            link.classList.toggle('active', link.dataset.route === route);
        });
    }
    
    /**
     * Get current route info
     */
    static getCurrentRoute() {
        return {
            name: this.currentRoute,
            title: this.routes[this.currentRoute]?.title || 'Home',
            params: this.params
        };
    }
}

window.Router = Router;
