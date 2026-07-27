// Platform check - only run on Apple Music
if (!window.location.hostname.includes('music.apple.com')) {
    console.warn('appleMusic.js loaded on wrong platform:', window.location.hostname);
    throw new Error('appleMusic.js is only for Apple Music');
}

console.log("Loading on apple music")

function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector)
        if (element) return resolve(element);

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector)
            if (element) {
                observer.disconnect()
                resolve(element)
            }
        })

        observer.observe(document.body, {
            childList: true,
            subtree: true
        })

        setTimeout(() => {
            observer.disconnect()
            reject(new Error(`Timeout of ${timeout} occured for waiting for ${selector}`))
        }, timeout);
    })
}

function updatePage() {
    console.log("Updated!")
}

let lastName = ""

function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector)
        if (element) return resolve(element);

        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector)
            if (element) {
                observer.disconnect()
                resolve(element)
            }
        })

        observer.observe(document.body, {
            childList: true,
            subtree: true
        })

        setTimeout(() => {
            observer.disconnect()
            reject(new Error(`Timeout of ${timeout} occured for waiting for ${selector}`))
        }, timeout);
    })
}

function waitForImage(image) {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();

    return new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
    });
}

function getDominantColor(imageElement) {
    const canvas = document.createElement("canvas");
    const width = imageElement.naturalWidth || imageElement.width;
    const height = imageElement.naturalHeight || imageElement.height;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(imageElement, 0, 0, width, height);

    const data = ctx.getImageData(0, 0, width, height).data;
    let r = 0, g = 0, b = 0, count = 0;

    for (let i = 0; i < data.length; i += 16) {
        const alpha = data[i + 3];

        if (alpha < 80) continue;

        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
    }

    if (count === 0) return "#ffffff";

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}


function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

function getAppleMusicControlHeight(actionButtons) {
    const button = actionButtons?.querySelector('button') || actionButtons.firstElementChild;
    return button.offsetHeight || 28;
}

function getAppleMusicBadgeWidths(actionButtons) {
    const button = actionButtons?.querySelector('button') || actionButtons?.firstElementChild;
    const buttonHeight = getAppleMusicControlHeight(actionButtons);
    const badgeHeight = clamp(Math.round(buttonHeight * 0.72), 18, 24);

    return {
        ai: Math.round(badgeHeight * 2.036) + 'px',
        human: Math.round(badgeHeight * 3.0) + 'px'
    };
}
function alignAppleMusicBadge(badge, actionButtons) {
    const badgeContainer = badge.parentElement;
    const controlHeight = getAppleMusicControlHeight(actionButtons);
    const badgeHeight = clamp(Math.round(controlHeight * 0.72), 18, 24);

    badgeContainer.style.display = 'inline-flex';
    badgeContainer.style.alignItems = 'center';
    badgeContainer.style.alignSelf = 'center';
    badgeContainer.style.flex = '0 0 auto';
    badgeContainer.style.height = controlHeight + 'px';
    badgeContainer.style.lineHeight = '0';
    badge.style.width = 'auto';
    badge.style.height = badgeHeight + 'px';
    badge.style.display = 'block';
}

async function alignMiniplayerBadge(badge, miniplayerDisplay) {
    const badgeContainer = badge?.parentElement;
    if (!badgeContainer || !miniplayerDisplay) return;

    miniplayerDisplay.appendChild(badgeContainer);
    miniplayerDisplay.style.justifyContent = 'center';
    badgeContainer.style.display = 'inline-flex';
    badgeContainer.style.alignItems = 'center';
    badgeContainer.style.justifyContent = 'center';
    badgeContainer.style.width = '100%';
    badgeContainer.style.height = '100%';
    badgeContainer.style.lineHeight = '0';
    badge.style.width = 'auto';
    badge.style.maxWidth = '82%';
    badge.style.maxHeight = '34px';
    badge.style.display = 'block';

    await waitForImage(badge);

    const badgeColor = getDominantColor(badge);
    miniplayerDisplay.style.background = `linear-gradient(135deg, ${badgeColor}85, var(--glassMaterialBackground))`;
}

async function injectMiniplayerDisplay() {
    if (document.querySelector('.soundproof-mini-player-display') != null) return;
    try {
        const container = await waitForElement('div[data-testid="mini-player-container"]', 1000);

        container.parentElement.style.height = "120px"

        const newDiv = document.createElement("div");
        newDiv.className = 'soundproof-mini-player-display';
        newDiv.style.cssText = `
            box-sizing: border-box;
            height: 54px;
            min-height: 54px;
            width: calc(100% - 28px);
            margin: 8px 14px 0;
            padding: 7px 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            border: 1px solid rgba(0, 0, 0, 0.12);
            backdrop-filter: saturate(220%) blur(16px);
            background: var(--glassMaterialBackground);
            border-radius: 1000px;
            box-shadow: 0 10px 40px var(--glassMaterialShadowColor);
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            color: #1d1d1f;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
        `;

        container.appendChild(newDiv);
    } catch (err) {
        console.warn('[SoundProof] Could not inject mini player display:', err);
    }
}

async function init() {
    let currentUrl = location.href
    let miniplayerShowing = false
    let nameChangeOverrideCheck = false

    setInterval(async () => {
        if (currentUrl != location.href) {
            currentUrl = location.href
            updatePage()
        }
        const miniplayer = document.querySelector('div[data-testid="mini-player-container"]')
        if (miniplayer != null && miniplayerShowing == false) {
            await injectMiniplayerDisplay()
            miniplayerShowing = true
            nameChangeOverrideCheck = true
        } else if (miniplayer == null && miniplayerShowing == true) {
            miniplayerShowing = false
            nameChangeOverrideCheck = true
        }

        const namesLarge = document.querySelectorAll("span.marquee-line__fragment:first-child button.lcd-meta-line__fragment")
        const namesSmall = document.querySelectorAll("div.mini-player__text--subtitle .mini-player__clamp-wrapper")
        const combinedNames = [...namesLarge, ...namesSmall]; 
        if (nameChangeOverrideCheck && combinedNames.length === 0) return;

        for (let index = 0; index < combinedNames.length; index++) {
            const element = combinedNames[index];
            if (element.innerHTML != lastName || nameChangeOverrideCheck == true) {
                nameChangeOverrideCheck = false
                lastName = element.innerHTML
                console.log("New artist: "+lastName)
                console.log(miniplayer);
                
                if (miniplayer) {
                    const nextButton = Array.from(document.querySelectorAll("amp-playback-controls-item-skip")).at(-1);
                    const badgeLocation = document.querySelector('.soundproof-mini-player-display')
                    if (!badgeLocation) {
                        nameChangeOverrideCheck = true
                        return
                    }
                    const badgeWidths = getAppleMusicBadgeWidths(miniplayer)
                    const badge = await DecideBadge(badgeWidths.ai, badgeWidths.human, 'div.mini-player__text--subtitle .mini-player__clamp-wrapper', badgeLocation, nextButton, '0px', 'music')
                    await alignMiniplayerBadge(badge, badgeLocation)
                } else {
                    const actionButtons = document.querySelector(".action-buttons")
                    const nextButton = Array.from(document.querySelectorAll("amp-playback-controls-item-skip")).at(-1);
                    if (!actionButtons) return;
                    const badgeLocation = Array.from(actionButtons.children)
                        .filter(child => !child.classList.contains('ai-warning-container') && !child.classList.contains('human-container'))
                        .at(-1);
                    if (!badgeLocation) return;
                    const badgeWidths = getAppleMusicBadgeWidths(actionButtons)
                    const badge = await DecideBadge(badgeWidths.ai, badgeWidths.human, 'span.marquee-line__fragment:first-child button.lcd-meta-line__fragment', badgeLocation, nextButton, '0px', 'music')
                    alignAppleMusicBadge(badge, actionButtons)
                }
                return
            }
        }
    }, 200);
    updatePage()
}

init()
