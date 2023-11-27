const fetch = require('node-fetch');

function geocode(address, access_token) {
    const endpoint = "https://api.mapbox.com/geocoding/v5/mapbox.places/";
  
    const url = `${endpoint}${address}.json?access_token=${access_token}`;
  
    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const coordinates = feature.center;
          const addressFull = data.features[0].place_name;
  
          return { addressFull, coordinates };
        } else {
          throw new Error(`Geocoding failed for: ${address}`);
        }
      })
      .catch((error) => {
        throw new Error(`Error in geocoding: ${error.message}`);
      });
  }
  
  async function drivingTraffic(coordinate1, coordinate2, accessToken) {
    const endpoint =
      "https://api.mapbox.com/directions/v5/mapbox/driving-traffic/";
  
    const params = {
      access_token: accessToken,
      annotations: "distance,duration",
      origin: `${coordinate1[0]}, ${coordinate1[1]}`,
      destination: `${coordinate2[0]}, ${coordinate2[1]}`,
    };
  
    try {
      const response = await fetch(
        `${endpoint}${params.origin};${params.destination}?access_token=${params.access_token}`
      );
      const data = await response.json();
  
      if (response.status === 200) {
        const route = data.routes[0]; // Assuming you want data from the first route
        const duration = route.duration;
        const distance = route.distance;
  
        const routeDuration = `Duration: ${duration} seconds`;
        const routeDistance = `Distance: ${distance} meters`;
  
        return { duration, distance, routeDuration, routeDistance };
      } else {
        return {
          errorMessage: `Directions Failed, Please Re-input. API request failed with status code: ${response.status}`,
        };
      }
    } catch (error) {
      return {
        errorMessage: `An error occurred: ${error.message}`,
      };
    }
  }
  
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

  module.exports = {
    geocode,
    drivingTraffic,
    searchArtist,
    topTracks,
    similarArtists,
    shuffleArray,
  };