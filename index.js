const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");
const path = require("path");
require("dotenv").config();
const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const { geocode, drivingTraffic, searchArtist, topTracks, similarArtists, shuffleArray } = require('./utils');
const fetch = require('node-fetch');

//Server side constants used
const port = 3000;
const clientId = process.env.CLIENTID;
const clientSecret = process.env.CLIENTSECRET;
const redirectUri = process.env.REDIRECTURI; // Change this if needed
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;


const app = express();
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Set EJS as the view engine
app.set("view engine", "ejs");

// Set the views directory
app.set("views", path.join(__dirname, "views"));

app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSIONKEY, // Replace with a secret key for session encryption
    resave: false,
    saveUninitialized: true,
  })
);


// Route for the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// spotifyApi authentication middleware
function spotifyApiMiddleware(req, res, next) {
  if (!req.session.spotifyApi) {
      res.redirect('/login');
  } else {
    const spotifyApi = new SpotifyWebApi({clientId: clientId, clientSecret: clientSecret, redirectUri: redirectUri})
    spotifyApi.setAccessToken(req.session.spotifyApi.accessToken);
    spotifyApi.setRefreshToken(req.session.spotifyApi.refreshToken);

    req.session.spotifyApi = spotifyApi;
  } 
  next();
}

// Route for the root URL
app.get("/spotify", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "spotify.html"));
});


// login route
app.get('/login', (req, res) => {
  const spotifyApi = new SpotifyWebApi({
    clientId: clientId,
    clientSecret: clientSecret,
    redirectUri: redirectUri,
  });
  try {
    const scopes = ['playlist-modify-private', 'playlist-modify-public'];
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
    
    req.session.spotifyApi = {
      clientId: spotifyApi.getClientId(),
      clientSecret: spotifyApi.getClientSecret(),
      redirectUri: spotifyApi.getRedirectURI(),
      accessToken: spotifyApi.getAccessToken(),
      refreshToken: spotifyApi.getRefreshToken(),
    };

    res.redirect(authorizeURL);
  } catch (error) {
    console.error('Error generating Spotify authorization URL:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Handle Spotify API callback
app.get('/callback', spotifyApiMiddleware, async (req, res) => {
  const { code } = req.query;

  try {
    const spotifyApi = new SpotifyWebApi({
      clientId: clientId,
      clientSecret: clientSecret,
      redirectUri: redirectUri,
    });;

    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token } = data.body;

    // Set the access token and refresh token on the Spotify API object
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    // Update the serialized SpotifyWebApi object in the session
      req.session.spotifyApi = {
      clientId: spotifyApi.getClientId(),
      clientSecret: spotifyApi.getClientSecret(),
      redirectUri: spotifyApi.getRedirectURI(),
      accessToken: spotifyApi.getAccessToken(),
      refreshToken: spotifyApi.getRefreshToken(),
    };

    res.redirect('/form');
  } catch (error) {
    console.error('Error authenticating with Spotify:', error);
    return; // Add this line to terminate the function after sending the error response
  }
});

app.get("/form", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "form.html"));
});

app.post("/submit", spotifyApiMiddleware, async (req, res) => {
  console.log("GOTTEM");
  const startingPoint = req.body.startingPoint;
  const destination = req.body.destination;
  const artist = req.body.artist;
  // Deserialize the SpotifyWebApi object from the session
  var spotifyApi = req.session.spotifyApi;

  try {
    // Geocode and store data in the session
    req.session.startingPointData = await geocode(
      startingPoint,
      MAPBOX_ACCESS_TOKEN
    );
    req.session.destinationData = await geocode(
      destination,
      MAPBOX_ACCESS_TOKEN
    );

    // Fetch additional data (if needed)
    const startingArtist = await searchArtist(spotifyApi, artist);
    const songs = await topTracks(spotifyApi, startingArtist.id);

    // Store additional data in the session
    req.session.startingArtist = startingArtist;
    req.session.songs = songs;

    // Log the data
    console.log("Starting Point:", req.session.startingPointData);
    console.log("Destination:", req.session.destinationData);
    console.log("Artist:", artist);
    console.log("Test Songs: ", req.session.songs);

    // Render the EJS template with data
    res.render("verify", {
      startingPoint: req.session.startingPointData,
      destination: req.session.destinationData,
      artist: req.session.startingArtist.name,
      testSongs: req.session.songs,
      artistImage: req.session.startingArtist.images[0].url
    });
  } catch (error) {
    // Handle errors, log, or send an error response
    console.error(error.message);
    res.status(500).send("Error submitting request");
  }
});

app.get("/debug", spotifyApiMiddleware, (req, res) => {

  try {
    const spotifyApi = req.session.spotifyApi
  // Create a private playlist
    spotifyApi.createPlaylist('My playlist', { 'description': 'My description', 'public': true })
    .then(function(data) {
      console.log('Created playlist!');
    }, function(err) {
      console.log('Something went wrong!', err);
    });
  } catch (error) {
    console.error('Error loading or parsing JSON file:', error);
    return;
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
