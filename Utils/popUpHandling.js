let hideTimer;
    const supabaseUrl = 'https://solsneywdlhvwbtghopw.supabase.co';
    const supabaseKey = 'sb_publishable_dlFufI-1QXA4VJdGoMWxMw_ouWHyl3k';

    if (!window.supabaseClient) {
        window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    }

    const DEFAULT_STATUS = { out_human: 0, out_ai: 0, out_score: 0, out_verified: false, my_current_vote: null };

    const VERIFIED_ICON = `
        <span class="tooltip-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 -960 960 960" fill="#22c55e" style="flex-shrink:0;display:block">
                <path d="m344-60-76-128-144-32 14-148-98-112 98-112-14-148 144-32 76-128 136 58 136-58 76 128 144 32-14 148 98 112-98 112 14 148-144 32-76 128-136-58-136 58Zm94-278 226-226-56-58-170 170-86-84-56 58 142 140Z"/>
            </svg>
            <span class="tooltip">A human moderator has reviewed this artist and confirmed the rating — either through a high vote count or a resolved appeal.</span>
        </span>`;
    const LOCK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="#71717a" style="flex-shrink:0">
        <path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm240-200q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80Z"/>
    </svg>`;

    function getVerdictColor(label, pct) {
        if (label === 'AI') return pct >= 50 ? '#ef4444' : '#f59e0b';
        if (label === 'HUMAN') return pct >= 50 ? '#22c55e' : '#10b981';
        return '#71717a';
    }

    async function fetchArtistStatus(artist, platformClass) {
        try {
            const { data, error } = await window.supabaseClient.rpc('get_artist_status', {
                target_id: artist.toLowerCase(),
                platform_input: platformClass
            });
            if (error) { console.error('[AI Guard] get_artist_status error:', error); return DEFAULT_STATUS; }
            if (Array.isArray(data) && data.length > 0) return data[0];
            if (data && typeof data === 'object' && !Array.isArray(data)) return data;
            return DEFAULT_STATUS;
        } catch (err) {
            console.error('[AI Guard] Fetch failed:', err);
            return DEFAULT_STATUS;
        }
    }

    function positionPopup(host, badge) {
        const MARGIN = 12;
        const POP_W = 360;

        const rect = badge.getBoundingClientRect();
        const popH = host.getBoundingClientRect().height ?? 260;

        // Default: centered above the badge
        let left = rect.left + rect.width / 2 - POP_W / 2;
        let top = rect.top - popH - MARGIN;

        // Clamp horizontally within viewport
        left = Math.max(MARGIN, Math.min(left, window.innerWidth - POP_W - MARGIN));

        // If it goes off the top, flip below the badge
        if (top < MARGIN) {
            top = rect.bottom + MARGIN;
        }

        // If it now goes off the bottom, just clamp it
        const maxTop = window.innerHeight - popH - MARGIN;
        if (top > maxTop) {
            top = Math.max(MARGIN, maxTop);
        }

        host.style.cssText = `
            position: fixed;
            left: ${left}px;
            top: ${top}px;
            z-index: 2147483647;
        `;
    }

    window.showPopup = async function(container, badge, human, artist, platformClass) {
        clearTimeout(hideTimer);
        const existingHost = document.body.querySelector('.ai-guard-wrapper');
        if (existingHost) existingHost.remove();

        const host = document.createElement('div');
        host.className = 'ai-guard-wrapper';
        const shadow = host.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=JetBrains+Mono:wght@500&family=Saira+Extra+Condensed:wght@700;800&family=Bebas+Neue&display=swap');

            :host { 
                all: initial; 
                --human: #22c55e; 
                --human-low: #10b981;
                --ai: #ef4444; 
                --ai-low: #f59e0b;
                --bg: #0c0c0e; 
                --text: #f4f4f5; 
                --dim: #71717a; 
            }

            .card {
                width: 360px; padding: 18px;
                background: rgba(12, 12, 14, 0.82);
                backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
                color: var(--text); font-family: 'Inter', sans-serif;
                box-shadow: 0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
                animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1);
                position: relative; overflow: hidden;
            }

            @keyframes pop { 
                from { opacity: 0; transform: translateY(10px) scale(0.98); } 
                to   { opacity: 1; transform: translateY(0) scale(1); } 
            }

            /* Glow anchored to top-right corner, clipped by card overflow:hidden */
            .glow-orb {
                position: absolute; top: -60px; right: -60px;
                width: 220px; height: 220px; border-radius: 50%;
                filter: blur(55px); opacity: 0.45; z-index: 0;
                transition: background 0.6s ease;
                pointer-events: none;
            }
            /* Everything sits above the glow */
            .top, .meter-bar, .stats, .btns, .footer { position: relative; z-index: 1; }

            .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 12px; }
            .name-box { flex: 1; min-width: 0; }
            .name { font-size: 20px; font-weight: 800; line-height: 1.1; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; overflow-wrap: break-word; align-self: flex-start; }
            .sub { font-size: 10px; color: #a1a1aa; text-decoration: none; font-weight: 600; display: block; }
            .sub:hover { color: var(--text); text-decoration: underline; }

            .verdict { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; position: relative; }
            .pct { font-family: 'Bebas Neue', sans-serif; font-size: 56px; font-weight: 400; line-height: 0.85; letter-spacing: 0.01em; position: relative; z-index: 1; }
            .tag { font-family: 'Saira Extra Condensed', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 0.05em; margin-top: 6px; position: relative; z-index: 1; }

            .meter-bar { height: 6px; background: rgba(255,255,255,0.08); border-radius: 100px; overflow: hidden; display: flex; margin-bottom: 5px; }
            .fill { transition: width 0.8s cubic-bezier(0.2, 0, 0, 1); }

            .stats { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 2px; }
            .stat-val { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; letter-spacing: -0.02em; }
            .stat-val .plus { font-size: 10px; font-weight: 500; margin-right: 1px; opacity: 0.8; }
            .stat-label { font-size: 9px; font-weight: 500; opacity: 0.5; margin-left: 3px; letter-spacing: 0.04em; text-transform: lowercase; font-family: 'Inter', sans-serif; }

            .btns { display: flex; gap: 8px; margin-bottom: 15px; height: 42px; }
            .btn {
                flex: 1; border-radius: 9px; border: 2.5px solid transparent; cursor: pointer;
                font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .btn-h { background: var(--human); color: #052e16; border-color: var(--human); }
            .btn-a { background: var(--ai); color: #450a0a; border-color: var(--ai); }
            .btn-h:hover { background: transparent !important; color: var(--human); }
            .btn-a:hover { background: transparent !important; color: var(--ai); }
            .btn.voted-h { background: transparent !important; color: var(--human); border-color: var(--human); flex: 1.6 !important; }
            .btn.voted-a { background: transparent !important; color: var(--ai); border-color: var(--ai); flex: 1.6 !important; }
            .btn.voted-h:hover { background: var(--human) !important; color: #052e16; }
            .btn.voted-a:hover { background: var(--ai) !important; color: #450a0a; }
            .btns:hover .btn:not(:hover) { flex: 0.6; opacity: 0.6; }
            .btns .btn:hover { flex: 1.8; }

            .btn-locked {
                flex: 1; background: rgba(255,255,255,0.06); color: var(--text);
                border: 1.5px solid rgba(255,255,255,0.15); cursor: default;
                font-size: 12px; font-weight: 700; border-radius: 9px;
                display: flex; align-items: center; justify-content: center;
                letter-spacing: 0.02em;
            }

            .tooltip-wrap { position: relative; display: flex; align-items: center; cursor: default; }
            .tooltip {
                display: none;
                position: absolute;
                bottom: calc(100% + 8px);
                left: 50%;
                transform: translateX(-50%);
                background: #1c1c1f;
                border: 1px solid rgba(255,255,255,0.12);
                color: #d4d4d8;
                font-size: 11px;
                font-weight: 400;
                line-height: 1.5;
                padding: 8px 10px;
                border-radius: 8px;
                width: 200px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                pointer-events: none;
                z-index: 10;
            }
            .skeleton { animation: pulse 1.2s ease-in-out infinite; background: rgba(255,255,255,0.06); border-radius: 4px; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

            .footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); }
            .skip { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; }

            .skip-input-wrapper { position: relative; display: flex; align-items: center; }
            .skip-in {
                width: 32px; background: #18181b; border: 1.5px solid #333; color: var(--human);
                border-radius: 6px; text-align: left; font-family: 'Saira Extra Condensed', sans-serif;
                font-size: 16px; font-weight: 700; padding: 3px 18px 3px 6px;
                appearance: textfield; transition: border-color 0.2s;
            }
            .min-in {
                width: 24px; background: #18181b; border: 1.5px solid #333; color: var(--human);
                border-radius: 6px; text-align: left; font-family: 'Saira Extra Condensed', sans-serif;
                font-size: 16px; font-weight: 700; padding: 3px 3px 3px 6px;
                appearance: textfield; transition: border-color 0.2s;
            }
            .skip-in::-webkit-outer-spin-button,
            .skip-in::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            .skip-in:focus { outline: none; border-color: var(--human); }
                        .min-in::-webkit-outer-spin-button,
            .min-in::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; } /* im FAR too lazy to do it all fancy */
            .min-in:focus { outline: none; border-color: var(--human); }
            .pct-symbol { position: absolute; right: 6px; font-size: 9px; color: var(--dim); pointer-events: none; }
            .ai-label { color: var(--dim); font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; }

            .appeal {
                font-size: 11px; font-weight: 600; color: #a1a1aa; cursor: pointer; text-decoration: none;
                background: rgba(255,255,255,0.08); padding: 5px 12px; border-radius: 100px;
                display: flex; align-items: center; overflow: hidden; white-space: nowrap;
                max-width: 65px; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2);
            }
            .appeal:hover { max-width: 180px; background: rgba(255,255,255,0.15); color: var(--text); }
            .full { opacity: 0; width: 0; transition: 0.3s; margin-left: 0; }
            .appeal:hover .full { opacity: 1; width: auto; margin-left: 4px; }
        `;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="glow-orb" id="glow"></div>
            <div class="top">
                <div class="name-box">
                    <div class="name">${artist}</div>
                    <a href="https://github.com/NuclearBlox/Check-SoulOverAI-extension/wiki/How-songs-status-gets-decided" target="_blank" class="sub">How it works & FAQ →</a>
                </div>
                <div class="verdict">
                    <div class="pct" style="color:var(--dim)">—%</div>
                    <div class="tag" style="color:var(--dim)">...</div>
                </div>
            </div>
            <div class="meter-bar"><div class="fill skeleton" style="width:100%"></div></div>
            <div class="stats">
                <span class="stat-val" style="color:#3f3f46"><span class="plus">+</span>0<span class="stat-label">human</span></span>
                <span class="stat-val" style="color:#3f3f46"><span class="plus">+</span>0<span class="stat-label">AI</span></span>
            </div>
            <div class="btns">
                <button class="btn btn-h" disabled>Human</button>
                <button class="btn btn-a" disabled>AI</button>
            </div>
            <div class="footer">
                <div class="skip">
    Skip past

    <div class="skip-input-wrapper">
        <input type="number" id="skip-in" class="skip-in" value="50">
        <span class="pct-symbol">%</span>
    </div>
    <span class="ai-label">AI</span>

    <span style="margin-left:6px;">with</span>

    <div class="min-votes-wrapper">
        <input type="number" id="min-in" class="min-in" value="3">
    </div>
    <span class="ai-label">votes</span>
</div>
                <a href="https://github.com/NuclearBlox/Check-SoulOverAI-extension/wiki/Appealing-an-incorrect-rating" target="_blank" class="appeal">
                    <span>Appeal</span><span class="full">Mistake?</span>
                </a>
            </div>
        `;

        // Set initial off-screen position to avoid flash, then append
        host.style.cssText = 'position: fixed; left: -9999px; top: -9999px; z-index: 2147483647;';
        shadow.appendChild(style);
        shadow.appendChild(card);
        document.body.appendChild(host);

        // Position after the element is in the DOM so we can measure its height
        requestAnimationFrame(() => positionPopup(host, badge));

        host.onmouseenter = () => clearTimeout(hideTimer);
        host.onmouseleave = () => window.hidePopup();

       const [status, thresholdRes, minVotesRes] = await Promise.all([
    fetchArtistStatus(artist, platformClass),
    chrome.storage.local.get('threshold'),
    chrome.storage.local.get('minVotes')
]);

        if (!document.body.contains(host)) return;

        // Re-position after data loads in case content height changed
        requestAnimationFrame(() => positionPopup(host, badge));


        const threshold = thresholdRes.threshold ?? 50;
        const minVotes = minVotesRes.minVotes ?? 3;
        const total = status.out_human + status.out_ai;
        const isEmpty = total === 0;
        let hPct = 0, aPct = 0, displayPct = 0, label = 'UNKNOWN';

        if (!isEmpty) {
            hPct = Math.round((status.out_human / total) * 100);
            aPct = 100 - hPct;
            displayPct = Math.round((Math.abs(status.out_human - status.out_ai) / total) * 100);
            if (status.out_human > status.out_ai) label = 'HUMAN';
            else if (status.out_ai > status.out_human) label = 'AI';
            else label = 'TIE';
        }

        const themeColor = getVerdictColor(label, displayPct);

        // Badge AFTER the name
        shadow.querySelector('.name').innerHTML =
            `<span>${artist}</span>` + (status.out_verified ? VERIFIED_ICON : '');

        shadow.querySelector('#glow').style.background = themeColor;
        shadow.querySelector('.pct').style.color = themeColor;
        shadow.querySelector('.pct').textContent = isEmpty ? '—%' : `${displayPct}%`;
        shadow.querySelector('.tag').style.color = themeColor;
        shadow.querySelector('.tag').textContent = label;

        shadow.querySelector('.meter-bar').innerHTML = isEmpty
            ? '<div class="fill" style="width:100%;background:#3f3f46"></div>'
            : `<div class="fill" style="width:${hPct}%;background:var(--human)"></div>
               <div class="fill" style="width:${aPct}%;background:var(--ai)"></div>`;

        const [humanStat, aiStat] = shadow.querySelectorAll('.stat-val');
        humanStat.style.color = isEmpty ? '#3f3f46' : 'var(--human)';
        humanStat.innerHTML = `<span class="plus">+</span>${status.out_human}<span class="stat-label">human</span>`;
        aiStat.style.color = isEmpty ? '#3f3f46' : 'var(--ai)';
        aiStat.innerHTML = `<span class="plus">+</span>${status.out_ai}<span class="stat-label">AI</span>`;

        const btns = shadow.querySelector('.btns');
        if (status.out_verified) {
            btns.innerHTML = `<button class="btn btn-locked">${LOCK_ICON} Voting locked · Moderated result</button>`;
        } else {
            const [vH, vA] = btns.querySelectorAll('.btn');
            vH.removeAttribute('disabled');
            vA.removeAttribute('disabled');
            if (status.my_current_vote === 'human') vH.classList.add('voted-h');
            if (status.my_current_vote === 'ai') vA.classList.add('voted-a');
            vH.onclick = () => castVote(artist, 'human', badge, platformClass);
            vA.onclick = () => castVote(artist, 'ai', badge, platformClass);
        }

        shadow.querySelector('#skip-in').value = threshold;
        shadow.querySelector('#min-in').value = minVotes;
        shadow.querySelector('#skip-in').onchange = (e) =>
            chrome.storage.local.set({ threshold: e.target.value });

         shadow.querySelector('#min-in').onchange = (e) =>
            chrome.storage.local.set({ minVotes: e.target.value });
    };

    window.hidePopup = function() {
        hideTimer = setTimeout(() => {
            const host = document.body.querySelector('.ai-guard-wrapper');
            if (host) host.remove();
        }, 300);
    };

    async function castVote(artistName, type, badge, platformClass) {
        try {
            const { error } = await window.supabaseClient.rpc('handle_vote', {
                artist_id_input: artistName,
                vote_type_input: type,
                platform_input: platformClass
            });
            if (error) console.error('[SoundProof] handle_vote error:', error);
            window.showPopup(null, badge, null, artistName, platformClass);
        } catch (err) {
            console.error('[SoundProof] Vote failed:', err);
        }
    }