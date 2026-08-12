// Platform check - only run on Spotify
if (!window.location.hostname.includes('open.spotify.com')) {
    console.warn('spotify.js loaded on wrong platform:', window.location.hostname);
    throw new Error('spotify.js is only for Spotify');
}

console.log("loaded on spotify")

const nextButtonSelector = '#main > div > div.zXqmJUq4Orp0Adt90GGA > div.itzKVxWhS4n59fp_KIVc > aside > div > div.El3q6p3dX2yPehnngMba > div > div.whjWqUAO0zpHJuoWr7oM > div.P0tzYwBLV9gZ3K6JKA5q > button:nth-child(1)' //not to hate but you kinda suck at this whole finding the right elements thing nuclear
const playerBarSelector = 'aside[data-testid="now-playing-bar"] div[data-testid="now-playing-widget"]' //the key isn't finding the right path, that changes too much, the key is finding defining characteristics
const artistSelector = 'a[data-testid="context-item-info-artist"]' //even if it doesn't seem obvious at first
const titleSelector = 'a[data-testid="context-item-link"]' //sometimes there may be multiple ways to find one element, not this time though

let currentArtist = null;
let currentTitle = null;
let nextButton = null;

function checkAndUpdateBadge() {
    if (!nextButton) {
        nextButton = document.querySelector(nextButtonSelector);
    }
    
    const artistElement = document.querySelector(artistSelector);
    const titleElement = document.querySelector(titleSelector);
    
    if (!artistElement || !titleElement) {
        console.log("Elements not ready yet");
        return;
    }
    
    const newArtist = artistElement.textContent.trim();
    const newTitle = titleElement.textContent.trim();
    
    if (newArtist !== currentArtist || newTitle !== currentTitle) {
        console.log("Song changed:", currentTitle, "by", currentArtist, "->", newTitle, "by", newArtist);
        currentArtist = newArtist;
        currentTitle = newTitle;
        
        const playerBar = document.querySelector(playerBarSelector);
        const badgeLocation = Array.from(playerBar?.children ?? [])
            .filter(child => !child.classList.contains('ai-warning-container') && !child.classList.contains('human-container'))
            .at(-1);

        if (!badgeLocation) {
            console.log("[SoundProof] Badge location not ready yet");
            return;
        }

        DecideBadge('75px', '50px', artistSelector, badgeLocation, nextButton, '4px', 'music');
    }
}

function observePlayerBar() {
    const playerBar = document.querySelector(playerBarSelector) ||
                      document.querySelector('#main');
    
    console.log("Observing:", playerBar);
    
    if (playerBar) {
        const observer = new MutationObserver(() => {
            checkAndUpdateBadge();
        });
        
        observer.observe(playerBar, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true
        });
        
        // Video/audio listener
        const checkForMedia = () => {
            const videoElement = document.querySelector('video') || document.querySelector('audio');
            if (videoElement) {
                let lastCheck = 0;
                videoElement.addEventListener('timeupdate', () => {
                    if (videoElement.currentTime - lastCheck > 2 || videoElement.currentTime < lastCheck) {
                        lastCheck = videoElement.currentTime;
                        checkAndUpdateBadge();
                    }
                });
            } else {
                setTimeout(checkForMedia, 1000);
            }
        };
        checkForMedia();
        
        // Aggressive initial checking
        const retryInterval = setInterval(() => {
            checkAndUpdateBadge();
        }, 100);
        
        setTimeout(() => {
            clearInterval(retryInterval);
            console.log("Stopped aggressive checking");
        }, 10000);
        
    } else {
        console.log("Container not found, retrying...");
        setTimeout(observePlayerBar, 500);
    }
}

observePlayerBar();
