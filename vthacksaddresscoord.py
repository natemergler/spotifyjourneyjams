import requests
import json
import math

from vthacksgeocodefunction import geocode
from vthacksdrivingtrafficfunction import DrivingTraffic
from meterstomiles import meters_to_miles

route_duration = "Directions Failed, Please Re-input."

access_token = "sk.eyJ1IjoiY29ubm9ydzA0IiwiYSI6ImNsbWxhNjBicjBhOHoybG4xM2owamI3OXgifQ.frvVXmUdGuV8SirxAjc6aQ"

endpoint = "https://api.mapbox.com/geocoding/v5/mapbox.places/"
'''
address1 = input("Please enter a valid address of origin: ")
address2 = input("Please enter a valid destination address: ")

addresses = [address1, address2]

address_full1, coordinate1 = geocode(address1, access_token)
print("Full Address:", address_full1, "- Address Coordinates:", coordinate1)
    
address_full2, coordinate2 = geocode(address2, access_token)
print("Full Address:", address_full2, "- Address Coordinates:", coordinate2)

route_duration, route_distance = DrivingTraffic(coordinate1, coordinate2, access_token)
'''
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