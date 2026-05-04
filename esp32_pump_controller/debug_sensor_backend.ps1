$url = 'https://cropconnect01-production.up.railway.app/api/sensors/latest?device_id=sim-node-1'
try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
} catch {
    Write-Error $_.Exception.Message
}
