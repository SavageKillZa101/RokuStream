const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const TMDB_API_KEY = "YOUR_TMDB_API_KEY_HERE"; // Your TMDb Key

// 1. Fetch Netflix-style categories for Roku UI
app.get('/api/trending', async (req, res) => {
    try {
        const response = await axios.get(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`);
        res.json(response.data.results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Resolve FebBox direct stream for a TMDB ID
app.get('/api/stream/:tmdbId', async (req, res) => {
    const { tmdbId } = req.params;
    try {
        // Example FebBox direct stream extraction endpoint
        // (Uses FebBox share key / file resolution API)
        const febboxResponse = await axios.get(`https://www.febbox.com/open/file/link?tmdb_id=${tmdbId}`);
        const streamUrl = febboxResponse.data.direct_url; 
        
        res.json({ streamUrl: streamUrl });
    } catch (err) {
        res.status(500).json({ error: "Could not resolve FebBox stream" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
