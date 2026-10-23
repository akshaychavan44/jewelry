$headers = @{
    "Authorization" = "Bearer lp_ext_08833a762a73abc44f564b5d64365c786938fa98b86f578c"
    "Content-Type"  = "application/json"
}

$rand = Get-Random
$body = @{
    storeName    = "Heritage Gold Atelier $rand"
    email        = "heritage_$rand@example.com"
    password     = "Jeweler123!"
    phone        = "+12125550188"
    whatsapp     = "+12125550188"
    country      = "US"
    city         = "New York"
    tagline      = "Bespoke 22k Gold & Diamond Ornaments"
    bio          = "Third-generation master artisan creating handcrafted jewelry."
    specialties  = @("Gold", "Diamonds", "Bridal")
    socials      = @{
        instagram = "heritageatelier"
    }
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/jewelers" -Method Post -Headers $headers -Body $body
    Write-Output "RESULT_SUCCESS"
    $res | ConvertTo-Json -Depth 5
} catch {
    Write-Output "RESULT_ERROR"
    $_.Exception.Message
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Output $reader.ReadToEnd()
    }
}
