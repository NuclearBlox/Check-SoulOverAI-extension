// File for handling the users personal blacklist and whitelist. for V6



async function consultLocal(key) { 
    try {
        const stored = await chrome.storage.local.get(key);
        const local = stored[key];
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

async function updateLocal(key, statusdata) {
    await chrome.storage.local.set({
        
        [key]: { 
            data: statusdata, 
            expiresAt: Date.now() + getTimeValid(statusdata)
        } 
    
    });
    console.log(`[SoundProof] Cache updated for ${key}:`, statusdata);

}


async function LocalStatus(artist, platformClass, forcedRefresh) { // checks the cache first, if not found or expired, fetches from Supabase and updates the cache
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