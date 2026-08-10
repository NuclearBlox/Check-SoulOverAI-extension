/*console.log("Fetching AI artist data...");

fetch("https://raw.githubusercontent.com/xoundbyte/soul-over-ai/main/dist/artists.json")
  .then(response => response.json())
  .then(data => {
    const artistNames = data.map(artist => artist.name.toLowerCase());

    chrome.storage.local.set({ aiArtist: artistNames }, () => {
      console.log("Saved", artistNames.length, "artists to storage");
    });

    function isAIArtist(artistName) {
      const LowerCaseName = artistName.toLowerCase();

      return artistNames.includes(LowerCaseName, data);
    }
  });
  */
// old logic from simpler times