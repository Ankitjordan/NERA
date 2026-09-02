import urllib.request
import sys
import ssl
import os
import time

states = [
    "assam",
    "meghalaya",
    "arunachal_pradesh",
    "nagaland",
    "manipur",
    "mizoram",
    "tripura",
    "sikkim"
]

base_url = "https://download.openstreetmap.fr/extracts/asia/india/{}-latest.osm.pbf"
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
headers = {'User-Agent': 'Mozilla/5.0'}

os.makedirs("ner_pbf", exist_ok=True)

for state in states:
    url = base_url.format(state)
    filepath = f"ner_pbf/{state}-latest.osm.pbf"
    print(f"Downloading {state} from {url}...")
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response:
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            chunk_size = 1024 * 1024 * 4
            
            with open(filepath, "wb") as f:
                start_time = time.time()
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        sys.stdout.write(f"\r  {downloaded/1024/1024:.2f} MB of {total_size/1024/1024:.2f} MB ({percent:.1f}%)")
                        sys.stdout.flush()
        print(f"\nSuccessfully downloaded {state}.")
    except Exception as e:
        print(f"\nFailed to download {state}: {e}")
