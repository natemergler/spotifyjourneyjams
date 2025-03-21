# Spotify Journey Jams

Spotify Journey Jams makes the perfect length playlist for your driving needs.
<details>
    <summary>Screenshots</summary>
    
![Spotify Journey Jams](https://github.com/user-attachments/assets/70a018f6-9ff5-416a-b5e4-640eef575144)

The home page to login with spotify.

![Location search screen](https://github.com/user-attachments/assets/739b1290-fe2c-494e-b02f-17df1166782c)

Location Search page

![Location selection screen](https://github.com/user-attachments/assets/c8f7b8a0-5050-4fe6-8838-c317a009bb4d)

Mapbox will find the quickest route and also autocorrect the addresses

![Music Search Screen](https://github.com/user-attachments/assets/825d321f-e687-487d-bc43-6d2e1e9cba96)

Search for either an artist or song

![Artist Selection](https://github.com/user-attachments/assets/a7b67e6a-ef7a-4640-bac5-504c3eb0ba8f)

Pick the artist and see their top songs

![Song selection](https://github.com/user-attachments/assets/3fd26562-8a5c-41af-b2e1-b4d13797c87a)

Pick the song you were looking for
</details>

## Installation

### Node.js

1. Clone the repository
2. Run `npm install` to install dependencies
3. Create a `.env` file with:
    ```.env
    CLIENTID=<YourSpotifyClientId>
    CLIENTSECRET=<YourSpotifyClientSecret>
    REDIRECTURI=<YourSpotifyRedirectURI>
    MAPBOX_ACCESS_TOKEN=<YourMapboxAccessToken>
    SESSIONKEY=<YourSessionKey>
    PORT=<YourPortNumber>
    ```
4. Run `npm start` to start the server

### Docker

To run using Docker:

```bash
docker run -p 3000:3000 --env-file .env ghcr.io/natemergler/spotifyjourneyjams:latest
```

Make sure to create a `.env` file with the necessary environment variables before running the container.

The Docker image uses Phusion Passenger to host and run the NodeJS application
