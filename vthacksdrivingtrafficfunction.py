import requests
import json

access_token = "sk.eyJ1IjoiY29ubm9ydzA0IiwiYSI6ImNsbWxhNjBicjBhOHoybG4xM2owamI3OXgifQ.frvVXmUdGuV8SirxAjc6aQ"

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