import urllib.request
import sys
import ssl
import time
import os

url = "https://download.geofabrik.de/asia/india-latest.osm.pbf"
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

file_path = "india-latest.osm.pbf"
downloaded = 0

req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
})

try:
    while True:
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Range': f'bytes={downloaded}-'
            })
            with urllib.request.urlopen(req, context=ctx) as response:
                content_range = response.headers.get('Content-Range', '')
                if content_range:
                    total_size = int(content_range.split('/')[-1])
                else:
                    total_size = int(response.headers.get('content-length', 0)) + downloaded
                    
                chunk_size = 8192 * 1024 # 8MB chunks
                mode = "ab" if downloaded > 0 else "wb"
                
                with open(file_path, mode) as f:
                    start_time = time.time()
                    while True:
                        chunk = response.read(chunk_size)
                        if not chunk:
                            break
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            elapsed = time.time() - start_time
                            speed = len(chunk) / elapsed / 1024 / 1024 if elapsed > 0 else 0
                            start_time = time.time() # reset for instant speed
                            sys.stdout.write(f"\rDownloaded {downloaded/1024/1024:.2f} MB of {total_size/1024/1024:.2f} MB ({percent:.1f}%) at {speed:.2f} MB/s")
                            sys.stdout.flush()
            print("\nDownload complete!")
            break
        except urllib.error.HTTPError as e:
            if e.code == 416: # Range Not Satisfiable (already fully downloaded)
                print("\nAlready fully downloaded!")
                break
            print(f"\nHTTP Error {e.code}: {e.reason}. Retrying in 5s...")
            time.sleep(5)
        except Exception as e:
            print(f"\nDownload failed: {e}. Retrying in 5s...")
            time.sleep(5)
except Exception as e:
    print("\nFatal Error:", e)
