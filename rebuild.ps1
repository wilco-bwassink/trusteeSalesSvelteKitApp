# Rebuild.ps1 - safely rebuild and restart PM2

# Delete old build and Sveltekit output
Write-Host "Cleaning Previous build..."
Remove-Item -Recurse -Force ".\build", ".\.sevlte-kit"

# Rebuild Project
Write-Host "Running Build"
pnpm build

# Restart PM2 App
Write-Host "Restarting PM2 App..."
pm2 restart index

Write-Host "Rebuild complete and PM2 restarted."