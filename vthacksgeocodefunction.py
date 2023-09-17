''' GEOCODE FUNCTION '''

import requests
import json

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