import urllib.request
import sys
import ssl

url = "https://download.openstreetmap.fr/extracts/asia/india/assam-latest.osm.pbf"
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    print(f"Downloading {url}...")
    with urllib.request.urlopen(req, context=ctx) as response:
        with open("assam-latest.osm.pbf", "wb") as f:
            f.write(response.read(1024 * 1024))
    print("Download successful")
except Exception as e:
    print("Download failed:", e)
