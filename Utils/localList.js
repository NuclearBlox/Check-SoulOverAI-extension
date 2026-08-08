// File for handling the users personal blacklist and whitelist.
// listType is 'white' or 'black'.

async function consultLocal(key) {
    try {
        const stored = await chrome.storage.local.get(key);
        const local = stored[key];
        if (local) {
            return local;
        }
        console.log(`[SoundProof] Local miss for ${key}.`);
        return false;
    } catch (err) {
        console.error("Error reading local override:", err);
        return false;
    }
}

async function updateLocal(key, listType) {
    await chrome.storage.local.set({
        [key]: listType,
    });
    console.log(`[SoundProof] Local updated for ${key}:`, listType);
}

async function setLocalStatus(artist, platformClass, listType) {
    const key = `sp_local_${platformClass}_${artist.toLowerCase().trim()}`;
    await updateLocal(key, listType);
}

async function clearLocalStatus(artist, platformClass) {
    const key = `sp_local_${platformClass}_${artist.toLowerCase().trim()}`;
    await removeLocal(key);
}

async function getLocalStatus(artist, platformClass) {
    const key = `sp_local_${platformClass}_${artist.toLowerCase().trim()}`;
    const localData = await consultLocal(key);
    console.log(`[SoundProof] Local check for ${artist} on ${platformClass}:`, localData ? localData : 'none');
    return localData; // 'white', 'black', or false
}