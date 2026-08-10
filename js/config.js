// ==================== CONFIGURATION ====================
const CONFIG = {
    // TMDB API
    TMDB_API_KEY: '41cd097c8beb5d6582f7ab6f11180b6d',
    TMDB_BASE_URL: 'https://api.themoviedb.org/3',
    TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p',
    
    // Streaming Servers (sorted by reliability tier)
    STREAMING_SERVERS: [
        {
            id: 'vidsrc',
            name: 'VidSrc PRO',
            quality: '4K',
            tier: 1,
            icon: 'fa-crown',
            getUrl: (m) => m.type === 'movie' 
                ? `https://vidsrc.to/embed/movie/${m.id}` 
                : `https://vidsrc.to/embed/tv/${m.id}/${m.season}/${m.episode}`
        },
        {
            id: 'vidsrcme',
            name: 'VidSrc.me',
            quality: '1080p',
            tier: 1,
            icon: 'fa-play',
            getUrl: (m) => m.type === 'movie'
                ? `https://vidsrc.me/embed/movie?tmdb=${m.id}`
                : `https://vidsrc.me/embed/tv?tmdb=${m.id}&season=${m.season}&episode=${m.episode}`
        },
        {
            id: 'vidking',
            name: 'VidKing',
            quality: '1080p',
            tier: 1,
            icon: 'fa-bolt',
            getUrl: (m) => m.type === 'movie'
                ? `https://www.vidking.net/embed/movie/${m.id}`
                : `https://www.vidking.net/embed/tv/${m.id}/${m.season}/${m.episode}`
        },
        {
            id: 'autoembed',
            name: 'AutoEmbed',
            quality: '1080p',
            tier: 2,
            icon: 'fa-film',
            getUrl: (m) => m.type === 'movie'
                ? `https://player.autoembed.cc/embed/movie/${m.id}`
                : `https://player.autoembed.cc/embed/tv/${m.id}/${m.season}/${m.episode}`
        },
        {
            id: 'embedsu',
            name: 'Embed.su',
            quality: '1080p',
            tier: 2,
            icon: 'fa-server',
            getUrl: (m) => m.type === 'movie'
                ? `https://embed.su/embed/movie/${m.id}`
                : `https://embed.su/embed/tv/${m.id}/${m.season}/${m.episode}`
        },
        {
            id: '2embed',
            name: '2Embed',
            quality: '1080p',
            tier: 2,
            icon: 'fa-tv',
            getUrl: (m) => m.type === 'movie'
                ? `https://www.2embed.cc/embed/${m.id}`
                : `https://www.2embed.cc/embedtv/${m.id}&s=${m.season}&e=${m.episode}`
        },
        {
            id: 'smashystream',
            name: 'Smashy',
            quality: '1080p',
            tier: 3,
            icon: 'fa-fire',
            getUrl: (m) => m.type === 'movie'
                ? `https://embed.smashystream.com/playere.php?tmdb=${m.id}`
                : `https://embed.smashystream.com/playere.php?tmdb=${m.id}&season=${m.season}&episode=${m.episode}`
        },
        {
            id: 'superembed',
            name: 'SuperEmbed',
            quality: '720p',
            tier: 3,
            icon: 'fa-rocket',
            getUrl: (m) => `https://multiembed.mov/directstream.php?video_id=${m.id}&tmdb=1${m.type === 'tv' ? `&s=${m.season}&e=${m.episode}` : ''}`
        },
        {
            id: 'vidsrcicu',
            name: 'VidSrc.icu',
            quality: '1080p',
            tier: 4,
            icon: 'fa-circle-play',
            getUrl: (m) => m.type === 'movie'
                ? `https://vidsrc.icu/embed/movie/${m.id}`
                : `https://vidsrc.icu/embed/tv/${m.id}/${m.season}/${m.episode}`
        },
        {
            id: 'vidlink',
            name: 'VidLink',
            quality: '720p',
            tier: 4,
            icon: 'fa-link',
            getUrl: (m) => m.type === 'movie'
                ? `https://vidlink.pro/movie/${m.id}`
                : `https://vidlink.pro/tv/${m.id}/${m.season}/${m.episode}`
        }
    ],
    
    // App Settings
    DEFAULT_SETTINGS: {
        theme: 'dark',
        viewMode: 'grid',
        autoplay: true,
        defaultServer: 'vidsrc',
        language: 'en'
    },
    
    // Storage Keys
    STORAGE_KEYS: {
        AUTH: 'streamhub_auth',
        USER_DATA: 'streamhub_user_data',
        SETTINGS: 'streamhub_settings',
        SESSION: 'streamhub_session'
    }
};

// ==================== STATE MANAGEMENT ====================
const AppState = {
    currentUser: null,
    isAuthenticated: false,
    activeServer: 'vidsrc',
    currentMedia: null,
    currentRoute: 'home',
    currentPage: 1,
    viewMode: 'grid',
    isLoading: false,
    
    setUser(user) {
        this.currentUser = user;
        this.isAuthenticated = !!user && !user.isGuest;
        this.triggerEvent('userChanged', user);
    },
    
    setRoute(route) {
        this.currentRoute = route;
        this.triggerEvent('routeChanged', route);
    },
    
    triggerEvent(eventName, data) {
        window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
};

// Make config globally available
window.CONFIG = CONFIG;
window.AppState = AppState;
