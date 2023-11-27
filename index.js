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

    req.spotifyApi = spotifyApi;
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
  var spotifyApi = req.spotifyApi;

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

app.get("/loading", spotifyApiMiddleware, async (req, res) => {
  try {
    // Render the "loading" view immediately
    res.render("loading");
  } catch (error) {
    console.error("Error during loading:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/loadingtest", async (req, res) => {
  try {
    // Render the "loading" view immediately
    res.render("loadingtest");
  } catch (error) {
    console.error("Error during loading:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/work", spotifyApiMiddleware, async (req, res) => {
  // Deserialize the SpotifyWebApi object from the session
    const spotifyApi = req.spotifyApi;
    
    try {
    // Ensure that startingPointData and destinationData are available in the session
    if (!req.session.startingPointData || !req.session.destinationData) {
      console.error("Starting point or destination data not available");
      res.redirect('/form');
      return;
    }

    // Get driving traffic information
    var { duration, distance, routeDuration, routeDistance, errorMessage } =
      await drivingTraffic(
        req.session.startingPointData.coordinates,
        req.session.destinationData.coordinates,
        MAPBOX_ACCESS_TOKEN
      );
    
    req.session.duration = duration
    req.session.distance = distance

    if (errorMessage) {
      console.error(errorMessage);
      res.status(500).json({ error: "Error processing the request" });
      return;
    }
    console.log(routeDistance + " " + routeDuration);
  } catch (error) {
    console.error("Error during distance calculation:", error);
    res.status(500).json({ error: "Error during distance calculation" });
  }
  try {
    // make list of artists
    let baseArtist = req.session.startingArtist.id;
    var artistDictionary = [req.session.startingArtist];
    const indicesForSearch = [0];
    while (artistDictionary.length < Math.floor(duration / 60 / 30) * 2 + 6) {
      const similarArtistList = await similarArtists(spotifyApi, baseArtist);
      artistDictionary.push(...similarArtistList);

      let j;
      do {
        j = Math.floor(Math.random() * (artistDictionary.length - 1) + 1);
      } while (indicesForSearch.includes(j));
      indicesForSearch.push(j);
    }
    req.session.artists = artistDictionary
  } catch (error) {
    console.error("Error making list of artists:", error);
    res.status(500).json({ error: "Error making list of artists" });
  }

  try {
    var songs = req.session.songs;
    //make list of songs
    for (let i = 1; i < artistDictionary.length - 1; i++) {
      artist = artistDictionary[i];
      const artistTopTracks = await topTracks(spotifyApi, artist.id);

      songs.push(...artistTopTracks);
    }
  } catch (error) {
    console.error("Error finding artists top tracks:", error);
    res.status(500).json({ error: "Error finding artists top tracks" });
  }

  //shuffle songs and prepare for playlist
  const songsToSelectFrom = [...songs]; // Using the spread operator to create a shallow copy
  shuffleArray(songsToSelectFrom); // Assuming shuffleArray is a function that shuffles the array
  const selectedSongs = [];
  var currentDuration = 0;
  const overshootSeconds = 120;

  while (currentDuration < duration) {
    var randomSong =
      songsToSelectFrom[Math.floor(Math.random() * songsToSelectFrom.length)];
    songDuration = randomSong.duration_ms / 1000;

    if (currentDuration + songDuration > duration + overshootSeconds) {
      if (selectedSongs.length > 0) {
        replacingIndex = Math.floor(Math.random() * selectedSongs.length);
        selectedSongs[replacingIndex] =
          songsToSelectFrom[
            Math.floor(Math.random() * songsToSelectFrom.length)
          ];
        currentDuration = selectedSongs.reduce(
          (sum, song) => sum + song.duration_ms / 1000,
          0
        );
      }
    } else {
      selectedSongs.push(randomSong);
      currentDuration += songDuration;
      const indexOfRandomSong = songsToSelectFrom.indexOf(randomSong);
      if (indexOfRandomSong !== -1) {
        songsToSelectFrom.splice(indexOfRandomSong, 1);
      }
    }
  }

  shuffleArray(selectedSongs);
  req.session.songs = selectedSongs
  var songIds = selectedSongs.map((song) => song.id);

  try {
    // Create playlist
    const playlistName = "Road Trip!";
    const playlistDescription = "Made with love on Spotify Journey";

    // Get the current user's ID
    const userId = await spotifyApi.getMe();

    // Create the playlist
    var roadTripPlaylist = await spotifyApi.createPlaylist(playlistName, {
      description: playlistDescription,
    });

    // Get the URI of the created playlist
    var playlistUri = roadTripPlaylist.body.id;

    req.session.playlist = roadTripPlaylist;

    console.log("Creating Playlist");

    console.log("Playlist URI:", playlistUri);

    console.log("/n /n Song IDs:", songIds);

    const chunkSize = 100;
    const totalChunks = Math.ceil(songIds.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const startIndex = i * chunkSize;
      const endIndex = (i + 1) * chunkSize;
      const chunkSongIds = songIds.slice(startIndex, endIndex);

      try {
        // Add songs to the playlist
        const response = await spotifyApi.addTracksToPlaylist(
          playlistUri,
          chunkSongIds
        );

        console.log(`Added chunk ${i + 1} of ${totalChunks} to the playlist`);
      } catch (error) {
        console.error(
          `Error adding chunk ${i + 1} to the playlist:`,
          error.message
        );
        // Handle the error as needed
      }
    }
  } catch (error) {
    console.error("Error creating playlist:", error.message);
    // Handle the error as needed
  }

  res.redirect("/playlist")
});

// Route for displaying results
app.get("/playlist", spotifyApiMiddleware, (req, res) => {
  const spotifyApi = req.session.spotifyApi;  

  try {
    // Render the EJS template with data
    res.render("playlist", {
      artist: req.session.startingArtist.name,
      songs: req.session.songs,
      playlist: req.session.playlist,
      duration: req.session.duration,
      distance: req.session.distance, // Make sure to pass the playlist data
    });

  } catch (error) {
    // Handle errors, log, or send an error response
    console.error(error.message);
    res.status(500).send("Error displaying results");
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
