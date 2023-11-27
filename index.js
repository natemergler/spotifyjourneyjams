const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");
const path = require("path");
require("dotenv").config();
const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const fetch = require('node-fetch');
const cors = require('cors');


const app = express();
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Set EJS as the view engine
app.set("view engine", "ejs");

// Set the views directory
app.set("views", path.join(__dirname, "views"));

const corsOptions = {
  origin: /\.spotify\.com$/, // Allows any subdomain under spotify.com
  methods: 'GET',
};

app.use(cors(corsOptions));

app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSIONKEY, // Replace with a secret key for session encryption
    resave: false,
    saveUninitialized: true,
  })
);

app.use((req, res, next) => {
  // Set Cache-Control header to make the cache last for 30 minutes
  res.setHeader('Cache-Control', 'public, max-age=1800');
  next();
});

// Route for the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

//Server side constants used
const port = 3000;
const clientId = process.env.CLIENTID;
const clientSecret = process.env.CLIENTSECRET;
const redirectUri = process.env.REDIRECTURI; // Change this if needed
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

// Route for the root URL
app.get("/spotify", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "spotify.html"));
});

// Serialize the SpotifyWebApi object for session storage
const serializeSpotifyApi = (spotifyApi) => {
  return {
    clientId: spotifyApi.getClientId(),
    clientSecret: spotifyApi.getClientSecret(),
    redirectUri: spotifyApi.getRedirectURI(),
    accessToken: spotifyApi.getAccessToken(),
    refreshToken: spotifyApi.getRefreshToken(),
  };
};

// Deserialize the SpotifyWebApi object from session storage
const deserializeSpotifyApi = (serializedSpotifyApi) => {
  if (!serializedSpotifyApi) {
    // If the serialized object is undefined or falsy, return a new SpotifyWebApi instance
    return new SpotifyWebApi({ clientId: clientId1, clientSecret: clientSecret1, redirectUri: redirectUri1 });
  }

  const { clientId, clientSecret, redirectUri, accessToken, refreshToken } = serializedSpotifyApi;
  const spotifyApi = new SpotifyWebApi({ clientId, clientSecret, redirectUri });
  spotifyApi.setAccessToken(accessToken);
  spotifyApi.setRefreshToken(refreshToken);
  return spotifyApi;
}; 

// login route
app.get('/login', (req, res) => {
  const spotifyApi = new SpotifyWebApi({
    clientId: clientId1,
    clientSecret: clientSecret1,
    redirectUri: redirectUri1,
  });

  try {
    const scopes = ['playlist-modify-private', 'playlist-modify-public'];
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
    
    // Serialize and store the SpotifyWebApi object in the session
    req.session.spotifyApi = serializeSpotifyApi(spotifyApi);
    
    res.redirect(authorizeURL);
  } catch (error) {
    console.error('Error generating Spotify authorization URL:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Handle Spotify API callback
app.get('/callback', async (req, res) => {
  const { code } = req.query;

  try {
    // Deserialize the SpotifyWebApi object from the session
    const serializedSpotifyApi = req.session.spotifyApi;
    const spotifyApi = deserializeSpotifyApi(serializedSpotifyApi);

    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token } = data.body;

    // Set the access token and refresh token on the Spotify API object
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    // Update the serialized SpotifyWebApi object in the session
    req.session.spotifyApi = serializeSpotifyApi(spotifyApi);

    res.redirect('/form');
  } catch (error) {
    console.error('Error authenticating with Spotify:', error);
    res.status(500).send('Error authenticating with Spotify');
  }
});

app.get("/playlistdebug", (req, res) => {
  // Deserialize the SpotifyWebApi object from the session
  const serializedSpotifyApi = req.session.spotifyApi;
  const spotifyApi = deserializeSpotifyApi(serializedSpotifyApi);  

  try {
    const filePath = path.join(__dirname, 'test.json');
    const debugsession = require(filePath);

    res.render("playlist", {
      startingPoint: debugsession.startingPointData,
      destination: debugsession.destinationData,
      artist: debugsession.startingArtist.name,
      songs: debugsession.songs,
      playlist: debugsession.playlist,
      duration: debugsession.duration,
      distance: debugsession.distance,
    });
  } catch (error) {
    console.error('Error loading or parsing JSON file:', error);

    // You can customize the response when an error occurs
    res.status(500).send('Internal Server Error');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
