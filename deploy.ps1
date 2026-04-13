# ============================================================
# deploy.ps1 — People Operations Platform
# Creates a branch, commits all changes, pushes, and opens
# the GitHub PR creation page automatically.
#
# Usage:
#   .\deploy.ps1 "feature/my-change" "what I changed"
#
# Example:
#   .\deploy.ps1 "feature/ai-disclaimer" "Add session disclaimer to AI chat"
# ============================================================

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$BranchName,

    [Parameter(Mandatory = $true, Position = 1)]
    [string]$CommitMessage
)

# ── Config ────────────────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"
$Repo = "people-ops-platform"         # change if your GitHub repo name differs
$BaseBranch = "master"

# Detect GitHub username from git remote (origin URL)
function Get-GitHubUsername {
    $remote = git remote get-url origin 2>$null
    if ($remote -match "github\.com[:/]([^/]+)/") {
        return $Matches[1]
    }
    return $null
}

# ── Helpers ───────────────────────────────────────────────────────────────────
function Write-Step($msg) {
    Write-Host ""
    Write-Host "  ▶ $msg" -ForegroundColor Cyan
}

function Write-OK($msg) {
    Write-Host "    ✓ $msg" -ForegroundColor Green
}

function Write-Fail($msg) {
    Write-Host "    ✗ $msg" -ForegroundColor Red
    exit 1
}

# ── Validate inputs ───────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "  People Ops Platform — Deploy Script" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Branch  : $BranchName" -ForegroundColor Yellow
Write-Host "  Message : $CommitMessage" -ForegroundColor Yellow
Write-Host "  Base    : $BaseBranch" -ForegroundColor Yellow
Write-Host ""

if ($BranchName -notmatch "^[a-zA-Z0-9/_-]+$") {
    Write-Fail "Branch name '$BranchName' contains invalid characters. Use letters, numbers, /, - or _ only."
}

if ($CommitMessage.Length -lt 5) {
    Write-Fail "Commit message is too short. Describe what you changed."
}

# ── Check we're in the right directory ────────────────────────────────────────
Write-Step "Checking repository..."
if (-not (Test-Path ".git")) {
    Write-Fail "No .git directory found. Run this script from the project root."
}
Write-OK "Git repository found."

# ── Ensure we start from master (up to date) ─────────────────────────────────
Write-Step "Syncing with origin/$BaseBranch..."
git checkout $BaseBranch 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Fail "Could not switch to $BaseBranch." }

git pull origin $BaseBranch 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Fail "Could not pull from origin/$BaseBranch." }
Write-OK "Up to date with origin/$BaseBranch."

# ── Create and switch to new branch ───────────────────────────────────────────
Write-Step "Creating branch '$BranchName'..."
$branchExists = git branch --list $BranchName
if ($branchExists) {
    Write-Host "    ⚠ Branch '$BranchName' already exists locally — switching to it." -ForegroundColor Yellow
    git checkout $BranchName 2>&1 | Out-Null
} else {
    git checkout -b $BranchName 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Fail "Failed to create branch '$BranchName'." }
    Write-OK "Branch '$BranchName' created."
}

# ── Stage all changes ─────────────────────────────────────────────────────────
Write-Step "Staging changes..."
git add . 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Fail "git add failed." }

# Show what's being committed
$staged = git diff --cached --name-only
if (-not $staged) {
    Write-Host "    ⚠ No changes to commit. Working tree is clean." -ForegroundColor Yellow
    git checkout $BaseBranch 2>&1 | Out-Null
    exit 0
}

Write-Host ""
Write-Host "    Files to be committed:" -ForegroundColor DarkGray
$staged | ForEach-Object { Write-Host "      + $_" -ForegroundColor DarkGray }
Write-Host ""

# ── Safety: warn if any .env file slipped through ────────────────────────────
$envFiles = $staged | Where-Object { $_ -match "\.env" -and $_ -notmatch "\.env\.example" }
if ($envFiles) {
    Write-Host ""
    Write-Host "  ⛔  BLOCKED — .env file detected in staged files:" -ForegroundColor Red
    $envFiles | ForEach-Object { Write-Host "       $_" -ForegroundColor Red }
    Write-Host "  These files contain secrets and must not be committed." -ForegroundColor Red
    Write-Host "  Check your .gitignore or unstage these files." -ForegroundColor Red
    Write-Host ""
    git checkout $BaseBranch 2>&1 | Out-Null
    exit 1
}

# ── Commit ────────────────────────────────────────────────────────────────────
Write-Step "Committing..."
git commit -m $CommitMessage 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Fail "git commit failed." }
Write-OK "Committed: '$CommitMessage'"

# ── Push branch to origin ─────────────────────────────────────────────────────
Write-Step "Pushing '$BranchName' to GitHub..."
git push origin $BranchName 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    # First push needs -u
    git push -u origin $BranchName 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Fail "git push failed. Check your GitHub credentials." }
}
Write-OK "Branch pushed to origin."

# ── Open PR creation page in browser ─────────────────────────────────────────
Write-Step "Opening GitHub PR page..."
$Username = Get-GitHubUsername
if ($Username) {
    $EncodedBranch  = [System.Uri]::EscapeDataString($BranchName)
    $EncodedMessage = [System.Uri]::EscapeDataString($CommitMessage)
    $PrUrl = "https://github.com/$Username/$Repo/compare/$BaseBranch...${EncodedBranch}?quick_pull=1&title=${EncodedMessage}"
    Start-Process $PrUrl
    Write-OK "PR page opened in your browser."
    Write-Host ""
    Write-Host "  ✅ Done! Fill in the PR description and click 'Create pull request'." -ForegroundColor Green
    Write-Host "     When merged → GitHub Actions will auto-deploy to Railway + Vercel." -ForegroundColor DarkGray
} else {
    Write-Host "    ⚠ Could not detect GitHub username from remote URL." -ForegroundColor Yellow
    Write-Host "    Open this URL manually to create the PR:" -ForegroundColor Yellow
    Write-Host "    https://github.com/YOUR_USERNAME/$Repo/compare/$BaseBranch...$BranchName" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
