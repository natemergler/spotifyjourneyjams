const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");
const path = require("path");
require("dotenv").config();

const app = express();
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

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

  app.get("/submit", async (req, res) => {
    console.log("GOTTEM")
    const startingPoint = req.query.startingPoint;
    const destination = req.query.destination;
    const artist = req.query.artist;

    try {
      const startingPointData = await geocode(startingPoint, MAPBOX_ACCESS_TOKEN);
      const destinationData = await geocode(destination, MAPBOX_ACCESS_TOKEN);
  
      // You can use startingPointData and destinationData in your route logic
      console.log("Starting Point:", startingPointData);
      console.log("Destination:", destinationData);
      console.log("Artist:", artist);
  
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
      });
    } catch (error) {
      // Handle errors, log, or send an error response
      console.error(error.message);
      res.status(500).send("Internal Server Error");
    }

  });


  // Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
