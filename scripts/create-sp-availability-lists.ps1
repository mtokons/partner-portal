# PowerShell script to create TeamAvailability and AvailabilityAudit lists on SharePoint Online
# Run this script with a SharePoint Online administrator or site owner account.
#
# Requirements:
# Install-Module -Name PnP.PowerShell -Scope CurrentUser

[CmdletBinding()]
param(
    [string]$SiteUrl = "https://mtokons.sharepoint.com/sites/Studyandcareercoachgermany.com"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Creating Team Availability SharePoint Lists" -ForegroundColor Cyan
Write-Host "Site: $SiteUrl" -ForegroundColor Cyan
Write-Host "=========================================================="

# Check if PnP.PowerShell is installed
if (-not (Get-Module -ListAvailable -Name PnP.PowerShell)) {
    Write-Host "PnP.PowerShell is not installed. Installing PnP.PowerShell for CurrentUser..." -ForegroundColor Yellow
    Install-Module -Name PnP.PowerShell -Scope CurrentUser -Force -AllowClobber
}

Write-Host "`nConnecting to SharePoint Online (interactive login)..." -ForegroundColor Yellow
Connect-PnPOnline -Url $SiteUrl -Interactive

# Function to add field if missing
function Add-FieldIfMissing {
    param(
        [string]$ListTitle,
        [string]$InternalName,
        [string]$DisplayName,
        [string]$Type = "Text"
    )
    $field = Get-PnPField -List $ListTitle -Identity $InternalName -ErrorAction SilentlyContinue
    if (-not $field) {
        Write-Host "  Adding column [$DisplayName] ($InternalName)..." -ForegroundColor DarkGray
        if ($Type -eq "Note") {
            Add-PnPField -List $ListTitle -InternalName $InternalName -DisplayName $DisplayName -Type Note -AddToDefaultView | Out-Null
        } else {
            Add-PnPField -List $ListTitle -InternalName $InternalName -DisplayName $DisplayName -Type Text -AddToDefaultView | Out-Null
        }
    } else {
        Write-Host "  Column [$DisplayName] already exists." -ForegroundColor DarkGray
    }
}

# 1. Create TeamAvailability List
Write-Host "`n1. Checking List: TeamAvailability..." -ForegroundColor Green
$availList = Get-PnPList -Identity "TeamAvailability" -ErrorAction SilentlyContinue
if (-not $availList) {
    Write-Host "Creating list 'TeamAvailability'..." -ForegroundColor Yellow
    $availList = New-PnPList -Title "TeamAvailability" -Template GenericList -EnableVersioning
}
Write-Host "Configuring columns for TeamAvailability..." -ForegroundColor Green
Add-FieldIfMissing -ListTitle "TeamAvailability" -InternalName "UserId" -DisplayName "User ID"
Add-FieldIfMissing -ListTitle "TeamAvailability" -InternalName "UserName" -DisplayName "User Name"
Add-FieldIfMissing -ListTitle "TeamAvailability" -InternalName "UserEmail" -DisplayName "User Email"
Add-FieldIfMissing -ListTitle "TeamAvailability" -InternalName "Department" -DisplayName "Department"
Add-FieldIfMissing -ListTitle "TeamAvailability" -InternalName "Date" -DisplayName "Date"
Add-FieldIfMissing -ListTitle "TeamAvailability" -InternalName "Status" -DisplayName "Status"
Add-FieldIfMissing -ListTitle "TeamAvailability" -InternalName "StartTime" -DisplayName "Start Time"
Add-FieldIfMissing -ListTitle "TeamAvailability" -InternalName "EndTime" -DisplayName "End Time"
Add-FieldIfMissing -ListTitle "TeamAvailability" -InternalName "Note" -DisplayName "Note" -Type "Note"
Add-FieldIfMissing -ListTitle "TeamAvailability" -InternalName "CreatedBy" -DisplayName "Created By"
Add-FieldIfMissing -ListTitle "TeamAvailability" -InternalName "UpdatedBy" -DisplayName "Updated By"
Add-FieldIfMissing -ListTitle "TeamAvailability" -InternalName "CreatedAt" -DisplayName "Created At"
Add-FieldIfMissing -ListTitle "TeamAvailability" -InternalName "UpdatedAt" -DisplayName "Updated At"

# 2. Create AvailabilityAudit List
Write-Host "`n2. Checking List: AvailabilityAudit..." -ForegroundColor Green
$auditList = Get-PnPList -Identity "AvailabilityAudit" -ErrorAction SilentlyContinue
if (-not $auditList) {
    Write-Host "Creating list 'AvailabilityAudit'..." -ForegroundColor Yellow
    $auditList = New-PnPList -Title "AvailabilityAudit" -Template GenericList -EnableVersioning
}
Write-Host "Configuring columns for AvailabilityAudit..." -ForegroundColor Green
Add-FieldIfMissing -ListTitle "AvailabilityAudit" -InternalName "AvailabilityId" -DisplayName "Availability ID"
Add-FieldIfMissing -ListTitle "AvailabilityAudit" -InternalName "UserId" -DisplayName "User ID"
Add-FieldIfMissing -ListTitle "AvailabilityAudit" -InternalName "Date" -DisplayName "Date"
Add-FieldIfMissing -ListTitle "AvailabilityAudit" -InternalName "Action" -DisplayName "Action"
Add-FieldIfMissing -ListTitle "AvailabilityAudit" -InternalName "ChangedBy" -DisplayName "Changed By"
Add-FieldIfMissing -ListTitle "AvailabilityAudit" -InternalName "ChangedAt" -DisplayName "Changed At"
Add-FieldIfMissing -ListTitle "AvailabilityAudit" -InternalName "OldValue" -DisplayName "Old Value" -Type "Note"
Add-FieldIfMissing -ListTitle "AvailabilityAudit" -InternalName "NewValue" -DisplayName "New Value" -Type "Note"
Add-FieldIfMissing -ListTitle "AvailabilityAudit" -InternalName "Reason" -DisplayName "Reason" -Type "Note"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "All SharePoint lists and columns are ready!" -ForegroundColor Green
Write-Host "=========================================================="
