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
            getUrl: (m) => m.type === 'movie
