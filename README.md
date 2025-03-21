# Spotify Journey Jams

Spotify Journey Jams makes the perfect length playlist for your driving needs.

## Installation

### Node.js

1. Clone the repository
2. Run `npm install` to install dependencies
3. Create a `.env` file with:
    a. CLIENTID=<YourSpotifyClientId>
    b. CLIENTSECRET=<YourSpotifyClientSecret>
    c. REDIRECTURI=<YourSpotifyRedirectURI>
    d. MAPBOX_ACCESS_TOKEN=<YourMapboxAccessToken>
    e. SESSIONKEY=faoj3q49puy4v2u4tpr89u
    f. PORT=<YourPortNumber>
4. Run `npm start` to start the server

### Docker

To run using Docker:

```bash
docker run -p 3000:3000 --env-file .env ghcr.io/natemergler/spotifyjourneyjams:latest
```

Make sure to create a `.env` file with the necessary environment variables before running the container.

The Docker image uses Phusion Passenger to host and run the NodeJS application