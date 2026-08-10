// ==================== API SERVICE ====================
class APIService {
    static BASE_URL = CONFIG.TMDB_BASE_URL;
    static API_KEY = CONFIG.TMDB_API_KEY;
    static IMAGE_BASE = CONFIG.TMDB_IMAGE_BASE;
    static requestCount = 0;
    static rateLimitDelay = 250; // ms between requests
    
    /**
     * Make API request with retry logic and rate limiting
     */
    static async request(endpoint, params = {}) {
        // Rate limiting
        if (this.requestCount > 0) {
            await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        }
        
        this.requestCount++;
        
        const queryParams = new URLSearchParams({
            api_key: this.API_KEY,
            language: 'en-US',
            ...params
        });
        
        const url = `${this.BASE_URL}${endpoint}?${queryParams}`;
        
        try {
            const response = await Utils.retry(async () => {
                const res = await fetch(url, {
                    headers: {
                        'Accept': 'application/json',
                    },
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                });
                
                if (!res.ok) {
                    throw new Error(`API Error: ${res.status} ${res.statusText}`);
                }
                
                return res.json();
            }, 2, 1000);
            
            return response;
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error;
        }
    }
    
    /**
     * Get trending content
     */
    static async getTrending(page = 1) {
        return this.request('/trending/all/week', { page });
    }
    
    /**
     * Get popular movies
     */
    static async getPopularMovies(page = 1) {
        return this.request('/movie/popular', { page });
    }
    
    /**
     * Get popular TV shows
     */
    static async getPopularTV(page = 1) {
        return this.request('/tv/popular', { page });
    }
    
    /**
     * Search multi (movies + TV)
     */
    static async search(query, page = 1) {
        return this.request('/search/multi', {
            query: encodeURIComponent(query),
            page,
            include_adult: false
        });
    }
    
    /**
     * Discover with filters
     */
    static async discover(genre = '', sortBy = 'popularity.desc', page = 1) {
        return this.request('/discover/movie', {
            with_genres: genre,
            sort_by: sortBy,
            page
        });
    }
    
    /**
     * Get movie details
     */
    static async getMovieDetails(id) {
        return this.request(`/movie/${id}`, {
            append_to_response: 'credits,videos,similar'
        });
    }
    
    /**
     * Get TV show details
     */
    static async getTVDetails(id) {
        return this.request(`/tv/${id}`, {
            append_to_response: 'credits,videos,similar'
        });
    }
    
    /**
     * Get TV season episodes
     */
    static async getSeasonEpisodes(tvId, seasonNumber) {
        return this.request(`/tv/${tvId}/season/${seasonNumber}`);
    }
    
    /**
     * Get image URL with specified size
     */
    static getImageUrl(path, size = 'w500') {
        if (!path) {
            return `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" fill="%231a2332"><rect width="200" height="300"/><text x="100" y="150" text-anchor="middle" fill="%239ca3af" font-size="14">No Image</text></svg>')}`;
        }
        return `${this.IMAGE_BASE}/${size}${path}`;
    }
    
    /**
     * Get backdrop image URL
     */
    static getBackdropUrl(path, size = 'original') {
        if (!path) return null;
        return `${this.IMAGE_BASE}/${size}${path}`;
    }
    
    /**
     * Transform API result to common media object
     */
    static transformMedia(item) {
        const isMovie = item.media_type === 'movie' || !!item.title;
        return {
            id: item.id,
            type: isMovie ? 'movie' : 'tv',
            title: isMovie ? item.title : item.name,
            overview: item.overview || 'No overview available.',
            posterPath: item.poster_path,
            backdropPath: item.backdrop_path,
            voteAverage: item.vote_average || 0,
            voteCount: item.vote_count || 0,
            releaseDate: item.release_date || item.first_air_date,
            year: (item.release_date || item.first_air_date || '').split('-')[0],
            genreIds: item.genre_ids || [],
            popularity: item.popularity || 0,
            originalLanguage: item.original_language || 'en',
            adult: item.adult || false,
            ...(isMovie ? {} : {
                name: item.name,
                firstAirDate: item.first_air_date
            })
        };
    }
}

window.APIService = APIService;
