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

const appleStyle = `
#artistPageAI,#albumPageAI {
    height: 80px;
    margin-bottom: -12px;
}
#artistPageAI {
    border-bottom-right-radius: 10px;
}
#albumPageAI {
    height: 60px;
    margin-bottom: 12px;
    margin-top: -6px;
    width: 90%;
    transform: translate(5%, 0);
    border-top-right-radius: 10px;
    border-bottom-right-radius: 10px;
}
#artistPageAI.Human img {
    position: relative;
    height: 100%;
    left: 5px;
    bottom: 5px;
}
#artistPageAI.Human {
    background-image: linear-gradient(to left, #003923, transparent);
}
#artistPageAI.AI img,#albumPageAI.AI img {
    position: relative;
    height: 160px;
    left: 10px;
    bottom: 50px;
}

#albumPageAI.AI img {
    position: relative;
    height: 140px;
    left: 10px;
    bottom: 50px;
}
#artistPageAI.AI,#albumPageAI.AI {
    overflow: hidden;
    position: relative;
}
#artistPageAI.AI::before,#albumPageAI.AI::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: linear-gradient(to top, #ff1c52, #d7724f);
    mask-image: linear-gradient(to left, white, transparent);
    z-index: 0;
    pointer-events: none;
}
.ai-popup {
    transform: translate(0, 50%) !important;
}
.ai-warning-container {
    width: initial !important;
    height: 30px !important;
    overflow: visible !important;
    animation: none !important;
}
.ai-warning-container img {
    width: initial !important;
    height: 60px !important;
    overflow: visible !important;
    transform: translate(0, -10%) !important;
    animation: glow-pulse 2s ease-in-out infinite';
}
`

let lastPath = ""

chrome.storage.local.get('aiArtist', async (result) => {
    const artistNames = result.aiArtist || [];
    console.log("Loaded", artistNames.length, "AI artists from storage");

    const styleElement = document.createElement("style")
    styleElement.innerHTML = appleStyle
    document.head.appendChild(styleElement)

    function checkSong() {

        console.log("checked song")
        checkPage()
    }

    async function checkPage() {
        const path = location.pathname
        if (path == lastPath && document.querySelector(".human-badge") || document.querySelector(".ai-warning-badge")) {
            return
        } else {
            lastPath = path
        }
        const splitPath = path.split("/")

        const page = splitPath[path.split("/").length - 3]
        const nextPage = splitPath[path.split("/").length - 2]

        if (page == "album" || nextPage == "playlist") {
            const oneArtistElement = await waitForElement('a[href^="https://music.apple.com/us/artist/"]')
            const artistElements = document.querySelectorAll('a[href^="https://music.apple.com/us/artist/"]')
            RemoveBadges()
            artistElements.forEach(async artistElement => {
                const artistName = artistElement.textContent.trim()
                const isAI = artistNames.includes(artistName.toLowerCase());
                console.log("Artist page artist uses AI:", isAI)
                if (isAI) {
                    if (document.querySelector("#albumPageAI") == null) {
                        let div = document.createElement("div")
                        div.id = "albumPageAI";
                        div.className = "section svelte-wa5vzl";
                        div.setAttribute("data-testid", "section-container");
                        div.setAttribute("aria-label", "Featured");
                        let img = document.createElement("img")
                        img.src = chrome.runtime.getURL('Icons/ArtistUsesAI.png');
                        div.appendChild(img)
                        div.classList.add("AI")
                        const container = await waitForElement('div[data-testid="content-container"]')
                        container.insertBefore(div, document.querySelector('div[aria-label="Featured"]').nextElementSibling)
                    }
                    let size = "30px"
                    if (artistElement.offsetHeight < 28) {
                        size = artistElement.offsetHeight + "px"
                    }
                    ShowWarningBadge(size, artistElement, artistName, 'auto', false)
                } else {
                    console.log(artistElement.offsetHeight);

                    let size = "30px"
                    if (artistElement.offsetHeight < 28) {
                        size = artistElement.offsetHeight + "px"
                    }
                    ShowHumanBadge(size, artistElement, artistName, 'auto', false)
                }
            })
        } else {
            if (document.querySelector("#albumPageAI")) {
                document.querySelector("#albumPageAI").remove()
            }
        }

        if (page == "artist") {
            // const id = splitPath[path.split("/").length - 1]
            // const isAIfromID = artistNames.includes(`"apple": "${id}"`);
            const artistElement = await waitForElement('h1[data-testid="artist-header-name"]')
            const artistName = artistElement.textContent.trim()
            const isAI = artistNames.includes(artistName.toLowerCase());
            const videoArtwork = document.querySelector('div[data-testid="video-artwork"]') || document.querySelector('div[data-testid="artist-detail-header"]')
            console.log("Artist page artist uses AI:", isAI)
            if (!document.querySelector("#artistPageAI")) {
                let div = document.createElement("div")
                div.id = "artistPageAI";
                div.className = "section svelte-wa5vzl";
                div.setAttribute("data-testid", "section-container");
                div.setAttribute("aria-label", "Featured");

                const container = await waitForElement('div[data-testid="content-container"]')
                container.insertBefore(div, document.querySelector('div[aria-label="Featured"]').nextElementSibling)
                let img = document.createElement("img")
                div.appendChild(img)

                if (!videoArtwork) {
                    div.style.borderTopRightRadius = "10px"
                }

                if (isAI) {
                    div.classList.add("AI")
                    img.src = chrome.runtime.getURL('Icons/ArtistUsesAI.png');
                } else {
                    div.classList.add("Human")
                    img.src = chrome.runtime.getURL('Icons/LooksHuman.png');
                }
            }
        } else {
            if (document.querySelector("#artistPageAI")) {
                document.querySelector("#artistPageAI").remove()
            }
        }
        console.log("Checked Page")
    }
    // setInterval(checkSong, 1000);
    setInterval(checkSong, 1000);
    // checkPage()

    var oldHref = document.location.href;

    window.onload = function () {
        var bodyList = document.querySelector('body');

        var observer = new MutationObserver(function (mutations) {
            if (oldHref != document.location.href) {
                oldHref = document.location.href;
                /* Changed ! your code here */
                checkPage()
            }
        });

        var config = {
            childList: true,
            subtree: true
        };

        observer.observe(bodyList, config);
    };

});