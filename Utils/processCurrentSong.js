window.DecideBadge = async function(AIwidth, humanWidth, selector, badgeLocation, skipElement, padding, platformClass) {
    const artistElement = Array.from(document.querySelectorAll(selector)).find(el => el.textContent.trim() !== '') ?? document.querySelector(selector);
    if (!artistElement) return;

    // Use stamped handle if present (e.g. YouTube), otherwise fall back to display name
    const artistName = (artistElement.dataset.soundproofId || artistElement.textContent.trim()).toLowerCase();

    try {
        const { data, error } = await window.supabaseClient.rpc('get_artist_status', {
            target_id: artistName,
            platform_input: platformClass
        });

        const status = (data && data[0]) ? data[0] : { out_human: 0, out_ai: 0, out_score: 0, out_verified: false };

        const total = status.out_human + status.out_ai;

        if (total === 0) {
            return ShowNoDataBadge(humanWidth, badgeLocation, artistName, padding, true, platformClass);
        }

        const isAI = status.out_ai > status.out_human;
        const winningSideVotes = isAI ? status.out_ai : status.out_human;
        const confidencePct = Math.round((winningSideVotes / total) * 100);
        const tugPct = Math.round((Math.abs(status.out_ai - status.out_human) / total) * 100);
        const isLean = confidencePct < 75 || total <= 5;
        const isVerified = status.out_verified;

        if (isAI) {
            const badge = ShowWarningBadge(AIwidth, badgeLocation, artistName, padding, true, isLean, isVerified, platformClass);
            const { minVotes } = await chrome.storage.local.get('minVotes');
            if (total >= (minVotes ?? 3) && skipElement) {
                const { threshold } = await chrome.storage.local.get('threshold');
                if (tugPct >= (threshold ?? 50)) {
                    console.log(`[SoundProof] Skipping ${artistName} — ${tugPct}% AI pull, threshold ${threshold || 50}%`);
                    skipElement.click();
                }
            }
            return badge;
        } else {
            return ShowHumanBadge(humanWidth, badgeLocation, artistName, padding, true, isLean, isVerified, platformClass);
        }
    } catch (err) {
        console.error("Supabase Error:", err);
        return ShowNoDataBadge(humanWidth, badgeLocation, artistName, padding, true, platformClass);
    }
};
