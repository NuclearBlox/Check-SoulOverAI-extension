window.DecideBadge = async function(AIwidth, humanWidth, selector, badgeLocation, skipElement, padding, platformClass) {
    const artistElement = Array.from(document.querySelectorAll(selector)).find(el => el.textContent.trim() !== '') ?? document.querySelector(selector);
    if (!artistElement) return;

    // Use stamped handle if present (e.g. YouTube), otherwise fall back to display name
    const artistName = (artistElement.dataset.soundproofId || artistElement.textContent.trim()).toLowerCase();

    const status = await getArtistStatus(artistName, platformClass, false);
    const total = status.out_human + status.out_ai;

    if (total === 0) {
        return ShowNoDataBadge(humanWidth, badgeLocation, artistName, padding, true, platformClass);
    }

    const isAI = status.out_ai > status.out_human;
    const winningSideVotes = isAI ? status.out_ai : status.out_human;
    const confidencePct = Math.round((winningSideVotes / total) * 100);
    let tugPct = Math.round((Math.abs(status.out_ai - status.out_human) / total) * 100);
    const isLean = confidencePct < 75 || total <= 5;
    const isVerified = status.out_verified;

    if (isAI) {
        console.log(`[SoundProof] ${artistName} is AI (${status.out_ai} AI vs ${status.out_human} Human, ${confidencePct}% confidence, ${tugPct}% tug)`);
        const badge = ShowWarningBadge(AIwidth, badgeLocation, artistName, padding, true, isLean, isVerified, platformClass);

        if (skipElement) {
            const localStatus = await getLocalStatus(artistName, platformClass);
            if (localStatus === 'black') {
                tugPct = 100;
            } else if (localStatus === 'white') {
                tugPct = 0;
            }

            const { minVotes } = await chrome.storage.local.get('minVotes');
            if (localStatus || total >= (minVotes ?? 3)) {
                let { threshold } = await chrome.storage.local.get('threshold');
                threshold = Number(threshold ?? 50);
                if (tugPct >= threshold) {
                    console.log(`[SoundProof] Skipping ${artistName} — ${tugPct}% AI pull, threshold ${threshold || 50}%`);
                    skipElement.click();
                }
            }
        }
        return badge;
    } else {
        return ShowHumanBadge(humanWidth, badgeLocation, artistName, padding, true, isLean, isVerified, platformClass);
    }
};