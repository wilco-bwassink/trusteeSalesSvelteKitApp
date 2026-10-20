param(
    [string]$AppName = 'trustee',
    [string]$HealthCheckUrl = 'http://127.0.0.1:3002/trustee/api/sales',
    [switch]$BuildOnly
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = [IO.Path]::GetFullPath($PSScriptRoot)

function Assert-WorkspacePath([string]$Target) {
    $resolved = [IO.Path]::GetFullPath($Target)
    if (-not $resolved.StartsWith($workspaceRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to change a path outside the application directory: $resolved"
    }
    return $resolved
}

function Invoke-Checked([string]$Program, [string[]]$Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Program failed with exit code $LASTEXITCODE."
    }
}

function Wait-ForSchedule {
    for ($attempt = 0; $attempt -lt 15; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $HealthCheckUrl -UseBasicParsing -TimeoutSec 2
            $schedule = ConvertFrom-Json $response.Content
            if ($response.StatusCode -eq 200 -and $schedule.Count -eq 12) { return }
        } catch {
            # Allow the restarted process time to bind its port.
        }
        Start-Sleep -Seconds 1
    }
    throw "The restarted app did not serve a valid schedule at $HealthCheckUrl."
}

$releaseId = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N')
$releaseRoot = Assert-WorkspacePath (Join-Path $workspaceRoot ".releases\$releaseId")
$sourceCopy = Assert-WorkspacePath (Join-Path $releaseRoot 'source')
$candidate = Assert-WorkspacePath (Join-Path $sourceCopy 'build')
$previous = Assert-WorkspacePath (Join-Path $releaseRoot 'previous')
$failed = Assert-WorkspacePath (Join-Path $releaseRoot 'failed')
$active = Assert-WorkspacePath (Join-Path $workspaceRoot 'build')
$lockPath = Assert-WorkspacePath (Join-Path $workspaceRoot '.deploy.lock')
$deployLock = $null
$stopped = $false
$promoted = $false
$backedUp = $false

Push-Location $workspaceRoot
try {
    $deployLock = [IO.File]::Open($lockPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    if (-not $BuildOnly -and -not (Test-Path -LiteralPath (Join-Path $active 'index.js'))) {
        throw 'No existing build was found. This script upgrades an already deployed PM2 application.'
    }
    New-Item -ItemType Directory -Path $sourceCopy -Force | Out-Null
    # Use the installed dependencies in the ancestor application directory.
    # Mutable data and server .env files are deliberately not copied into releases.
    foreach ($item in @('src', 'static', 'package.json', 'svelte.config.js', 'vite.config.ts', 'tsconfig.json')) {
        Copy-Item -LiteralPath (Join-Path $workspaceRoot $item) -Destination $sourceCopy -Recurse
    }

    Write-Host 'Checking and building a candidate. The active build is unchanged.'
    Push-Location $sourceCopy
    try {
        Invoke-Checked 'node' @((Join-Path $workspaceRoot 'node_modules/@sveltejs/kit/svelte-kit.js'), 'sync')
        Invoke-Checked 'node' @((Join-Path $workspaceRoot 'node_modules/svelte-check/bin/svelte-check'), '--tsconfig', './tsconfig.json')
        Invoke-Checked 'node' @((Join-Path $workspaceRoot 'node_modules/vite/bin/vite.js'), 'build')
    } finally {
        Pop-Location
    }
    if (-not (Test-Path -LiteralPath (Join-Path $candidate 'index.js'))) {
        throw 'The build did not produce a runnable candidate.'
    }
    if ($BuildOnly) {
        Write-Host "Candidate verified at $candidate. PM2 and the active build were not changed."
        return
    }

    # Stop only after a successful build, so lazy imports cannot cross releases.
    Invoke-Checked 'pm2' @('stop', $AppName)
    $stopped = $true
    Move-Item -LiteralPath $active -Destination $previous
    $backedUp = $true
    Move-Item -LiteralPath $candidate -Destination $active
    $promoted = $true
    Invoke-Checked 'pm2' @('restart', $AppName)
    Wait-ForSchedule
    $stopped = $false
    Write-Host "Deployment verified. Previous build retained at $previous"
} catch {
    $deploymentError = $_
    if ($stopped) {
        Write-Warning 'Deployment failed. Restoring the previous build.'
        Invoke-Checked 'pm2' @('stop', $AppName)
        if ($promoted) {
            Move-Item -LiteralPath $active -Destination $failed
        }
        if ($backedUp) {
            Move-Item -LiteralPath $previous -Destination $active
        }
        Invoke-Checked 'pm2' @('restart', $AppName)
        Wait-ForSchedule
        Write-Warning 'The previous build is running again.'
    }
    throw $deploymentError
} finally {
    if ($null -ne $deployLock) {
        $deployLock.Dispose()
        Remove-Item -LiteralPath $lockPath
    }
    Pop-Location
}
