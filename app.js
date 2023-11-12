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

// Set up Spotify API credentials
const spotifyApi = new SpotifyWebApi({
clientId: clientId,
clientSecret: clientSecret,
redirectUri: redirectUri,
});

// login route
app.get("/login", (req, res) => {
    //redirects to login to spotify
    const scopes = [
      "playlist-modify-private",
      "playlist-modify-public",
    ];
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
    res.redirect(authorizeURL);
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
  
      res.redirect("/form");
    } catch (error) {
      console.error("Error authenticating with Spotify:", error);
      res.status(500).send("Error authenticating with Spotify");
    }
  });

  app.get("/form", (req, res) => {
    
  });
