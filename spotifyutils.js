async function searchArtist(spotifyApi, artistInput) {
  try {
    const results = await spotifyApi.searchArtists(artistInput);
    const mainArtist = results.body.artists.items[0];
    return mainArtist;
  } catch (error) {
    throw new Error(`Error getting artist info: ${error.message}`);
  }
}

async function topTracks(spotifyApi, artistCode) {
  try {
    const country = "US"; // Replace with the desired country code

    // Get the top tracks for the specified artist in the specified country
    const response = await spotifyApi.getArtistTopTracks(artistCode, country);
    const topTracksData = response.body.tracks;

    // Return a list of dictionaries with uri and name
    const trackList = topTracksData.map((track) => ({
      id: track.uri,
      name: track.name,
      duration_ms: track.duration_ms,
      artist: track.artists[0].name,
    }));

    return trackList;
  } catch (error) {
    throw new Error(
      `Error getting top tracks for ${artistCode}: ${error.message}`
    );
  }
}

async function similarArtists(spotifyApi, artistCode) {
  try {
    const response = await spotifyApi.getArtistRelatedArtists(artistCode);
    const relatedArtists = response.body.artists;

    const artistList = relatedArtists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      genres: artist.genres,
      images: artist.images,
    }));

    return artistList;
  } catch (error) {
    throw new Error(
      `Error getting top tracks for ${artistCode}: ${error.message}`
    );
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
}

async function addTracks(spotifyApi, songIds, playlistUri) {
  const chunkSize = 100;
  const totalChunks = Math.ceil(songIds.length / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const startIndex = i * chunkSize;
    const endIndex = (i + 1) * chunkSize;
    const chunkSongIds = songIds.slice(startIndex, endIndex);

    try {
      // Add songs to the playlist
      await spotifyApi.addTracksToPlaylist(
        playlistUri,
        chunkSongIds
      );
    } catch (error) {
      console.error(
        `Error adding chunk ${i + 1} to the playlist:`,
        error.message
      );
    }
  }
}

module.exports = {
  searchArtist,
  topTracks,
  similarArtists,
  addTracks,
};