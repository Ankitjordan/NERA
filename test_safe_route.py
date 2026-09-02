import urllib.request
import json

url = "http://localhost:8080/api/v1/safe-route?waypoints=93.9368,24.8170%3B94.1077,25.6701"
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    
    print("Primary Route Distance:", data.get('primary_route', {}).get('distance', 0) / 1000, "km")
    
    avoided = data.get('avoided_hazards', [])
    print("Hazards on Primary Route:", len(avoided))
    for h in avoided:
        print(f"  - Hazard: {h.get('id')} ({h.get('action')})")
        
    alt = data.get('alternate_safe_route')
    if alt:
        print("Alternate Safe Route Distance:", alt.get('distance', 0) / 1000, "km")
    else:
        print("No Alternate Safe Route")
        
    print("Selection Reason:", data.get('selection_reason'))
