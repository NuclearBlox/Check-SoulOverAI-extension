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

async function removeLocal(key) {
    await chrome.storage.local.remove(key);
}

async function getLocalStatus(artist, platformClass) {
    const key = `sp_local_${platformClass}_${artist.toLowerCase().trim()}`;
    const localData = await consultLocal(key);
    console.log(`[SoundProof] Local check for ${artist} on ${platformClass}:`, localData ? localData : 'none');
    return localData; // 'white', 'black', or false
}

// --- Popup banner: whitelist/blacklist prompt & status ---

const LOCAL_LIST_STYLES = `
    #locallist-banner {
        width: 398px;
        padding: 12px 14px;
        border-radius: 12px;
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        font-family: 'Inter', sans-serif;
        background: rgba(18, 18, 22, 0.85);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        box-sizing: border-box;
    }

    .ll-text { 
        display: flex; 
        flex-direction: column; 
        gap: 2px; 
        flex: 1;
        min-width: 0;
    }
    .ll-title { 
        font-size: 12px; 
        font-weight: 800; 
        color: var(--text); 
        line-height: 1.2;
    }
    .ll-sub { 
        font-size: 10px; 
        color: var(--dim); 
        line-height: 1.3;
        font-weight: 500;
    }

    /* Base button matching .btn style from the primary popup */
    .ll-btn {
        flex-shrink: 0; 
        height: 34px;
        padding: 0 14px; 
        border-radius: 9px; 
        border: 2.5px solid transparent; 
        cursor: pointer;
        font-size: 12px; 
        font-weight: 800;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
    }

    /* Solid state matching .btn-h / .btn-a */
    .ll-btn.white { 
        background: var(--human); 
        color: #052e16; 
        border-color: var(--human); 
    }
    .ll-btn.black { 
        background: var(--ai); 
        color: #450a0a; 
        border-color: var(--ai); 
    }

    /* Outlined hover state matching .btn-h:hover / .btn-a:hover */
    .ll-btn.white:hover { 
        background: transparent !important; 
        color: var(--human); 
    }
    .ll-btn.black:hover { 
        background: transparent !important; 
        color: var(--ai); 
    }
`;

function injectLocalListStyles(shadow) {
    if (shadow.querySelector('#locallist-styles')) return; // don't duplicate on re-render
    const style = document.createElement('style');
    style.id = 'locallist-styles';
    style.textContent = LOCAL_LIST_STYLES;
    shadow.appendChild(style);
}

async function renderLocalListBanner(shadow, artist, platformClass, status, badge, label) {
    injectLocalListStyles(shadow);
    const banner = shadow.querySelector('#locallist-banner');
    if (!banner) return;

    const hasVote = status.my_current_vote !== null;
    const isVerified = status.out_verified === true;

    if (!hasVote && !isVerified) {
        banner.style.display = 'none';
        banner.innerHTML = '';
        return;
    }

    const localStatus = await getLocalStatus(artist, platformClass);
    banner.style.display = 'flex';

    if (localStatus === 'white') {
        banner.className = 'white';
        banner.innerHTML = `
            <div class="ll-text">
                <span class="ll-title">This artist is whitelisted!</span>
                <span class="ll-sub">This artist will always play</span>
            </div>
            <button class="ll-btn white" id="ll-remove">Remove</button>`;
    } else if (localStatus === 'black') {
        banner.className = 'black';
        banner.innerHTML = `
            <div class="ll-text">
                <span class="ll-title">Blacklisted artist skipped</span>
                <span class="ll-sub">This artist will always skip</span>
            </div>
            <button class="ll-btn black" id="ll-remove">Remove</button>`;
    } else if (isVerified && label === 'AI') {
        banner.className = 'white';
        banner.innerHTML = `
            <div class="ll-text">
                <span class="ll-title">AI artist skipped</span>
                <span class="ll-sub">Verified AI artist are locked at 100%. Would you like to play their music anyway?</span>
            </div>
            <button class="ll-btn white" id="ll-whitelist">Whitelist</button>`;
    } else if (isVerified && label === 'HUMAN') {
        banner.className = 'black';
        banner.innerHTML = `
            <div class="ll-text">
                <span class="ll-title">Verified human artist</span>
                <span class="ll-sub">This artist always plays by default. Want to blacklist and always skip it instead?</span>
            </div>
            <button class="ll-btn black" id="ll-blacklist">Blacklist</button>`;
    } else if (hasVote) {
        banner.className = 'white';
        banner.innerHTML = `
            <div class="ll-text">
                <span class="ll-title">Would you like to whitelist this artist?</span>
                <span class="ll-sub">Whitelisting will always play them regardless of score</span>
            </div>
            <button class="ll-btn white" id="ll-whitelist">Whitelist</button>`;
    } else {
        banner.style.display = 'none';
        banner.innerHTML = '';
        return;
    }

    const wBtn = shadow.querySelector('#ll-whitelist');
    const bBtn = shadow.querySelector('#ll-blacklist');
    const rBtn = shadow.querySelector('#ll-remove');
    if (wBtn) wBtn.onclick = async () => {
        await setLocalStatus(artist, platformClass, 'white');
        window.showPopup(null, badge, null, artist, platformClass);
    };
    if (bBtn) bBtn.onclick = async () => {
        await setLocalStatus(artist, platformClass, 'black');
        window.showPopup(null, badge, null, artist, platformClass);
    };
    if (rBtn) rBtn.onclick = async () => {
        await clearLocalStatus(artist, platformClass);
        window.showPopup(null, badge, null, artist, platformClass);
    };
}