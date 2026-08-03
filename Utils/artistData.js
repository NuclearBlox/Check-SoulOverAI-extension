
async function consultCache(artist) { 
    try {
        const stored = await chrome.storage.local.get(artist);
        const cached = stored[artist];

        if (cached && (Date.now() - cached.timestamp < 1 * 60 * 1000)) { // check if it expired
            return cached.data;
        }
        return false;

    } catch (err) {
        console.error("Error updating cache:", err);
        return false
    }
} 

function updateCache(key) { // checks if the key exists in the cache and returns the value if it does, otherwise returns false
    

} // Called whenever a new song loads to check the cache before making a Supabase call. If the cache is expired.

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
}

function getArtistStatus(artist) { // checks the cache first, if not found or expired, fetches from Supabase and updates the cache

}