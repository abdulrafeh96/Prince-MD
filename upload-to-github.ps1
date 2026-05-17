param(
    [string]$BotFolder = $PSScriptRoot,
    [string]$RepoUrl = 'https://github.com/abdulrafeh96/Prince-MD.git',
    [string]$Branch = 'main',
    [string]$CommitMessage = 'Upload bot'
)

function Write-ErrorExit {
    param([string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-ErrorExit 'Git is not installed or not available in PATH.'
}

$BotFolder = Resolve-Path -Path $BotFolder -ErrorAction SilentlyContinue
if (-not $BotFolder) {
    Write-ErrorExit "Bot folder not found: $BotFolder"
}

Set-Location -Path $BotFolder
Write-Host "Working directory: $BotFolder"

$gitStatus = git rev-parse --is-inside-work-tree 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Initializing new git repository...'
    git init | Out-Null
} else {
    Write-Host 'Git repository detected.'
}

$remoteUrl = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Adding remote origin: $RepoUrl"
    git remote add origin $RepoUrl
} elseif ($remoteUrl -ne $RepoUrl) {
    Write-Host "Updating origin remote URL to: $RepoUrl"
    git remote set-url origin $RepoUrl
} else {
    Write-Host "Remote origin already set to $RepoUrl"
}

Write-Host 'Staging all files...'
git add .
if ($LASTEXITCODE -ne 0) {
    Write-ErrorExit 'Failed to stage files.'
}

Write-Host "Committing changes: $CommitMessage"
git commit -m "$CommitMessage"
if ($LASTEXITCODE -ne 0) {
    Write-Host 'No changes to commit or commit failed. Continuing to push if repository already has history.'
}

Write-Host "Pushing current branch to origin/$Branch..."
git push -u origin HEAD:$Branch
if ($LASTEXITCODE -ne 0) {
    $fallbackBranch = "upload-$(Get-Date -Format 'yyyyMMddHHmmss')"
    Write-Host "Initial push failed. Trying fallback branch origin/$fallbackBranch..."
    git push -u origin HEAD:$fallbackBranch
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorExit 'Git push failed. Check authentication, remote URL, and repository rules.'
    }
    Write-Host "Upload complete! Pushed to fallback branch: $fallbackBranch" -ForegroundColor Green
    exit 0
}

Write-Host 'Upload complete! Pushed to origin/$Branch' -ForegroundColor Green
