$source = "D:\react-projects\agentic-skills\cli"
$destination = "D:\react-projects\open-agent-skills"

# Check if source exists
if (!(Test-Path $source)) {
    Write-Error "Source directory $source does not exist."
    exit 1
}

# Check if destination exists
if (!(Test-Path $destination)) {
    Write-Error "Destination directory $destination does not exist."
    exit 1
}

Write-Host "Syncing CLI data from $source to $destination..."

# Sync files excluding node_modules, .git, and dist
# /MIR mirrors a directory tree (equivalent to /E plus /PURGE).
# /XD excludes directories
robocopy $source $destination /MIR /XD node_modules .git dist /R:3 /W:5

Write-Host "Sync complete: CLI data mirrored to open-agent-skills"
