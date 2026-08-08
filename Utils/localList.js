// File for handling the users personal blacklist and whitelist. for V6
// allowed is true or false. true is whitelist, false is blacklist.


async function consultLocal(key) { 
    try {
        const stored = await chrome.storage.local.get(key);
        const local = stored[key];
        if (local) {
            return local.data;
            return false;
        }
        console.log(`[SoundProof] Local miss for ${key}. Fetching fresh data...`,);
        return false;

    } catch (err) {
        console.error("Error updating cache:", err);
        return false
    }
} 

async function updateLocal(key, allowStatus) {
    await chrome.storage.local.set({
        [key]: allowStatus, 
    
    });

    console.log(`[SoundProof] Local updated for ${key}:`, allowStatus);
}
async function removeLocal(key, allowStatus) {
    await chrome.storage.local.remove(key);
    console.log(`[SoundProof] Local updated for ${key}:`, allowStatus);
}


async function LocalStatus(artist, platformClass) { 
    const key = `sp_local_${platformClass}_${artist.toLowerCase().trim()}`;

        const localData = await consultLocal(key);
        console.log(`[SoundProof] Cache check for ${artist} on ${platformClass}:`, localData ? 'HIT' : 'MISS');
        if (localData) return  localData;
    
}