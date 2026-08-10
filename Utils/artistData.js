

async function consultCache(key) { 
    try {
        const stored = await chrome.storage.local.get(key);
        const cached = stored[key];
        //console.log(`[SoundProof] Cache check for ${key}:`, cached ? 'HIT' : 'MISS',);
        if (cached && (Date.now() < cached.expiresAt)) {
            return cached.data;
        } else if (cached && Date.now() > cached.expiresAt) {
            console.log(`[SoundProof] Cache expired for ${key}. Fetching fresh data...`,);
            await chrome.storage.local.remove(key);
            return false;
        }
        console.log(`[SoundProof] Cache miss for ${key}. Fetching fresh data...`,);
        return false;

    } catch (err) {
        console.error("Error updating cache:", err);
        return false
    }
} 

function getTimeValid(status) {
    const margin = Math.abs(status.out_score ?? 0);
    console.log(`[SoundProof] Determining cache duration for `, margin);

    if (status.out_verified === true) {
        return 20 * 24 * 60 * 60 * 1000; // 20 days
    } else if (margin >= 10) {
        return 5 * 24 * 60 * 60 * 1000; // 5 days — decisive
    } else if (margin >= 3) {
        return 1 * 24 * 60 * 60 * 1000; // 1 day
    } else if (margin >= 1) {
        return 3 * 60 * 60 * 1000; // 3 hours — could flip on the next vote
    }
    return 0; // tied or no votes — don't cache
}

async function updateCache(key, statusdata) {
    await chrome.storage.local.set({
        
        [key]: { 
            data: statusdata, 
            expiresAt: Date.now() + getTimeValid(statusdata)
        } 
    
    });
    console.log(`[SoundProof] Cache updated for ${key}:`, statusdata);

}

async function fetchDataFromSupabase(artist, platformClass) {
    try {
        const { data, error } = await window.supabaseClient.rpc('get_artist_status', {
            target_id: artist.toLowerCase().trim(),
            platform_input: platformClass
        });
          console.log(`[SoundProof] Fetched data for ${artist} on ${platformClass}:`, data);
        if (error) throw error;
        
        return Array.isArray(data) ? (data[0] ?? DEFAULT_STATUS) : (data ?? DEFAULT_STATUS);
    } catch (err) {
        console.error('Supabase fetch error:', err);
        return DEFAULT_STATUS;
    }

}

async function getArtistStatus(artist, platformClass, forcedRefresh) { // checks the cache first, if not found or expired, fetches from Supabase and updates the cache
    const key = `sp_${platformClass}_${artist.toLowerCase().trim()}`;

    if (forcedRefresh == false) {
        const cachedData = await consultCache(key);
        console.log(`[SoundProof] Cache check for ${artist} on ${platformClass}:`, cachedData ? 'HIT' : 'MISS');
        if (cachedData) return  cachedData;
    }
    console.log(`[SoundProof] Forced refresh for ${artist} on ${platformClass}...`);
    const liveData = await fetchDataFromSupabase(artist, platformClass);
    await updateCache(key, liveData);
    return liveData;
}