import urllib.request
url = 'https://cropconnect01-production.up.railway.app/api/sensors/latest?device_id=sim-node-1'
with urllib.request.urlopen(url, timeout=15) as r:
    print(r.status)
    print(r.read().decode('utf-8'))
