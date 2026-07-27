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

async function init() {
    let currentUrl = location.href

    setInterval(async () => {
        if (currentUrl != location.href) {
            currentUrl = location.href
            updatePage()
        }
        const names = document.querySelectorAll("span.marquee-line__fragment:first-child button.lcd-meta-line__fragment")

        for (let index = 0; index < names.length; index++) {
            const element = names[index];
            if (element.innerHTML != lastName) {
                lastName = element.innerHTML
                console.log("New artist: "+lastName)
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
        }
    }, 200);
    updatePage()
}

init()
