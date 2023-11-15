const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");
const path = require("path");
require("dotenv").config();
const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const fetch = require('node-fetch');

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

//Server side constants used
const port = 3000;
const clientId = process.env.CLIENTID;
const clientSecret = process.env.CLIENTSECRET;

const redirectUri = process.env.REDIRECTURI; // Change this if needed

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;


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
  const { clientId, clientSecret, redirectUri, accessToken, refreshToken } = serializedSpotifyApi;
  const spotifyApi = new SpotifyWebApi({ clientId, clientSecret, redirectUri });
  spotifyApi.setAccessToken(accessToken);
  spotifyApi.setRefreshToken(refreshToken);
  return spotifyApi;
};

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


app.get("/form", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "form.html"));
});

app.post("/submit", async (req, res) => {
  console.log("GOTTEM");
  const startingPoint = req.body.startingPoint;
  const destination = req.body.destination;
  const artist = req.body.artist;
  // Deserialize the SpotifyWebApi object from the session
  const serializedSpotifyApi = req.session.spotifyApi;
  const spotifyApi = deserializeSpotifyApi(serializedSpotifyApi);

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


    // Update the serialized SpotifyWebApi object in the session
    req.session.spotifyApi = serializeSpotifyApi(spotifyApi);

    // Render the EJS template with data
    res.render("result", {
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

app.get("/loading", async (req, res) => {
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

app.get("/work", async (req, res) => {
  // Deserialize the SpotifyWebApi object from the session
    const serializedSpotifyApi = req.session.spotifyApi;
    const spotifyApi = deserializeSpotifyApi(serializedSpotifyApi);  
    
    try {
    // Ensure that startingPointData and destinationData are available in the session
    if (!req.session.startingPointData || !req.session.destinationData) {
      console.error("Starting point or destination data not available");
      res
        .status(400)
        .json({ error: "Starting point or destination data not available" });
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
  // Update the serialized SpotifyWebApi object in the session
  req.session.spotifyApi = serializeSpotifyApi(spotifyApi);

  res.redirect("/playlist")
});

// Route for displaying results
app.get("/playlist", (req, res) => {
  // Deserialize the SpotifyWebApi object from the session
  const serializedSpotifyApi = req.session.spotifyApi;
  const spotifyApi = deserializeSpotifyApi(serializedSpotifyApi);  


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
