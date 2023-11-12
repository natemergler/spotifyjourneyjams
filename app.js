const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");
const path = require("path");
require("dotenv").config();
const bodyParser = require("body-parser");

const app = express();
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Route for the root URL
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });
  
//Server side constants used
const port = 3000;
const clientId = process.env.CLIENTID;
const clientSecret = process.env.CLIENTSECRET;

const redirectUri = process.env.REDIRECTURI; // Change this if needed

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN

// Set up Spotify API credentials
const spotifyApi = new SpotifyWebApi({
clientId: clientId,
clientSecret: clientSecret,
redirectUri: redirectUri,
});

function geocode(address, access_token) {
  const endpoint = "https://api.mapbox.com/geocoding/v5/mapbox.places/";

  const url = `${endpoint}${address}.json?access_token=${access_token}`;

  return fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const coordinates = feature.center;
        const addressFull = data.features[0].place_name;

        return { addressFull, coordinates };
      } else {
        throw new Error(`Geocoding failed for: ${address}`);
      }
    })
    .catch(error => {
      throw new Error(`Error in geocoding: ${error.message}`);
    });
}


async function getArtistInfo(spotifyApi, artistInput) {
  try {
      const results = await spotifyApi.searchArtists(artistInput);
      const mainArtist = results.body.artists.items[0];
      return mainArtist.id;
  } catch (error) {
      throw new Error(`Error getting artist info: ${error.message}`);
  }
}

async function topTracks(spotifyApi, artistCode) {
  try {
      const country = 'US'; // Replace with the desired country code

      // Get the top tracks for the specified artist in the specified country
      const response = await spotifyApi.getArtistTopTracks(artistCode, country);
      const topTracksData = response.body.tracks;

        // Return a list of dictionaries with uri and name
        const trackList = topTracksData.map(track => ({
          uri: track.uri,
          name: track.name,
      }));

      return trackList;
  } catch (error) {
      throw new Error(`Error getting top tracks for ${artistCode}: ${error.message}`);
  }
}


// Route for the root URL
app.get("/spotify", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "spotify.html"));
});

// login route
app.get("/login", (req, res) => {
  try {
    const scopes = ["playlist-modify-private", "playlist-modify-public"];
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
    res.redirect(authorizeURL);
  } catch (error) {
    console.error("Error generating Spotify authorization URL:", error);
    res.status(500).send("Internal Server Error");
  }
});


// Handle Spotify API callback
app.get("/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const data = await spotifyApi.authorizationCodeGrant(code);
      const { access_token, refresh_token } = data.body;
  
      // Set the access token and refresh token on the Spotify API object
      spotifyApi.setAccessToken(access_token);
      spotifyApi.setRefreshToken(refresh_token);
  
      res.sendFile(path.join(__dirname, "public", "form.html"));
    } catch (error) {
      console.error("Error authenticating with Spotify:", error);
      res.status(500).send("Error authenticating with Spotify");
    }
  });

  app.post("/submit", async (req, res) => {
    console.log("GOTTEM")
    const startingPoint = req.body.startingPoint;
    const destination = req.body.destination;
    const artist = req.body.artist;

    try {
      var startingPointData = await geocode(startingPoint, MAPBOX_ACCESS_TOKEN);
      var destinationData = await geocode(destination, MAPBOX_ACCESS_TOKEN);
      

    } catch (error) {
      // Handle errors, log, or send an error response
      console.error(error.message);
      res.status(500).send("Error with geocoding");
    }

    try {
      var startingArtist = await getArtistInfo(spotifyApi, artist);
      var testSongs = await topTracks(spotifyApi, startingArtist);
    } catch (error) {
      console.error(error)
    }
      // You can use startingPointData and destinationData in your route logic
      console.log("Starting Point:", startingPointData);
      console.log("Destination:", destinationData);
      console.log("Artist:", artist);
      console.log("Test Songs: ", testSongs);
  
      // Send a response with the data
      res.json({
        startingPoint: {
          address: startingPoint,
          coordinates: startingPointData.coordinates,
          addressFull: startingPointData.addressFull,
        },
        destination: {
          address: destination,
          coordinates: destinationData.coordinates,
          addressFull: destinationData.addressFull,
        },
        artist: artist,
        testSongs: testSongs,
      });

  });


  // Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
