param(
    [ValidateSet('start', 'vite')]
    [string]$Task = 'start',
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$TaskArguments
)

$ErrorActionPreference = 'Stop'
try {
    $taskNode = $env:npm_node_execpath
    if (-not $taskNode -or -not (Test-Path -LiteralPath $taskNode)) {
        $taskNode = (Get-Command node.exe -ErrorAction Stop).Source
    }
    # Repair PATH only for this launcher and its children, never system settings.
    $taskNodeDirectory = Split-Path -Parent $taskNode
    $env:Path = $taskNodeDirectory + ';' + (($env:Path -split ';' | ForEach-Object {
        $_.Trim().Trim('"')
    }) -join ';')
    Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)

    if (-not (Test-Path -LiteralPath 'node_modules/vite/bin/vite.js')) {
        throw 'Dependencies are missing. Run npm install first.'
    }
    if ($Task -eq 'vite') {
        & $taskNode 'node_modules/vite/bin/vite.js' @TaskArguments
    } else {
        Write-Host 'Pioneer simulator: http://127.0.0.1:3011/'
        Write-Host 'Keep this window open. Press Ctrl+C to stop.'
        $taskNpm = (Get-Command npm.cmd -ErrorAction Stop).Source
        & $taskNpm start @TaskArguments
    }
    exit $LASTEXITCODE
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
