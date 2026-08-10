// ==================== VIDEO PLAYER ====================
class VideoPlayer {
    static state = {
        isOpen: false,
        currentMedia: null,
        activeServerIndex: 0,
        speedIndex: 2, // 1.0x
        speeds: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0],
        episodes: [],
        selectedSeason: 1,
        selectedEpisode: 1,
        isLoading: false
    };
    
    /**
     * Launch player with media
     */
    static launch(id, type, title, season = 1, episode = 1, posterPath = '', voteAverage = null) {
        // Set media info
        this.state.currentMedia = {
            id,
            type,
            title,
            season: parseInt(season),
            episode: parseInt(episode),
            posterPath,
            voteAverage
        };
        
        this.state.selectedSeason = parseInt(season);
        this.state.selectedEpisode = parseInt(episode);
        
        // Update UI
        document.getElementById('player-title').textContent = Utils.sanitizeHTML(title);
        this.updatePlayerMeta();
        
        // Show player
        const modal = document.getElementById('player-modal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.state.isOpen = true;
        
        // Render servers
        this.renderServers();
        
        // Handle TV shows
        if (type === 'tv') {
            document.getElementById('tv-section').style.display = 'block';
            this.loadSeasons(id);
        } else {
            document.getElementById('tv-section').style.display = 'none';
        }
        
        // Load stream
        this.loadStream();
        
        // Save to history
        StorageManager.saveProgress(this.state.currentMedia);
        
        // Focus trap for accessibility
        this.setupFocusTrap();
    }
    
    /**
     * Launch from card element
     */
    static launchFromCard(cardElement) {
        const dataset = cardElement.dataset;
        this.launch(
            parseInt(dataset.id),
            dataset.type,
            dataset.title,
            parseInt(dataset.season) || 1,
            parseInt(dataset.episode) || 1,
            dataset.poster || '',
            parseFloat(dataset.rating) || null
        );
    }
    
    /**
     * Update player meta info
     */
    static updatePlayerMeta() {
        const media = this.state.currentMedia;
        if (!media) return;
        
        const meta = document.getElementById('player-meta');
        if (media.type === 'movie') {
            meta.textContent = `🎬 Movie`;
        } else {
            meta.textContent = `📺 Season ${media.season} • Episode ${media.episode}`;
        }
    }
    
    /**
     * Render server list
     */
    static renderServers() {
        const grid = document.getElementById('server-grid');
        if (!grid) return;
        
        grid.innerHTML = CONFIG.STREAMING_SERVERS.map((server, index) => {
            const isActive = index === this.state.activeServerIndex;
            const tierLabel = server.tier <= 1 ? 'Premium' : server.tier <= 2 ? 'Reliable' : server.tier <= 3 ? 'Standard' : 'Backup';
            
            return `
                <div class="server-card ${isActive ? 'active' : ''}" 
                     onclick="VideoPlayer.switchServer(${index})"
                     role="button"
                     tabindex="0"
                     aria-pressed="${isActive}"
                     title="${server.name} - ${server.quality} (${tierLabel})">
                    <span class="server-status ${server.tier <= 2 ? 'online' : ''}"></span>
                    <i class="fa-solid ${server.icon}"></i>
                    <div class="server-info">
                        <span class="server-name">${Utils.sanitizeHTML(server.name)}</span>
                        <span class="server-quality">${server.quality}</span>
                    </div>
                    ${server.tier <= 1 ? '<span class="server-premium">PRO</span>' : ''}
                </div>
            `;
        }).join('');
    }
    
    /**
     * Switch active server
     */
    static switchServer(index) {
        if (index === this.state.activeServerIndex) return;
        
        this.state.activeServerIndex = index;
        this.renderServers();
        this.loadStream();
        
        const server = CONFIG.STREAMING_SERVERS[index];
        UI.toast(`Switched to ${server.name} (${server.quality})`, 'info');
    }
    
    /**
     * Navigate to next server
     */
    static nextServer() {
        const nextIndex = (this.state.activeServerIndex + 1) % CONFIG.STREAMING_SERVERS.length;
        this.switchServer(nextIndex);
    }
    
    /**
     * Navigate to previous server
     */
    static previousServer() {
        const prevIndex = (this.state.activeServerIndex - 1 + CONFIG.STREAMING_SERVERS.length) % CONFIG.STREAMING_SERVERS.length;
        this.switchServer(prevIndex);
    }
    
    /**
     * Load video stream
     */
    static loadStream() {
        const media = this.state.currentMedia;
        if (!media) return;
        
        const server = CONFIG.STREAMING_SERVERS[this.state.activeServerIndex];
        const frame = document.getElementById('video-frame');
        
        if (!frame) return;
        
        this.state.isLoading = true;
        
        try {
            const url = server.getUrl({
                id: media.id,
                type: media.type,
                season: media.selectedSeason || media.season,
                episode: media.selectedEpisode || media.episode
            });
            
            frame.src = url;
            frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups');
            
            // Track loading
            frame.onload = () => {
                this.state.isLoading = false;
            };
            
            frame.onerror = () => {
                this.state.isLoading = false;
                // Auto-switch to next server on error
                setTimeout(() => this.nextServer(), 2000);
            };
            
        } catch (error) {
            console.error('Failed to load stream:', error);
            this.state.isLoading = false;
            UI.toast('Failed to load stream. Trying next server...', 'error');
            setTimeout(() => this.nextServer(), 1500);
        }
    }
    
    /**
     * Reload current stream
     */
    static reloadPlayer() {
        const frame = document.getElementById('video-frame');
        if (frame) {
            frame.src = frame.src;
        }
    }
    
    /**
     * Load TV seasons
     */
    static async loadSeasons(tvId) {
        try {
            const data = await APIService.getTVDetails(tvId);
            const seasons = (data.seasons || []).filter(s => s.season_number > 0);
            
            const select = document.getElementById('season-select');
            if (select) {
                select.innerHTML = seasons.map(s => `
                    <option value="${s.season_number}" ${s.season_number === this.state.selectedSeason ? 'selected' : ''}>
                        Season ${s.season_number} (${s.episode_count || '?'} Episodes)
                    </option>
                `).join('');
            }
            
            await this.loadEpisodes();
        } catch (error) {
            console.error('Failed to load seasons:', error);
            UI.toast('Failed to load season data', 'error');
        }
    }
    
    /**
     * Load episodes for selected season
     */
    static async loadEpisodes() {
        const media = this.state.currentMedia;
        if (!media || media.type !== 'tv') return;
        
        const seasonNum = parseInt(document.getElementById('season-select')?.value) || this.state.selectedSeason;
        this.state.selectedSeason = seasonNum;
        
        try {
            const data = await APIService.getSeasonEpisodes(media.id, seasonNum);
            const episodes = data.episodes || [];
            this.state.episodes = episodes;
            
            const list = document.getElementById('episode-list');
            if (!list) return;
            
            list.innerHTML = episodes.map(ep => {
                const isActive = ep.episode_number === this.state.selectedEpisode;
                const stillUrl = ep.still_path 
                    ? APIService.getImageUrl(ep.still_path, 'w300')
                    : `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="68" fill="%231a2332"><text x="60" y="38" text-anchor="middle" fill="%239ca3af" font-size="12">No Preview</text></svg>')}`;
                
                return `
                    <div class="episode-item ${isActive ? 'active' : ''}" 
                         onclick="VideoPlayer.selectEpisode(${ep.episode_number})"
                         role="button"
                         tabindex="0"
                         aria-selected="${isActive}">
                        <img src="${stillUrl}" 
                             alt="Episode ${ep.episode_number}" 
                             loading="lazy"
                             onerror="this.src='data:image/svg+xml,${encodeURIComponent('<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2268%22 fill=%22%231a2332%22><text x=%2260%22 y=%2238%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2212%22>E${ep.episode_number}</text></svg>')}'">
                        <div class="episode-details">
                            <span class="episode-number">EP ${ep.episode_number}</span>
                            <span class="episode-name">${Utils.sanitizeHTML(ep.name || 'Untitled')}</span>
                            ${ep.runtime ? `<span class="episode-runtime">${Utils.formatRuntime(ep.runtime)}</span>` : ''}
                            ${ep.vote_average ? `<span class="episode-rating">⭐ ${ep.vote_average.toFixed(1)}</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Failed to load episodes:', error);
        }
    }
    
    /**
     * Select episode to play
     */
    static selectEpisode(episodeNum) {
        this.state.selectedEpisode = episodeNum;
        
        if (this.state.currentMedia) {
            this.state.currentMedia.episode = episodeNum;
            this.state.currentMedia.season = this.state.selectedSeason;
        }
        
        this.updatePlayerMeta();
        this.loadEpisodes();
        this.loadStream();
        
        // Scroll to selected episode
        const activeEpisode = document.querySelector('.episode-item.active');
        if (activeEpisode) {
            activeEpisode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    /**
     * Cycle playback speed
     */
    static cycleSpeed() {
        this.state.speedIndex = (this.state.speedIndex + 1) % this.state.speeds.length;
        const speed = this.state.speeds[this.state.speedIndex];
        
        const indicator = document.getElementById('speed-indicator');
        if (indicator) {
            indicator.textContent = `${speed.toFixed(1)}x`;
        }
        
        UI.toast(`Playback speed: ${speed}x`, 'info');
    }
    
    /**
     * Toggle Picture-in-Picture
     */
    static async togglePiP() {
        try {
            const frame = document.getElementById('video-frame');
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                UI.toast('Picture-in-Picture disabled', 'info');
            } else if (frame.contentDocument) {
                const video = frame.contentDocument.querySelector('video');
                if (video) {
                    await video.requestPictureInPicture();
                    UI.toast('Picture-in-Picture enabled', 'success');
                } else {
                    UI.toast('PiP not available for this stream', 'warning');
                }
            }
        } catch (error) {
            console.error('PiP error:', error);
        }
    }
    
    /**
     * Toggle fullscreen
     */
    static toggleFullscreen() {
        const playerModal = document.getElementById('player-modal');
        if (!document.fullscreenElement) {
            playerModal.requestFullscreen().catch(err => {
                console.error('Fullscreen error:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    /**
     * Setup focus trap for accessibility
     */
    static setupFocusTrap() {
        const playerModal = document.getElementById('player-modal');
        const focusableElements = playerModal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }
    
    /**
     * Close player
     */
    static close() {
        const frame = document.getElementById('video-frame');
        if (frame) {
            frame.src = '';
        }
        
        const modal = document.getElementById('player-modal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        this.state.isOpen = false;
        this.state.currentMedia = null;
        
        // Refresh continue watching
        if (typeof App !== 'undefined' && App.renderContinueWatching) {
            App.renderContinueWatching();
        }
    }
}

window.Player = VideoPlayer;
