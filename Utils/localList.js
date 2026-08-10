const MESSAGES = { // Got a bit sick of digging through HTML to change these
    whitelisted: {
        title: "Artist whitelisted",
        sub: "Always plays, regardless of score",
        btn: "Remove"
    },
    blacklisted: {
        title: "Artist blacklisted",
        sub: "Locked at 100%, always skipped",
        btn: "Remove"
    },
    verifiedAi: {
        title: "Verified AI artist",
        sub: "Locked at 100%. Play anyway?",
        btn: "Whitelist"
    },
    verifiedHuman: {
        title: "Verified human artist",
        sub: "Always plays. Blacklist anyway? (report mistakes!)",
        btn: "Blacklist"
    },
    votedAi: {
        title: "Blacklist too?",
        sub: "Locks them at 100%, always skipped",
        btn: "Blacklist"
    },
    votedHuman: {
        title: "Whitelist too?",
        sub: "Always plays, regardless of score",
        btn: "Whitelist"
    }
};

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
        position: relative; /* Container for absolute positioned glow background */
        overflow: hidden;   /* Keeps radial orb contained inside the banner */
        width: 398px;
        padding: 12px 10px;
        border-radius: 12px;
        margin-bottom: 4px;
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

    /* Pseudo-element creating the matching glowing orb */
    #locallist-banner::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -20%; /* Centers the orb near the action button */
        width: 300px;
        height: 300px;
        border-radius: 50%;
        pointer-events: none;
        z-index: 0;
        opacity: 0.5; /* Adjust intensity of glow */
        transition: background 0.3s ease, border-color 0.3s ease;
    }

    /* Ensure text and buttons layer above the background glow */
    .ll-text, .ll-btn {
        position: relative;
        z-index: 1;
    }

    /* Orb color matching 'white' (human) state */
    #locallist-banner.white::before {
        background: radial-gradient(circle, var(--human) 0%, transparent 70%);
    }

    /* Orb color matching 'black' (AI) state */
    #locallist-banner.black::before {
        background: radial-gradient(circle, var(--ai) 0%, transparent 70%);
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

    /* Solid state matching .btn-h / .btn-a — used for suggested actions
       (verifiedAi/verifiedHuman/votedAi/votedHuman) that haven't been taken yet */
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

    /* Main UI's buttons grow via flex when a sibling shrinks away from it
       (.btns:hover .btn:not(:hover) / .btns .btn:hover). The banner only
       ever shows one button, so there's no sibling to shrink — scale up
       directly instead to give the same "reaching toward you" feedback. */
    .ll-btn:hover {
        padding-left: 20px;
        padding-right: 20px;
    }
    .ll-btn:active {
        padding-left: 16px;
        padding-right: 16px;
    }

    /* Toggled state — for buttons that represent an already-active choice
       (mirrors .voted-h / .voted-a from the main popup). Outlined by
       default, fills solid on hover to signal "click to undo". Used for
       the whitelisted/blacklisted "Remove" button. Higher specificity
       than .ll-btn.white/.black so it overrides the solid default. */
    .ll-btn.white.toggled {
        background: transparent;
        color: var(--human);
        border-color: var(--human);
    }
    .ll-btn.black.toggled {
        background: transparent;
        color: var(--ai);
        border-color: var(--ai);
    }
    .ll-btn.white.toggled:hover {
        background: var(--human) !important;
        color: #052e16;
    }
    .ll-btn.black.toggled:hover {
        background: var(--ai) !important;
        color: #450a0a;
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
                <span class="ll-title">${MESSAGES.whitelisted.title}</span>
                <span class="ll-sub">${MESSAGES.whitelisted.sub}</span>
            </div>
            <button class="ll-btn white toggled" id="ll-remove">${MESSAGES.whitelisted.btn}</button>`;
    } else if (localStatus === 'black') {
        banner.className = 'black';
        banner.innerHTML = `
            <div class="ll-text">
                <span class="ll-title">${MESSAGES.blacklisted.title}</span>
                <span class="ll-sub">${MESSAGES.blacklisted.sub}</span>
            </div>
            <button class="ll-btn black toggled" id="ll-remove">${MESSAGES.blacklisted.btn}</button>`;
    } else if (isVerified && label === 'AI') {
        banner.className = 'white';
        banner.innerHTML = `
            <div class="ll-text">
                <span class="ll-title">${MESSAGES.verifiedAi.title}</span>
                <span class="ll-sub">${MESSAGES.verifiedAi.sub}</span>
            </div>
            <button class="ll-btn white" id="ll-whitelist">${MESSAGES.verifiedAi.btn}</button>`;
    } else if (isVerified && label === 'HUMAN') {
        banner.className = 'black';
        banner.innerHTML = `
            <div class="ll-text">
                <span class="ll-title">${MESSAGES.verifiedHuman.title}</span>
                <span class="ll-sub">${MESSAGES.verifiedHuman.sub}</span>
            </div>
            <button class="ll-btn black" id="ll-blacklist">${MESSAGES.verifiedHuman.btn}</button>`;
    } else if (hasVote && status.my_current_vote === 'ai') {
        banner.className = 'black';
        banner.innerHTML = `
            <div class="ll-text">
                <span class="ll-title">${MESSAGES.votedAi.title}</span>
                <span class="ll-sub">${MESSAGES.votedAi.sub}</span>
            </div>
            <button class="ll-btn black" id="ll-blacklist">${MESSAGES.votedAi.btn}</button>`;
    } else if (hasVote && status.my_current_vote === 'human') {
        banner.className = 'white';
        banner.innerHTML = `
            <div class="ll-text">
                <span class="ll-title">${MESSAGES.votedHuman.title}</span>
                <span class="ll-sub">${MESSAGES.votedHuman.sub}</span>
            </div>
            <button class="ll-btn white" id="ll-whitelist">${MESSAGES.votedHuman.btn}</button>`;
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