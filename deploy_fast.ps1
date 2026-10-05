param(
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$StartTime = Get-Date

Write-Host ''
Write-Host '======================================' -ForegroundColor Cyan
Write-Host ' 🚀 SCCG FAST INCREMENTAL DEPLOYER    ' -ForegroundColor Cyan
Write-Host '======================================' -ForegroundColor Cyan

# 1. Build step
if (-not $SkipBuild) {
  Write-Host ''
  Write-Host '🔨 [1/4] Building Next.js production bundle...' -ForegroundColor Yellow
  $env:PATH = 'C:\Users\md.hasnain\AppData\Local\nvm\v20.14.0;' + $env:PATH
  cmd.exe /c "npm run build"
  if ($LASTEXITCODE -ne 0) {
    throw 'Build failed. Aborting deploy.'
  }
} else {
  Write-Host ''
  Write-Host '⏩ [1/4] Skipping build step (using existing build)...' -ForegroundColor DarkGray
}

# 2. Package incremental compilation artifacts (excluding node_modules)
Write-Host '📦 [2/4] Packaging code diff (server & static chunks only)...' -ForegroundColor Yellow
$PatchArchive = Join-Path $env:TEMP "sccg-patch.tar.gz"
if ([System.IO.File]::Exists($PatchArchive)) { [System.IO.File]::Delete($PatchArchive) }

# Ensure static & public exist in standalone
if (Test-Path '.\.next\static') {
  robocopy '.\.next\static' '.\.next\standalone\.next\static' /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}
if (Test-Path '.\public') {
  robocopy '.\public' '.\.next\standalone\public' /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
}

Push-Location '.\.next\standalone'
tar.exe -czf $PatchArchive .next public server.js package.json
Pop-Location

$ArchiveLength = (Get-Item $PatchArchive).Length
$ArchiveSizeMb = [math]::Round(($ArchiveLength / 1MB), 2)
Write-Host "   Archive size: $ArchiveSizeMb MB (compressed bundle in temp)" -ForegroundColor Green

# 3. Fast SCP upload
$SshKey = '.\ssh-key-2026-05-02.key'
$VpsUser = 'ubuntu'
$VpsIp = '158.180.45.36'
$VpsHost = "$VpsUser@$VpsIp"
$RemoteTarPath = "$VpsHost`:/tmp/sccg-patch.tar.gz"
$RemoteComposePath = "$VpsHost`:~/partner-portal/docker-compose.yml"

Write-Host '⚡ [3/4] Uploading patch to Oracle VPS...' -ForegroundColor Yellow
scp -i $SshKey -o StrictHostKeyChecking=no $PatchArchive $RemoteTarPath
scp -i $SshKey -o StrictHostKeyChecking=no '.\docker-compose.yml' $RemoteComposePath
if ([System.IO.File]::Exists($PatchArchive)) { [System.IO.File]::Delete($PatchArchive) }

# 4. Extract and instantaneous container restart
Write-Host '🔄 [4/4] Applying update and restarting portal container...' -ForegroundColor Yellow
$RemoteCmd = 'mkdir -p ~/partner-portal/.next/standalone && tar xzf /tmp/sccg-patch.tar.gz -C ~/partner-portal/.next/standalone && chmod -R a+rX ~/partner-portal/.next/standalone && rm -f /tmp/sccg-patch.tar.gz && cd ~/partner-portal && export COMPOSE_PROJECT_NAME=partner-portal-main && sudo docker compose -p partner-portal-main up -d --no-deps portal && sudo docker compose -p partner-portal-main restart portal'

ssh -i $SshKey -o StrictHostKeyChecking=no $VpsHost $RemoteCmd

$EndTime = Get-Date
$ElapsedTime = [math]::Round(($EndTime - $StartTime).TotalSeconds, 1)
Write-Host ''
Write-Host "✅ Fast Deploy Completed in $ElapsedTime seconds!" -ForegroundColor Green
Write-Host '🌐 Live at: https://portal.mysccg.de' -ForegroundColor Cyan
Write-Host ''
