import requests
import json

access_token = "sk.eyJ1IjoiY29ubm9ydzA0IiwiYSI6ImNsbWxhNjBicjBhOHoybG4xM2owamI3OXgifQ.frvVXmUdGuV8SirxAjc6aQ"

endpoint = "https://api.mapbox.com/geocoding/v5/mapbox.places/"

address1 = input("Please enter a valid destination address: ")
address2 = input("Please enter a valid address of origin: ")

addresses = [address1, address2]
for address in addresses:
    '''
    params = {
        "access_token": access_token,
        "autocomplete": "true",
        "limit": 1,
        "types": "address",
        "query": address
        }
        '''
    url = f"{endpoint}{address}.json?access_token={access_token}"
    response = requests.get(url)

    data = response.json()

    print(data)

    if data.get("features"):
        feature = data["features"][0]
        coordinates = feature["center"]
        print(f"Address: {address}, Coordinates: {coordinates}")
        print(data["features"][0]["place_name"])
    else:
        print(f"Geocoding failed for: {address}")