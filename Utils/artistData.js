
async function consultCache(key) { 
    try {
        const stored = await chrome.storage.local.get(key);
        const cached = stored[key];
        console.log(`[SoundProof] Cache check for ${key}:`, cached ? 'HIT' : 'MISS',);
        if (cached && (Date.now() - cached.timestamp < 1 * 60 * 1000)) { // check if it expired CURRENTLY SET TO 1 MINUTE FOR TESTING, CHANGE THIS LATER
            return cached.data;
        }
        console.log(`[SoundProof] Cache miss or expired for ${key}. Fetching fresh data...`,);
        return false;

    } catch (err) {
        console.error("Error updating cache:", err);
        return false
    }
} 

async function updateCache(key, statusdata) {
    await chrome.storage.local.set({
        
        [key]: { 
            data: statusdata, 
            timestamp: Date.now() } 
    
    });
    console.log(`[SoundProof] Cache updated for ${key}:`, statusdata);

}

async function fetchDataFromSupabase(artist, platformClass) {
    try {
        const { data, error } = await window.supabaseClient.rpc('get_artist_status', {
            target_id: artist.toLowerCase().trim(),
            platform_input: platformClass
        });

        if (error) throw error;
        
        return Array.isArray(data) ? (data[0] ?? DEFAULT_STATUS) : (data ?? DEFAULT_STATUS);
    } catch (err) {
        console.error('Supabase fetch error:', err);
        return DEFAULT_STATUS;
    }
    console.log(`[SoundProof] Fetched data for ${artist} on ${platformClass}:`, data);
}

async function getArtistStatus(artist, platformClass, forcedRefresh) { // checks the cache first, if not found or expired, fetches from Supabase and updates the cache
    const key = `sp_${platformClass}_${artist.toLowerCase().trim()}`;

    if (!forcedRefresh) {
        const cachedData = await consultCache(key);
        console.log(`[SoundProof] Cache check for ${artist} on ${platformClass}:`, cachedData ? 'HIT' : 'MISS');
        if (cachedData) return  cachedData;
    }

    const liveData = await fetchDataFromSupabase(artist, platformClass);
    await updateCache(key, liveData);
    return liveData;
}