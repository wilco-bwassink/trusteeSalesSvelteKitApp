# Standalone regression checks; no Pester or real PM2 process is required.
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$testRoot = Join-Path $projectRoot ('storage\rebuild-test-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot -Force | Out-Null

function node {
    $global:trusteeDeployTestState.Events.Add('build-tool')
    if ($args[0] -like '*vite.js') {
        if ($global:trusteeDeployTestState.Mode -eq 'build-failure') {
            $global:LASTEXITCODE = 1
            return
        }
        New-Item -ItemType Directory -Path (Join-Path (Get-Location) 'build') | Out-Null
        Set-Content -LiteralPath (Join-Path (Get-Location) 'build/index.js') -Value 'new-build'
    }
    $global:LASTEXITCODE = 0
}

function pm2 {
    $action = $args[0]
    $global:trusteeDeployTestState.Events.Add("pm2-$action")
    if ($action -eq 'restart') {
        $global:trusteeDeployTestState.Restarts++
        if ($global:trusteeDeployTestState.Mode -eq 'restart-failure' -and $global:trusteeDeployTestState.Restarts -eq 1) {
            $global:LASTEXITCODE = 1
            return
        }
    }
    $global:LASTEXITCODE = 0
}

function Invoke-WebRequest {
    param($Uri, [switch]$UseBasicParsing, $TimeoutSec)
    if ($global:trusteeDeployTestState.Mode -eq 'health-failure' -and $global:trusteeDeployTestState.Restarts -eq 1) {
        throw 'Simulated unhealthy candidate.'
    }
    return @{ StatusCode = 200; Content = '[1,2,3,4,5,6,7,8,9,10,11,12]' }
}

function Start-Sleep { param($Seconds) }

try {
    foreach ($mode in @('build-failure', 'restart-failure', 'health-failure', 'success', 'build-only')) {
        $fixture = Join-Path $testRoot $mode
        New-Item -ItemType Directory -Path $fixture | Out-Null
        foreach ($directory in @('src', 'static', 'build')) {
            New-Item -ItemType Directory -Path (Join-Path $fixture $directory) | Out-Null
        }
        foreach ($file in @('package.json', 'svelte.config.js', 'vite.config.ts', 'tsconfig.json')) {
            Set-Content -LiteralPath (Join-Path $fixture $file) -Value '{}'
        }
        Set-Content -LiteralPath (Join-Path $fixture 'build/index.js') -Value 'old-build'
        Copy-Item -LiteralPath (Join-Path $projectRoot 'rebuild.ps1') -Destination $fixture
        $global:trusteeDeployTestState = @{
            Mode = $mode
            Restarts = 0
            Events = [Collections.Generic.List[string]]::new()
        }
        $failed = $false
        try {
            & (Join-Path $fixture 'rebuild.ps1') -BuildOnly:($mode -eq 'build-only')
        } catch {
            $failed = $true
        }
        $shouldFail = $mode -in @('build-failure', 'restart-failure', 'health-failure')
        if ($failed -ne $shouldFail) { throw "Unexpected deployment result: $mode" }
        $expected = if ($mode -eq 'success') { 'new-build' } else { 'old-build' }
        if ((Get-Content -LiteralPath (Join-Path $fixture 'build/index.js')).Trim() -ne $expected) {
            throw "Wrong active build after $mode"
        }
        if ($mode -in @('build-failure', 'build-only') -and
            ($global:trusteeDeployTestState.Events -match '^pm2-').Count -gt 0) {
            throw "PM2 was touched during $mode"
        }
        if ($mode -in @('restart-failure', 'health-failure') -and $global:trusteeDeployTestState.Restarts -ne 2) {
            throw "Rollback was not restarted during $mode"
        }
        if (Test-Path -LiteralPath (Join-Path $fixture '.deploy.lock')) {
            throw "Deployment lock was not released during $mode"
        }
        Write-Host "PASS: $mode"
    }
} finally {
    # Validate the absolute target before recursive cleanup, using PowerShell only.
    $resolvedTestRoot = [IO.Path]::GetFullPath($testRoot)
    $expectedParent = [IO.Path]::GetFullPath((Join-Path $projectRoot 'storage')) + [IO.Path]::DirectorySeparatorChar
    if (-not $resolvedTestRoot.StartsWith($expectedParent, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Refusing to clean up a directory outside the test storage directory.'
    }
    Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force
    Remove-Variable trusteeDeployTestState -Scope Global -ErrorAction SilentlyContinue
}
