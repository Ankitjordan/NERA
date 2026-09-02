import urllib.request
import urllib.parse
import sys
import ssl
import time

query = "[out:json];node(50.7,7.1,50.8,7.2);out;"

url = "https://lz4.overpass-api.de/api/interpreter"
data = urllib.parse.urlencode({'data': query}).encode('utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(url, data=data, headers={
    'User-Agent': 'NERA-Routing-Engine/1.0 (anit.kumar@example.com)',
    'Referer': 'http://localhost'
})
try:
    print("Sending Overpass query for NER drivable roads...")
    with urllib.request.urlopen(req, context=ctx) as response:
        with open("ner-roads.osm", "wb") as f:
            chunk_size = 1024 * 1024
            downloaded = 0
            while True:
                chunk = response.read(chunk_size)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                sys.stdout.write(f"\rDownloaded {downloaded/1024/1024:.2f} MB")
                sys.stdout.flush()
    print("\nDownload complete!")
except Exception as e:
    print("\nDownload failed:", e)
