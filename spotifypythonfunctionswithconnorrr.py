import spotipy
from spotipy.oauth2 import SpotifyOAuth
import random
import requests
import json

"""
SSSSS  PPPP   OOOO  TTTTT  III  FFFFF  Y   Y
SS     P   P O    O   T     I   F       Y Y 
 SSS   PPPP  O    O   T     I   FFFF     Y  
    SS P     O    O   T     I   F        Y  
SSSS   P      OOOO    T    III  F        Y  
"""

def authenticate_spotify():
    scope = "playlist-modify-public", "playlist-modify-private"
    sp = spotipy.Spotify(auth_manager=SpotifyOAuth(scope=scope))
    return sp

def get_artist_info(sp, artist_input):
    results = sp.search(q='artist:' + artist_input, type='artist')
    main_artist = results["artists"]["items"][0]
    return main_artist

def print_artist_info(main_artist, verify_songs):
    artist_name = main_artist["name"]
    if len(verify_songs['tracks']) >= 2:
        print(f"Are you looking for {artist_name}, who has made classics like {verify_songs['tracks'][0]['name']} and {verify_songs['tracks'][1]['name']}")
    elif len(verify_songs['tracks']) == 1:
        print(f"Are you looking for {artist_name}, who has made a classic like {verify_songs['tracks'][0]['name']}")
    else:
        print(f"No top tracks found for {artist_name}. Try a different artist.")

def create_artist_dictionary(main_artist):
    artist_dictionary = [{"id": main_artist["id"], "name": main_artist["name"], "images": main_artist["images"]}]
    return artist_dictionary

def find_similar_artists(sp, artist_id, target_duration_seconds):
    similar_search_term = artist_id
    artist_dictionary = []
    indices_for_search = [0]
    
    while len(artist_dictionary) < ((target_duration_seconds / 60) // 30) * 2 + 6:
        similar_artist_search = sp.artist_related_artists(similar_search_term)
        
        i = 0
        while i < len(similar_artist_search["artists"]):
            i_dict = {"id": similar_artist_search["artists"][i]["id"], 
                      "name": similar_artist_search["artists"][i]["name"], 
                      "images": similar_artist_search["artists"][i]["images"]}
            artist_dictionary.append(i_dict)
            i += 1
        
        j = random.randint(1, len(artist_dictionary) - 1)
        if j not in indices_for_search:
            indices_for_search.append(j)
            similar_search_term = artist_dictionary[j]["id"]
    print("Found list of artists")
    return artist_dictionary
    

def select_songs_for_playlist(target_duration_seconds, list_o_songs):
    songs_to_select_from = list_o_songs.copy()
    random.shuffle(songs_to_select_from)
    selected_songs = []
    current_duration = 0
    max_over_target_duration_seconds = 120
    
    while current_duration < target_duration_seconds:
        # Randomly select a song
        random_song = random.choice(songs_to_select_from)
        song_duration_seconds = random_song["duration_ms"] / 1000
    
        # Check if adding this song exceeds the max over target duration
        if current_duration + song_duration_seconds > target_duration_seconds + max_over_target_duration_seconds:
            # If adding this song exceeds the limit, replace a song with another randomly selected song
            if len(selected_songs) > 0:
                # Replace a song with a new random song
                random_index_to_replace = random.randint(0, len(selected_songs) - 1)
                selected_songs[random_index_to_replace] = random.choice(songs_to_select_from)
                current_duration = sum(song["duration_ms"] / 1000 for song in selected_songs)
        else:
            # Add the song to the selected list and update the current duration
            selected_songs.append(random_song)
            current_duration += song_duration_seconds
            songs_to_select_from.remove(random_song)  # Remove the selected song from the list to avoid duplicates

    print("selected songs for playlist")
    return selected_songs

def create_and_fill_playlist(sp, user_id, playlist_name, playlist_description, selected_songs):
    uri_list = [song["uri"] for song in selected_songs]
    random.shuffle(uri_list)
    
    # create playlist
    playlist = sp.user_playlist_create(user_id, playlist_name, public=False, collaborative=False, description=playlist_description)
    print("Created Playlist")
    playlist_uri = playlist['uri']
    # Define the chunk size
    chunk_size = 50

    # Calculate the total number of chunks
    total_chunks = (len(uri_list) + chunk_size - 1) // chunk_size

    # Loop through the chunks of the uri_list
    for i in range(total_chunks):
        start_index = i * chunk_size
        end_index = (i + 1) * chunk_size
        chunk_uris = uri_list[start_index:end_index]

        # Add the chunk of URIs to the playlist
        sp.playlist_add_items(playlist_uri, chunk_uris)


    print("Added songs to playlist")
    playlist_details = sp.playlist(playlist_uri)
    images = playlist_details['images']
    if images:
        return images[0]['url']
    else:
        return None

"""
MM   MM AAAAA  PPPP   
MMM MMM A   A  P   P  
MM M MM AAAAA  PPPP   
MM   MM A   A  P     
MM   MM A   A  P     
"""
access_token = "sk.eyJ1IjoiY29ubm9ydzA0IiwiYSI6ImNsbWxhNjBicjBhOHoybG4xM2owamI3OXgifQ.frvVXmUdGuV8SirxAjc6aQ"

def geocode(address, access_token):
    
    endpoint = "https://api.mapbox.com/geocoding/v5/mapbox.places/"
    
    url = f"{endpoint}{address}.json?access_token={access_token}"
    response = requests.get(url)

    data = response.json()
    
    if data.get("features"):
        feature = data["features"][0]
        coordinates = feature["center"]
        var1 = (f"Address: {address}, Coordinates: {coordinates}")
        address_full = (data["features"][0]["place_name"])
        return address_full, coordinates
    else:
        return (f"Geocoding failed for: {address}")

def DrivingTraffic(coordinate1, coordinate2, access_token):
    
    endpoint = "https://api.mapbox.com/directions/v5/mapbox/driving-traffic/"

    params = {
    
        "access_token" : access_token,
        "annotations" : "distance,duration", # Includes distance and duration annotations
        "origin" : f"{coordinate1[0]}, {coordinate1[1]}",
        "destination" : f"{coordinate2[0]}, {coordinate2[1]}"
        }

    # Send the request
    # response = requests.get(endpoint, params=params)
    response = requests.get(endpoint + params["origin"] + ";" + params["destination"] +"?access_token=" + access_token)

    data = response.json()

    if response.status_code == 200:
        # Parse the JSON response
        data = response.json()

        # Extract duration and distance values from the response
        route = data["routes"][0]  # Assuming you want data from the first route
        duration = route["duration"]
        distance = route["distance"]

        # Now you can use the duration and distance variables as needed
        route_duration = (f"Duration: {duration} seconds")
        route_distance = (f"Distance: {distance} meters")
        return duration, distance
    else:
        # Handle the case when the API request was not successful
        return("Directions Failed, Please Re-input.", f"API request failed with status code: {response.status_code}")
    
def meters_to_miles(meters):
    # Conversion factor
    meters_per_mile = 1609.34  # 1 mile = 1609.34 meters

    # Perform the conversion
    miles = meters / meters_per_mile

    return miles



"""
MM   MM AAAAA III N   N     MM   MM AAAAA III N   N
MMM MMM A   A  I  NN  N     MMM MMM A   A  I  NN  N
MM M MM AAAAA  I  N N N     MM M MM AAAAA  I  N N N
MM   MM A   A  I  N  NN     MM   MM A   A  I  N  NN
MM   MM A   A III N   N     MM   MM A   A III N   N

MM   MM AAAAA III N   N
MMM MMM A   A  I  NN  N
MM M MM AAAAA  I  N N N
MM   MM A   A  I  N  NN
MM   MM A   A III N   N

MM   MM AAAAA III N   N
MMM MMM A   A  I  NN  N
MM M MM AAAAA  I  N N N
MM   MM A   A  I  N  NN
MM   MM A   A III N   N

MM   MM AAAAA III N   N
MMM MMM A   A  I  NN  N
MM M MM AAAAA  I  N N N
MM   MM A   A  I  N  NN
MM   MM A   A III N   N
"""

def main():
    sp = authenticate_spotify()
    
    route_duration = "Directions Failed, Please Re-input."
    # Test inputs
    artist_input = input("Pick an artist for inspiration: \n")
                         

    while route_duration == "Directions Failed, Please Re-input.":
        address1 = input("Please enter a valid address of origin: ")
        address2 = input("Please enter a valid destination address: ")

        addresses = [address1, address2]

        address_full1, coordinate1 = geocode(address1, access_token)
        print("Full Address:", address_full1, "- Address Coordinates:", coordinate1)
        
        address_full2, coordinate2 = geocode(address2, access_token)
        print("Full Address:", address_full2, "- Address Coordinates:", coordinate2)

        route_duration, route_distance = DrivingTraffic(coordinate1, coordinate2, access_token)
        if route_duration == "Directions Failed, Please Re-input.":
            print("No Driving Directions Available, Please Re-input.")
        
    seconds = route_duration

    time_input = seconds

    route_duration = route_duration / 60

    route_duration = round(route_duration)

    if route_duration > 59:
        hours = route_duration / 60
        minutes = (hours % 1) * 60
        minutes = round(minutes)
        hours = hours // 1
        route_duration = (str(hours)[:-2] + " Hours " + str(minutes) + " Minutes")
    else:
        route_duration = (str(route_duration) + " Minutes")

    meters = route_distance
    route_distance = meters_to_miles(meters)

    route_distance = round(route_distance, 1)

    print(route_duration, route_distance, "Miles")    
    target_duration_seconds = time_input
    
    # Search for the first artist and verify
    main_artist = get_artist_info(sp, artist_input)
    main_artist_id = main_artist["id"]
    
    verify_songs = sp.artist_top_tracks(main_artist_id, country='US')
    
    print_artist_info(main_artist, verify_songs)
    
    artist_dictionary = create_artist_dictionary(main_artist)
    
    # Find similar artists
    artist_dictionary.extend(find_similar_artists(sp, main_artist_id, target_duration_seconds))
    
    # Get top songs for each artist in the dictionary
    list_o_songs = []
    for artist in artist_dictionary:
        top_songs = sp.artist_top_tracks(artist["id"], country='US')
        for song in top_songs["tracks"]:
            list_o_songs.append({"artist_name": song["artists"][0]["name"], 
                                 "duration_ms": song["duration_ms"], 
                                 "uri": song["uri"], 
                                 "track_name": song["name"]})
    
    # Make the final song list
    selected_songs = select_songs_for_playlist(target_duration_seconds, list_o_songs)
    
    user_id = sp.me()['id']
    playlist_name = "Road Trip!"
    playlist_description = "Made with love on Spotify Journey Jams"
    
    playlist_cover = create_and_fill_playlist(sp, user_id, playlist_name, playlist_description, selected_songs)

    print(playlist_cover)

if __name__ == "__main__":
    main()
