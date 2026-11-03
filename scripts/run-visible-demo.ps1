param([switch]$Preflight, [switch]$DatabaseSmokeTest, [switch]$BackendSmokeTest, [switch]$GuardFunctionsOnly)

$ErrorActionPreference = 'Stop'
$parent = 'C:\Users\diego\AppData\Local\Temp\opencode'
$ports = @(55434, 3201, 3200)

function Assert-FreePort([int]$Port) {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    $listener.ExclusiveAddressUse = $true
    try {
        $listener.Start()
    } catch {
        throw "Loopback port unavailable: $Port"
    } finally {
        $listener.Stop()
    }
}

function Assert-PostmasterIdentity([string[]]$Identity, [string]$Data, [int]$Port) {
    $pidValue = 0
    if ($Identity.Count -lt 6 -or -not [int]::TryParse($Identity[0], [ref]$pidValue) -or $pidValue -le 0 -or
        [System.IO.Path]::GetFullPath($Identity[1]).TrimEnd('\') -ine [System.IO.Path]::GetFullPath($Data).TrimEnd('\') -or
        $Identity[3] -ne "$Port" -or $Identity[5] -ne '127.0.0.1') {
        throw 'Disposable PostgreSQL identity mismatch'
    }
}

function Assert-OwnedListener([int]$PostmasterPid, [int]$Port) {
    if ($PostmasterPid -le 0 -or $Port -le 0 -or $Port -gt 65535) { throw 'Invalid listener identity' }
    $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop)
    if ($listeners.Count -ne 1 -or $listeners[0].LocalAddress -cne '127.0.0.1' -or
        $listeners[0].LocalPort -ne $Port -or $listeners[0].State -ne 'Listen' -or
        $listeners[0].OwningProcess -ne $PostmasterPid) { throw 'PostgreSQL listener ownership mismatch' }
}

function Invoke-VerifiedDatabaseAction([int]$PostmasterPid, [int]$Port, [scriptblock]$Action) {
    Assert-OwnedListener $PostmasterPid $Port
    & $Action
}

function Invoke-VerifiedClusterAction([int]$PostmasterPid, [int]$Port, [scriptblock]$Verify, [scriptblock]$Action) {
    if ($PostmasterPid -le 0) { throw 'Missing verified postmaster PID' }
    $verified = @(& $Verify)
    if ($verified.Count -ne 1 -or $verified[0] -isnot [int] -or $verified[0] -ne $PostmasterPid) {
        throw 'Postmaster identity changed before database action'
    }
    Invoke-VerifiedDatabaseAction $PostmasterPid $Port $Action
}

function Assert-SmokeQueryResult([object[]]$Result) {
    if ($Result.Count -ne 1 -or "$($Result[0])" -cne '1') { throw 'Unexpected smoke query result' }
}

function Invoke-SmokeQueryCheck([scriptblock]$Query) {
    $result = @(& $Query)
    Assert-SmokeQueryResult $result
}

function New-SmokeDatabaseName { return 'dms_demo_' + [guid]::NewGuid().ToString('N') }

function Invoke-SmokeMigrationSequence([int]$PostmasterPid, [int]$Port, [scriptblock]$Verify,
    [scriptblock]$Create, [scriptblock]$Migrate) {
    Invoke-VerifiedClusterAction $PostmasterPid $Port $Verify $Create
    Invoke-VerifiedClusterAction $PostmasterPid $Port $Verify $Migrate
}

function New-SmokeMigrationStartInfo([string]$Node, [string]$Cli, [string]$Schema, [string]$Root,
    [string]$User, [string]$Password, [int]$Port, [string]$Database) {
    if ($User -cnotmatch '^demo_[a-f0-9]{32}$' -or $Password -cnotmatch '^[a-f0-9]{64}$' -or
        $Database -cnotmatch '^dms_demo_[a-f0-9]{32}$' -or $Port -lt 1 -or $Port -gt 65535) { throw 'Invalid migration target' }
    foreach ($path in @($Node, $Cli, $Schema, $Root)) {
        if ($path -notmatch '^[A-Za-z]:\\' -or $path.Contains('"')) { throw 'Invalid migration path' }
    }
    if ([IO.Path]::GetFullPath($Schema) -ine (Join-Path ([IO.Path]::GetFullPath($Root)) 'prisma\schema.prisma')) { throw 'Migration schema must be isolated' }
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $Node
    $info.Arguments = '"' + $Cli + '" migrate deploy --schema "' + $Schema + '"'
    $info.WorkingDirectory = $Root
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.EnvironmentVariables.Clear()
    foreach ($name in @('SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT')) {
        $value = [Environment]::GetEnvironmentVariable($name)
        if ($value) { $info.EnvironmentVariables[$name] = $value }
    }
    $info.EnvironmentVariables['TEMP'] = $Root
    $info.EnvironmentVariables['TMP'] = $Root
    $info.EnvironmentVariables['DATABASE_URL'] = "postgresql://${User}:${Password}@127.0.0.1:$Port/$Database"
    $info.EnvironmentVariables['PRISMA_HIDE_UPDATE_MESSAGE'] = '1'
    return $info
}

function Invoke-SmokeMigration($StartInfo) {
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $StartInfo
    try {
        if (-not $process.Start()) { throw 'Migration could not start' }
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit(120000)) { $process.Kill(); $process.WaitForExit(); throw 'Migration timed out' }
        if ($process.ExitCode -ne 0) { throw 'Migration failed' }
    } finally { $process.Dispose() }
}

function New-SmokeSeedStartInfo($MigrationInfo, [string]$TsNode, [string]$Entry, [string]$Project, [string]$AdminPassword) {
    foreach ($path in @($TsNode, $Entry, $Project)) {
        if ($path -notmatch '^[A-Za-z]:\\' -or $path.Contains('"')) { throw 'Invalid seed path' }
    }
    if ($AdminPassword -cnotmatch '^[a-f0-9]{64}$') { throw 'Invalid seed credential' }
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $MigrationInfo.FileName
    $info.Arguments = '"' + $TsNode + '" --project "' + $Project + '" "' + $Entry + '"'
    $info.WorkingDirectory = $MigrationInfo.WorkingDirectory
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.EnvironmentVariables.Clear()
    foreach ($name in @('SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'DATABASE_URL')) {
        if ($MigrationInfo.EnvironmentVariables.ContainsKey($name)) { $info.EnvironmentVariables[$name] = $MigrationInfo.EnvironmentVariables[$name] }
    }
    $info.EnvironmentVariables['DEMO_MODE'] = '1'
    $info.EnvironmentVariables['DEMO_OWNED_MARKER'] = 'visible-demo-smoke-v1'
    $info.EnvironmentVariables['DEMO_OWNED_TARGET'] = $info.EnvironmentVariables['DATABASE_URL']
    $info.EnvironmentVariables['DEMO_ADMIN_PASSWORD'] = $AdminPassword
    return $info
}

function Get-StartupFailureDiagnostic([string]$Root, [string]$Data) {
    return "Startup or shutdown failed. Retained root: $Root; data directory: $Data. PostgreSQL may still be running. Manually verify the process identity and data directory before recovery; do not kill an unverified process or remove its data."
}

function Get-SmokeFailureDiagnostic([string]$Stage) {
    $allowed = @('initdb.exe', 'pg_ctl.exe start', 'psql.exe', 'createdb.exe', 'prisma migrate deploy', 'demo seed', 'backend smoke', 'backend stop', 'pg_ctl.exe stop', 'credential cleanup', 'setup', 'ownership verification')
    if ($Stage -cnotin $allowed) { $Stage = 'setup' }
    return "Database smoke test failed at $Stage; tool output withheld to protect credentials."
}

function New-PasswordFileSecurity([Security.Principal.SecurityIdentifier]$Sid) {
    if (-not $Sid) { throw 'Missing current user identity' }
    $security = New-Object Security.AccessControl.FileSecurity
    $security.SetOwner($Sid)
    $security.SetAccessRuleProtection($true, $false)
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($Sid, 'FullControl', 'Allow')
    $security.AddAccessRule($rule)
    return $security
}

function Assert-PasswordFileSecurity([Security.AccessControl.FileSecurity]$Security, [Security.Principal.SecurityIdentifier]$Sid) {
    if (-not $Security -or -not $Sid -or -not $Security.AreAccessRulesProtected -or
        -not $Security.GetOwner([Security.Principal.SecurityIdentifier]).Equals($Sid)) { throw 'Unsafe credential security' }
    $rules = @($Security.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
    if ($rules.Count -ne 1 -or $rules[0].IsInherited -or -not $rules[0].IdentityReference.Equals($Sid) -or
        $rules[0].AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or
        $rules[0].FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl) { throw 'Unsafe credential access rules' }
}

function New-ProtectedPasswordFile([string]$Path, [Security.Principal.SecurityIdentifier]$Sid) {
    $security = New-PasswordFileSecurity $Sid
    Assert-PasswordFileSecurity $security $Sid
    return [IO.FileStream]::new($Path, [IO.FileMode]::CreateNew, [Security.AccessControl.FileSystemRights]::FullControl,
        [IO.FileShare]::None, 4096, [IO.FileOptions]::None, [Security.AccessControl.FileSecurity]$security)
}

function Invoke-PasswordFileBootstrap([scriptblock]$Create, [scriptblock]$Initialize, [scriptblock]$Cleanup) {
    & $Create
    try { & $Initialize } finally { & $Cleanup }
}

function Invoke-VerifiedPostmasterStop([int]$PostmasterPid, [scriptblock]$Verify, [scriptblock]$Stop) {
    if ($PostmasterPid -le 0) { throw 'Missing verified postmaster PID' }
    $verified = @(& $Verify)
    if ($verified.Count -ne 1 -or $verified[0] -isnot [int] -or $verified[0] -ne $PostmasterPid) {
        throw 'Postmaster identity changed before stop'
    }
    & $Stop
}

function Assert-NoReparseAncestors([string]$Path) {
    $current = [IO.Path]::GetFullPath($Path)
    while ($current) {
        $item = Get-Item -LiteralPath $current -Force -ErrorAction Stop
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Ownership path contains a reparse point' }
        $next = [IO.Path]::GetDirectoryName($current)
        if (-not $next -or $next -eq $current) { break }
        $current = $next
    }
}

function Copy-IsolatedPrismaInputs([string]$Source, [string]$Root) {
    Assert-NoReparseAncestors $Source
    Assert-NoReparseAncestors $Root
    $destination = Join-Path $Root 'prisma'
    if (Test-Path -LiteralPath $destination) { throw 'Prisma destination already exists' }
    $schema = Join-Path $Source 'schema.prisma'
    $migrations = Join-Path $Source 'migrations'
    foreach ($entry in @(@($schema, $false), @($migrations, $true))) {
        $item = Get-Item -LiteralPath $entry[0] -Force -ErrorAction Stop
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or $item.PSIsContainer -ne $entry[1]) { throw 'Unsafe Prisma source entry' }
    }
    [void](New-Item -ItemType Directory -Path $destination -ErrorAction Stop)
    Copy-Item -LiteralPath $schema -Destination (Join-Path $destination 'schema.prisma') -ErrorAction Stop
    $targetMigrations = Join-Path $destination 'migrations'
    [void](New-Item -ItemType Directory -Path $targetMigrations -ErrorAction Stop)
    foreach ($entry in @(Get-ChildItem -LiteralPath $migrations -Force -ErrorAction Stop)) {
        if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Unsafe migration entry' }
        if (-not $entry.PSIsContainer -and $entry.Name -ceq 'migration_lock.toml') {
            Copy-Item -LiteralPath $entry.FullName -Destination (Join-Path $targetMigrations $entry.Name) -ErrorAction Stop
        } elseif ($entry.PSIsContainer -and $entry.Name -cmatch '^[0-9]{14}_[a-zA-Z0-9_]+$') {
            $children = @(Get-ChildItem -LiteralPath $entry.FullName -Force -ErrorAction Stop)
            if ($children.Count -ne 1 -or $children[0].Name -cne 'migration.sql' -or $children[0].PSIsContainer -or
                ($children[0].Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Unexpected migration contents' }
            $target = Join-Path $targetMigrations $entry.Name
            [void](New-Item -ItemType Directory -Path $target -ErrorAction Stop)
            Copy-Item -LiteralPath $children[0].FullName -Destination (Join-Path $target 'migration.sql') -ErrorAction Stop
        } else { throw 'Unexpected migration path' }
    }
    return (Join-Path $destination 'schema.prisma')
}

function New-BackendLaunchPlan([string]$Root, [string]$Node, [string]$Entry, [int]$DatabasePort,
    [int]$BackendPort, [int]$FrontendPort, [string]$Password, [string]$Jwt, [string]$DatabaseUser = 'demo') {
    foreach ($path in @($Root, $Node, $Entry)) {
        if ($path -notmatch '^[A-Za-z]:\\' -or $path.Contains('"')) { throw 'Invalid backend launch path' }
    }
    foreach ($port in @($DatabasePort, $BackendPort, $FrontendPort)) {
        if ($port -lt 1 -or $port -gt 65535) { throw 'Invalid backend launch port' }
    }
    if (@($DatabasePort, $BackendPort, $FrontendPort | Select-Object -Unique).Count -ne 3 -or
        $Password -cnotmatch '^[a-f0-9]{64}$' -or $Jwt -cnotmatch '^[a-f0-9]{64}$' -or
        $DatabaseUser -cnotmatch '^demo(?:_[a-f0-9]{32})?$') { throw 'Invalid backend launch configuration' }
    $cwd = Join-Path $Root 'backend'
    $environment = @{
        DEMO_MODE = '1'; DEMO_FRONTEND_ORIGIN = "http://127.0.0.1:$FrontendPort"
        DATABASE_URL = "postgresql://${DatabaseUser}:${Password}@127.0.0.1:$DatabasePort/postgres"
        JWT_SECRET = $Jwt; PORT = "$BackendPort"; TEMP = $cwd; TMP = $cwd
    }
    return [pscustomobject]@{ WorkingDirectory = $cwd; Executable = $Node; Entry = $Entry; Environment = $environment }
}

function New-BackendProcessStartInfo($Plan) {
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $Plan.Executable
    $info.Arguments = '"' + $Plan.Entry + '"'
    $info.WorkingDirectory = $Plan.WorkingDirectory
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.EnvironmentVariables.Clear()
    foreach ($name in $Plan.Environment.Keys) { $info.EnvironmentVariables[$name] = $Plan.Environment[$name] }
    return $info
}

function Invoke-BackendPreparation([int]$PostmasterPid, [int]$DatabasePort, [scriptblock]$Verify,
    [scriptblock]$Migrate, [scriptblock]$Seed) {
    $result = @(Invoke-VerifiedClusterAction $PostmasterPid $DatabasePort $Verify $Migrate)
    if ($result.Count -ne 1 -or $result[0] -isnot [bool] -or -not $result[0]) {
        throw 'Migration did not report success'
    }
    Invoke-VerifiedClusterAction $PostmasterPid $DatabasePort $Verify $Seed
}

function Assert-BackendOwnership([int]$ProcessId, [int]$Port, [scriptblock]$VerifyProcess) {
    $verified = @(& $VerifyProcess)
    if ($ProcessId -le 0 -or $verified.Count -ne 1 -or $verified[0] -isnot [int] -or $verified[0] -ne $ProcessId) {
        throw 'Backend process identity mismatch'
    }
    Assert-OwnedListener $ProcessId $Port
}

function Invoke-BackendSmokeSequence([scriptblock]$Prepare, [scriptblock]$Start, [scriptblock]$Health, [scriptblock]$Stop) {
    & $Prepare
    try {
        & $Start
        & $Health
    } finally {
        & $Stop
    }
}

if ($GuardFunctionsOnly) { return }
if (@($Preflight, $DatabaseSmokeTest, $BackendSmokeTest | Where-Object { $_ }).Count -gt 1) { throw 'Choose only one mode' }

function Invoke-DatabaseSmokeTest([switch]$BackendMode) {
    $pgBin = 'C:\Program Files\PostgreSQL\18\bin'
    $port = 55434
    if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw 'Approved temporary parent is absent' }
    Assert-NoReparseAncestors $parent
    foreach ($exe in @('initdb.exe', 'postgres.exe', 'pg_ctl.exe', 'psql.exe', 'createdb.exe')) {
        if (-not (Test-Path -LiteralPath (Join-Path $pgBin $exe) -PathType Leaf)) { throw "Missing PostgreSQL executable: $exe" }
    }
    Assert-FreePort $port
    if ($BackendMode) { Assert-FreePort 3201; Assert-FreePort 3200 }
    $id = [guid]::NewGuid().ToString('N')
    $database = New-SmokeDatabaseName
    $backend = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\dms-backend'))
    $prismaSource = Join-Path $backend 'prisma'
    $cli = Join-Path $backend 'node_modules\prisma\build\index.js'
    $tsNode = Join-Path $backend 'node_modules\ts-node\dist\bin.js'
    $seedEntry = Join-Path $backend 'prisma\seed-demo-entry.ts'
    $tsProject = Join-Path $backend 'tsconfig.json'
    $backendEntry = Join-Path $backend 'src\main.ts'
    $node = (Get-Command node.exe -CommandType Application -ErrorAction Stop).Source
    foreach ($path in @($cli, $node, $tsNode, $seedEntry, $tsProject)) { if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw 'Missing migration or seed prerequisite' } }
    if ($BackendMode -and -not (Test-Path -LiteralPath $backendEntry -PathType Leaf)) { throw 'Missing backend prerequisite' }
    $root = Join-Path $parent "visible-demo-$id"
    $data = Join-Path $root 'pgdata'
    $user = 'demo_' + [guid]::NewGuid().ToString('N')
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $password = ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $adminPassword = ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $jwt = ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
    $created = $false
    $started = $false
    $startAttempted = $false
    $verifiedPid = 0
    $failure = $null
    $stage = 'setup'
    $failureStage = 'setup'
    $cleanupState = @{ Failed = $false }
    $migrationStage = @{ Value = 'createdb.exe' }
    try {
        # Crear únicamente una raíz nueva; nunca reutilizar una ruta existente.
        if (Test-Path -LiteralPath $root) { throw 'Generated runtime root already exists' }
        [void](New-Item -ItemType Directory -Path $root -ErrorAction Stop)
        $created = $true
        Assert-NoReparseAncestors $root
        $schema = Copy-IsolatedPrismaInputs $prismaSource $root
        function Invoke-Pg([string]$Exe, [string[]]$Arguments, [string]$InputText = '', [switch]$CaptureOutput) {
            $info = New-Object System.Diagnostics.ProcessStartInfo
            $info.FileName = Join-Path $pgBin $Exe
            $info.WorkingDirectory = $root
            $info.UseShellExecute = $false
            $info.CreateNoWindow = $true
            $info.RedirectStandardInput = $true
            $info.RedirectStandardOutput = $true
            $info.RedirectStandardError = $true
            $info.EnvironmentVariables.Clear()
            foreach ($name in @('SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT')) {
                $value = [Environment]::GetEnvironmentVariable($name)
                if ($value) { $info.EnvironmentVariables[$name] = $value }
            }
            $info.EnvironmentVariables['TEMP'] = $root
            $info.EnvironmentVariables['TMP'] = $root
            $info.EnvironmentVariables['PGPASSWORD'] = $password
            $info.Arguments = ($Arguments | ForEach-Object { '"' + $_.Replace('"', '\"') + '"' }) -join ' '
            $process = New-Object System.Diagnostics.Process
            $process.StartInfo = $info
            try {
                if (-not $process.Start()) { throw "Could not start $Exe" }
                $stdout = $process.StandardOutput.ReadToEndAsync()
                $stderr = $process.StandardError.ReadToEndAsync()
                if ($InputText) { $process.StandardInput.Write($InputText) }
                $process.StandardInput.Close()
                if (-not $process.WaitForExit(120000)) { $process.Kill(); $process.WaitForExit(); throw "$Exe timed out" }
                if ($process.ExitCode -ne 0) { throw "$Exe failed with exit code $($process.ExitCode)" }
                if ($CaptureOutput) { return $stdout.Result.TrimEnd("`r", "`n") }
            } finally { $process.Dispose() }
        }
        function Assert-OwnedPostmaster {
            Assert-NoReparseAncestors $data
            $pidFile = Join-Path $data 'postmaster.pid'
            $item = Get-Item -LiteralPath $pidFile -Force
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'PID file is a reparse point' }
            $identity = [IO.File]::ReadAllLines($pidFile)
            Assert-PostmasterIdentity $identity $data $port
            $process = Get-Process -Id ([int]$identity[0]) -ErrorAction Stop
            if ($process.Path -ine (Join-Path $pgBin 'postgres.exe')) { throw 'Postmaster executable mismatch' }
            $actualStart = [DateTimeOffset]$process.StartTime.ToUniversalTime()
            $declaredStart = 0L
            if (-not [long]::TryParse($identity[2], [ref]$declaredStart) -or
                [Math]::Abs($actualStart.ToUnixTimeSeconds() - $declaredStart) -gt 5) { throw 'Postmaster start time mismatch' }
            return [int]$identity[0]
        }
        $passwordFile = Join-Path $root ('initdb-password-' + [guid]::NewGuid().ToString('N'))
        $passwordSid = [Security.Principal.WindowsIdentity]::GetCurrent().User
        $stage = 'initdb.exe'
        Invoke-PasswordFileBootstrap {
            $script:passwordStream = New-ProtectedPasswordFile $passwordFile $passwordSid
        } {
            try {
                Assert-PasswordFileSecurity $script:passwordStream.GetAccessControl() $passwordSid
                $content = [Text.Encoding]::ASCII.GetBytes($password + "`n")
                $script:passwordStream.Write($content, 0, $content.Length)
            } finally { $script:passwordStream.Dispose(); $script:passwordStream = $null }
            Invoke-Pg 'initdb.exe' @('-D', $data, '-U', $user, '--auth=scram-sha-256', '--pwfile', $passwordFile, '--encoding=UTF8', '--locale=C')
        } {
            $cleanupState.Failed = $true
            Assert-NoReparseAncestors $root
            $item = Get-Item -LiteralPath $passwordFile -Force -ErrorAction Stop
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Credential file is a reparse point' }
            [IO.File]::Delete($passwordFile)
            $cleanupState.Failed = $false
        }
        if (Test-Path -LiteralPath (Join-Path $data 'postmaster.pid')) { throw 'Unexpected postmaster before startup' }
        Assert-FreePort $port
        $startAttempted = $true
        $stage = 'pg_ctl.exe start'
        Invoke-Pg 'pg_ctl.exe' @('-D', $data, '-l', (Join-Path $root 'postgres.log'), '-o', "-h 127.0.0.1 -p $port", '-t', '30', '-w', 'start')
        $stage = 'ownership verification'
        $verifiedPid = Assert-OwnedPostmaster
        $started = $true
        $stage = 'psql.exe'
        Invoke-VerifiedClusterAction $verifiedPid $port { Assert-OwnedPostmaster } {
            Invoke-SmokeQueryCheck {
                Invoke-Pg 'psql.exe' @('-X', '-w', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-h', '127.0.0.1', '-p', "$port", '-U', $user, '-d', 'postgres', '-c', 'SELECT 1') -CaptureOutput
            }
        }
        if ((Assert-OwnedPostmaster) -ne $verifiedPid) { throw 'Postmaster identity changed after query' }
        $migrationInfo = New-SmokeMigrationStartInfo $node $cli $schema $root $user $password $port $database
        $seedInfo = New-SmokeSeedStartInfo $migrationInfo $tsNode $seedEntry $tsProject $adminPassword
        $stage = 'createdb.exe'
        Invoke-SmokeMigrationSequence $verifiedPid $port { Assert-OwnedPostmaster } {
            Invoke-Pg 'createdb.exe' @('-w', '-h', '127.0.0.1', '-p', "$port", '-U', $user, '--maintenance-db=postgres', '-T', 'template0', $database)
        } {
            $migrationStage.Value = 'prisma migrate deploy'
            Invoke-SmokeMigration $migrationInfo
        }
        $stage = 'demo seed'
        Invoke-VerifiedClusterAction $verifiedPid $port { Assert-OwnedPostmaster } { Invoke-SmokeMigration $seedInfo }
        Write-Output 'Disposable PostgreSQL database created, migrated, and seeded with fictional data.'
        if ($BackendMode) {
            $stage = 'backend smoke'
            $plan = New-BackendLaunchPlan $root $node $tsNode $port 3201 3200 $password $jwt $user
            $plan.Environment['DATABASE_URL'] = $migrationInfo.EnvironmentVariables['DATABASE_URL']
            foreach ($name in @('SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT')) {
                $value = [Environment]::GetEnvironmentVariable($name)
                if ($value) { $plan.Environment[$name] = $value }
            }
            if (Test-Path -LiteralPath $plan.WorkingDirectory) { throw 'Backend directory already exists' }
            [void](New-Item -ItemType Directory -Path $plan.WorkingDirectory -ErrorAction Stop)
            Assert-NoReparseAncestors $plan.WorkingDirectory
            $info = New-BackendProcessStartInfo $plan
            $info.Arguments += ' --project "' + $tsProject + '" "' + $backendEntry + '"'
            $info.RedirectStandardOutput = $true
            $info.RedirectStandardError = $true
            $child = New-Object System.Diagnostics.Process
            $child.StartInfo = $info
            $childState = @{ Started = $false; Pid = 0; Start = $null }
            try {
                Assert-FreePort 3201
                Invoke-VerifiedClusterAction $verifiedPid $port { Assert-OwnedPostmaster } {
                    if (-not $child.Start()) { throw 'Backend could not start' }
                    $childState.Started = $true
                    $childState.Pid = $child.Id
                    $childState.Start = $child.StartTime.ToUniversalTime()
                    $stdout = $child.StandardOutput.ReadToEndAsync()
                    $stderr = $child.StandardError.ReadToEndAsync()
                }
                $deadline = [DateTime]::UtcNow.AddSeconds(90)
                $ready = $false
                while ([DateTime]::UtcNow -lt $deadline) {
                    if ($child.HasExited) { throw 'Backend exited before readiness' }
                    try {
                        Assert-BackendOwnership $childState.Pid 3201 {
                            $p = Get-Process -Id $childState.Pid -ErrorAction Stop
                            if ($p.Path -ine $node -or $p.StartTime.ToUniversalTime() -ne $childState.Start) { throw 'Backend identity changed' }
                            [int]$p.Id
                        }
                        $request = [Net.HttpWebRequest]::Create('http://127.0.0.1:3201/api')
                        $request.Proxy = $null
                        $request.AllowAutoRedirect = $false
                        $request.Timeout = 2000
                        $response = $request.GetResponse()
                        try { if ([int]$response.StatusCode -eq 200) { $ready = $true } } finally { $response.Dispose() }
                        if ($ready) { break }
                    } catch { Start-Sleep -Milliseconds 500 }
                }
                if (-not $ready) { throw 'Backend readiness timed out' }
                Write-Output 'Owned backend passed HTTP readiness.'
            } finally {
                if ($childState.Started -and -not $child.HasExited) {
                    $stage = 'backend stop'
                    $p = Get-Process -Id $childState.Pid -ErrorAction Stop
                    if ($p.Path -ine $node -or $p.StartTime.ToUniversalTime() -ne $childState.Start) { throw 'Backend identity changed before stop' }
                    $child.Kill()
                    if (-not $child.WaitForExit(30000)) { throw 'Backend stop timed out' }
                }
                $child.Dispose()
            }
        }
    } catch { $failure = $_; $failureStage = if ($cleanupState.Failed) { 'credential cleanup' } elseif ($stage -eq 'createdb.exe') { $migrationStage.Value } else { $stage } } finally {
        if ($created -and $startAttempted -and (Test-Path -LiteralPath (Join-Path $data 'postmaster.pid'))) {
            try {
                $stage = 'pg_ctl.exe stop'
                Invoke-VerifiedPostmasterStop $verifiedPid { Assert-OwnedPostmaster } {
                    Invoke-Pg 'pg_ctl.exe' @('-D', $data, '-m', 'fast', '-t', '30', '-w', 'stop')
                }
                if (Test-Path -LiteralPath (Join-Path $data 'postmaster.pid')) { throw 'Postmaster PID file remains after stop' }
                Assert-FreePort $port
                Write-Output 'Owned PostgreSQL stopped; disposable data retained for manual inspection.'
            } catch { $failure = $_; $failureStage = $stage }
        } elseif ($started) { $failure = 'Owned PostgreSQL identity disappeared before shutdown; cleanup refused.'; $failureStage = 'ownership verification' }
        if ($created -and $startAttempted -and $failure) { Write-Output (Get-StartupFailureDiagnostic $root $data) }
        elseif ($created) { Write-Output "Runtime directory retained: $root" }
    }
    if ($failure) { throw (Get-SmokeFailureDiagnostic $failureStage) }
}

if ($DatabaseSmokeTest -or $BackendSmokeTest) {
    Invoke-DatabaseSmokeTest -BackendMode:$BackendSmokeTest
    return
}
if (-not $Preflight) {
    Write-Output 'Full-app startup is blocked: process-wide filesystem and network containment and scheduled-task suppression are not established. No database or application was started.'
    exit 1
}

if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw 'Approved temporary parent is absent' }
foreach ($port in $ports) { Assert-FreePort $port }

# Verificar que un puerto ocupado se rechaza sin iniciar la aplicación.
$probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$probe.ExclusiveAddressUse = $true
try {
    $probe.Start()
    $occupiedPort = ([System.Net.IPEndPoint]$probe.LocalEndpoint).Port
    $rejected = $false
    try { Assert-FreePort $occupiedPort } catch { $rejected = $true }
    if (-not $rejected) { throw 'Occupied port guard failed' }
} finally {
    $probe.Stop()
}
Write-Output 'Isolation preflight passed: approved parent exists and loopback port guards passed. Full-app startup remains blocked.'
