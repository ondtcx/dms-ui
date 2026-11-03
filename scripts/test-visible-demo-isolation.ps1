$ErrorActionPreference = 'Stop'
$runner = Join-Path $PSScriptRoot 'run-visible-demo.ps1'
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($runner, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -ne 0) { throw 'Runner could not be parsed' }
if (-not $ast.Extent.Text.Contains('[switch]$BackendSmokeTest')) { throw 'Backend smoke mode must be wired' }
if (-not $ast.Extent.Text.Contains('[switch]$FrontendSmokeTest')) { throw 'Frontend smoke mode must be wired' }
$psqlCalls = @($ast.FindAll({
    param($node)
    $node -is [System.Management.Automation.Language.CommandAst] -and
    $node.GetCommandName() -eq 'Invoke-Pg' -and
    $node.CommandElements.Count -ge 3 -and
    $node.CommandElements[1].Value -eq 'psql.exe'
}, $true))
if ($psqlCalls.Count -ne 1) { throw 'Expected exactly one psql invocation' }
$arguments = $psqlCalls[0].CommandElements[2]
if ($arguments -isnot [System.Management.Automation.Language.ArrayExpressionAst] -or
    @($arguments.FindAll({ param($node) $node -is [System.Management.Automation.Language.StringConstantExpressionAst] -and $node.Value -ceq '-X' }, $true)).Count -ne 1) {
    throw 'psql must disable startup files with -X'
}
$text = $psqlCalls[0].Extent.Text
foreach ($required in @('ON_ERROR_STOP=1', '-t', '-A')) {
    if (-not $text.Contains($required)) { throw "psql missing required argument: $required" }
}
$ancestor = $psqlCalls[0].Parent
$wrapped = $false
while ($ancestor) {
    if ($ancestor -is [System.Management.Automation.Language.CommandAst] -and $ancestor.GetCommandName() -eq 'Invoke-VerifiedClusterAction') { $wrapped = $true; break }
    $ancestor = $ancestor.Parent
}
if (-not $wrapped) { throw 'psql must run inside verified database action' }
. $runner -GuardFunctionsOnly
$isolatedSchema = Join-Path 'C:\owned\demo' 'prisma\schema.prisma'
$migrationInfo = New-SmokeMigrationStartInfo 'C:\node\node.exe' 'C:\backend\cli.js' $isolatedSchema 'C:\owned\demo' ('demo_' + ('a' * 32)) ('b' * 64) 55434 ('dms_demo_' + ('c' * 32))
if (-not $migrationInfo.Arguments.Contains($isolatedSchema)) { throw 'Migration must use isolated schema' }
$rejected = $false
try { [void](New-SmokeMigrationStartInfo 'C:\node\node.exe' 'C:\backend\cli.js' 'C:\backend\schema.prisma' 'C:\owned\demo' ('demo_' + ('a' * 32)) ('b' * 64) 55434 ('dms_demo_' + ('c' * 32))) } catch { $rejected = $true }
if (-not $rejected) { throw 'Source schema must be rejected' }
$copyFunction = @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Copy-IsolatedPrismaInputs' }, $true))
if ($copyFunction.Count -ne 1) { throw 'Missing isolated Prisma input copy' }
& {
    $script:copies = @(); $script:bad = ''
    function Assert-NoReparseAncestors { param($Path) }
    function Test-Path { param($LiteralPath) return $false }
    function New-Item { param($ItemType, $Path, $ErrorAction) }
    function Copy-Item { param($LiteralPath, $Destination, $ErrorAction) $script:copies += "$LiteralPath|$Destination" }
    function Get-Item {
        param($LiteralPath, [switch]$Force, $ErrorAction)
        $directory = $LiteralPath -like '*\migrations'
        $attributes = if ($script:bad -eq 'schema' -and -not $directory) { [IO.FileAttributes]::ReparsePoint } else { [IO.FileAttributes]::Normal }
        [pscustomobject]@{ PSIsContainer = $directory; Attributes = $attributes }
    }
    function Get-ChildItem {
        param($LiteralPath, [switch]$Force, $ErrorAction)
        if ($LiteralPath -like '*\migrations') {
            $name = if ($script:bad -eq 'unexpected') { 'unexpected' } else { '20261001000000_example' }
            $attributes = if ($script:bad -eq 'directory') { [IO.FileAttributes]::ReparsePoint } else { [IO.FileAttributes]::Directory }
            [pscustomobject]@{ Name = $name; FullName = "$LiteralPath\$name"; PSIsContainer = $true; Attributes = $attributes }
            [pscustomobject]@{ Name = 'migration_lock.toml'; FullName = "$LiteralPath\migration_lock.toml"; PSIsContainer = $false; Attributes = [IO.FileAttributes]::Normal }
        } else {
            $attributes = if ($script:bad -eq 'file') { [IO.FileAttributes]::ReparsePoint } else { [IO.FileAttributes]::Normal }
            [pscustomobject]@{ Name = 'migration.sql'; FullName = "$LiteralPath\migration.sql"; PSIsContainer = $false; Attributes = $attributes }
        }
    }
    $result = Copy-IsolatedPrismaInputs 'C:\source\prisma' 'C:\owned\demo'
    if ($result -cne 'C:\owned\demo\prisma\schema.prisma' -or $script:copies.Count -ne 3) { throw 'Expected isolated schema and migration copies' }
    foreach ($bad in @('schema', 'directory', 'file', 'unexpected')) {
        $script:bad = $bad; $rejected = $false
        try { Copy-IsolatedPrismaInputs 'C:\source\prisma' 'C:\owned\demo' } catch { $rejected = $true }
        if (-not $rejected) { throw "Unsafe input accepted: $bad" }
    }
}
& {
    $target = New-SmokeDatabaseName
    if ($target -cnotmatch '^dms_demo_[a-f0-9]{32}$' -or $target -ceq (New-SmokeDatabaseName)) { throw 'Invalid generated database name' }
    $script:steps = @()
    function Assert-OwnedListener { param($PostmasterPid, $Port) $script:steps += 'listener' }
    Invoke-SmokeMigrationSequence 1234 55434 { $script:steps += 'identity'; 1234 } { $script:steps += 'create' } { $script:steps += 'migrate' }
    if (($script:steps -join ',') -cne 'identity,listener,create,identity,listener,migrate') { throw 'Create/migrate verification order incorrect' }
    $script:steps = @()
    try { Invoke-SmokeMigrationSequence 1234 55434 { 1234 } { throw 'create failed' } { $script:steps += 'migrate' } } catch { }
    if (($script:steps -join ',') -cne 'listener') { throw 'Failed creation allowed migration' }
    $script:steps = @(); $script:checks = 0; $rejected = $false
    try { Invoke-SmokeMigrationSequence 1234 55434 { $script:checks++; if ($script:checks -eq 1) { 1234 } else { 9999 } } { $script:steps += 'create' } { $script:steps += 'migrate' } } catch { $rejected = $true }
    if (-not $rejected -or ($script:steps -join ',') -cne 'listener,create') { throw 'Changed identity allowed migration' }
    $rejected = $false
    try { Invoke-SmokeMigrationSequence 1234 55434 { 1234 } {} { throw 'migration failed' } } catch { $rejected = $true }
    if (-not $rejected) { throw 'Migration failure accepted' }
}
$migrationInfo = New-SmokeMigrationStartInfo 'C:\node\node.exe' 'C:\backend\node_modules\prisma\build\index.js' 'C:\owned\demo\prisma\schema.prisma' 'C:\owned\demo' ('demo_' + ('a' * 32)) ('b' * 64) 55434 ('dms_demo_' + ('c' * 32))
if ($migrationInfo.WorkingDirectory -cne 'C:\owned\demo' -or $migrationInfo.UseShellExecute -or
    $migrationInfo.Arguments -cnotmatch 'migrate deploy --schema' -or $migrationInfo.Arguments -match 'seed' -or
    $migrationInfo.EnvironmentVariables['DATABASE_URL'] -cne ('postgresql://demo_' + ('a' * 32) + ':' + ('b' * 64) + '@127.0.0.1:55434/dms_demo_' + ('c' * 32)) -or
    $migrationInfo.EnvironmentVariables.ContainsKey('NODE_OPTIONS') -or $migrationInfo.EnvironmentVariables.ContainsKey('PATH')) { throw 'Unsafe migration process plan' }
foreach ($bad in @('postgres', 'dms_demo_foo', 'dms_demo_' + ('a' * 32) + ';DROP')) {
    $rejected = $false
    try { New-SmokeMigrationStartInfo 'C:\node\node.exe' 'C:\backend\cli.js' 'C:\owned\demo\prisma\schema.prisma' 'C:\owned\demo' ('demo_' + ('a' * 32)) ('b' * 64) 55434 $bad } catch { $rejected = $true }
    if (-not $rejected) { throw 'Unsafe migration database accepted' }
}
& {
    $script:events = @()
    Invoke-BackendSmokeSequence { $script:events += 'prepare' } { $script:events += 'start' } { $script:events += 'health' } { $script:events += 'stop' }
    if (($script:events -join ',') -cne 'prepare,start,health,stop') { throw 'Backend smoke sequence incorrect' }
    $script:events = @()
    $failure = $null
    try { Invoke-BackendSmokeSequence { $script:events += 'prepare' } { $script:events += 'start' } { throw 'health failed' } { $script:events += 'stop' } } catch { $failure = $_.Exception.Message }
    if ($failure -cne 'health failed') { throw 'Backend health failure must propagate' }
    if (($script:events -join ',') -cne 'prepare,start,stop') { throw 'Backend failure must stop owned process' }
    $script:events = @()
    $failure = $null
    try { Invoke-BackendSmokeSequence { throw 'preparation failed' } { $script:events += 'start' } { $script:events += 'health' } { $script:events += 'stop' } } catch { $failure = $_.Exception.Message }
    if ($failure -cne 'preparation failed') { throw 'Backend preparation failure must propagate' }
    if ($script:events.Count -ne 0) { throw 'Failed preparation must prevent startup' }
    $script:events = @()
    $failure = $null
    try { Invoke-BackendSmokeSequence {} { $script:events += 'start'; throw 'startup failed' } { $script:events += 'health' } { $script:events += 'stop' } } catch { $failure = $_.Exception.Message }
    if ($failure -cne 'startup failed') { throw 'Backend startup failure must propagate' }
    if (($script:events -join ',') -cne 'start,stop') { throw 'Failed start must attempt owned cleanup' }
}
$plan = New-BackendLaunchPlan 'C:\owned\demo' 'C:\node\node.exe' 'C:\backend\dist\main.js' 55434 3201 3200 ('a' * 64) ('b' * 64)
if ($plan.WorkingDirectory -cne 'C:\owned\demo\backend' -or $plan.Environment['DEMO_MODE'] -cne '1' -or
    $plan.Environment['DEMO_FRONTEND_ORIGIN'] -cne 'http://127.0.0.1:3200' -or
    $plan.Environment['DATABASE_URL'] -cne ('postgresql://demo:' + ('a' * 64) + '@127.0.0.1:55434/postgres') -or
    $plan.Environment['JWT_SECRET'] -cne ('b' * 64) -or $plan.Environment['TEMP'] -cne 'C:\owned\demo\backend' -or
    $plan.Environment['TMP'] -cne 'C:\owned\demo\backend' -or $plan.Environment['PORT'] -cne '3201') { throw 'Invalid isolated backend plan' }
if ($plan.Environment.ContainsKey('PATH') -or $plan.Environment.ContainsKey('NODE_OPTIONS')) { throw 'Inherited environment in backend plan' }
foreach ($badPath in @('C:relative', '\rooted', 'relative', '\\server\share\file', 'C:')) {
    for ($position = 0; $position -lt 3; $position++) {
        $paths = @('C:\owned\demo', 'C:\node\node.exe', 'C:\backend\dist\main.js')
        $paths[$position] = $badPath
        $rejected = $false
        try { New-BackendLaunchPlan $paths[0] $paths[1] $paths[2] 55434 3201 3200 ('a' * 64) ('b' * 64) } catch { $rejected = $true }
        if (-not $rejected) { throw "Non-qualified backend path accepted: $badPath at $position" }
    }
}
$startInfo = New-BackendProcessStartInfo $plan
if ($startInfo.FileName -cne $plan.Executable -or $startInfo.WorkingDirectory -cne $plan.WorkingDirectory -or
    $startInfo.UseShellExecute -or $startInfo.EnvironmentVariables.Count -ne $plan.Environment.Count -or
    $startInfo.EnvironmentVariables['DEMO_MODE'] -cne '1' -or $startInfo.EnvironmentVariables.ContainsKey('PATH')) { throw 'Unsafe process start information' }
foreach ($badPorts in @(@(55434, 55434, 3200), @(0, 3201, 3200), @(55434, 3201, 65536))) {
    $rejected = $false
    try { New-BackendLaunchPlan 'C:\owned\demo' 'C:\node\node.exe' 'C:\backend\dist\main.js' $badPorts[0] $badPorts[1] $badPorts[2] ('a' * 64) ('b' * 64) } catch { $rejected = $true }
    if (-not $rejected) { throw 'Unsafe backend ports accepted' }
}
foreach ($bad in @('remote', '127.0.0.1:1', '')) {
    $rejected = $false
    try { New-BackendLaunchPlan 'C:\owned\demo' 'C:\node\node.exe' 'C:\backend\dist\main.js' 55434 3201 3200 $bad ('b' * 64) } catch { $rejected = $true }
    if (-not $rejected) { throw 'Unsafe database credential accepted' }
}
& {
    $script:steps = @()
    function Assert-OwnedListener { param($PostmasterPid, $Port) $script:steps += 'listener' }
    Invoke-BackendPreparation 1234 55434 { 1234 } { $script:steps += 'migrate'; $true } { $script:steps += 'seed' }
    if (($script:steps -join ',') -cne 'listener,migrate,listener,seed') { throw 'Preparation verification order incorrect' }
    $script:steps = @()
    $script:checks = 0
    try { Invoke-BackendPreparation 1234 55434 { $script:checks++; if ($script:checks -eq 1) { 1234 } else { 9999 } } { $script:steps += 'migrate'; $true } { $script:steps += 'seed' } } catch { }
    if (($script:steps -join ',') -cne 'listener,migrate') { throw 'Changed database identity allowed seed' }
    foreach ($migration in @({ $false }, {}, { 1 }, { $true; $true }, { throw 'migration failed' })) {
        $script:steps = @()
        $rejected = $false
        try { Invoke-BackendPreparation 1234 55434 { 1234 } $migration { $script:steps += 'seed' } } catch { $rejected = $true }
        if (-not $rejected -or ($script:steps -join ',') -cne 'listener') { throw 'Failed migration allowed seed' }
    }
    $script:steps = @()
    Assert-BackendOwnership 1234 3201 { 1234 }
    if (($script:steps -join ',') -cne 'listener') { throw 'Backend listener not verified' }
    $script:steps = @()
    $rejected = $false
    try { Assert-BackendOwnership 1234 3201 { 9999 } } catch { $rejected = $true }
    if (-not $rejected -or $script:steps.Count -ne 0) { throw 'Changed backend process accepted' }
}
& {
    $script:actions = 0
    $script:listeners = 0
    function Assert-OwnedListener { param($PostmasterPid, $Port) $script:listeners++ }
    Invoke-VerifiedClusterAction 1234 55434 { 1234 } { $script:actions++ }
    if ($script:actions -ne 1 -or $script:listeners -ne 1) { throw 'Verified cluster must allow action' }
    foreach ($identity in @(9999, 0, $null, @(1234, 1234))) {
        $rejected = $false
        try { Invoke-VerifiedClusterAction 1234 55434 { $identity } { $script:actions++ } } catch { $rejected = $true }
        if (-not $rejected -or $script:actions -ne 1 -or $script:listeners -ne 1) { throw 'Changed cluster identity allowed action' }
    }
    $rejected = $false
    try { Invoke-VerifiedClusterAction 1234 55434 { throw 'identity unavailable' } { $script:actions++ } } catch { $rejected = $true }
    if (-not $rejected -or $script:actions -ne 1) { throw 'Failed cluster verification allowed action' }
}
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$security = New-PasswordFileSecurity $sid
Assert-PasswordFileSecurity $security $sid
$unsafe = New-Object Security.AccessControl.FileSecurity
$rejected = $false
try { Assert-PasswordFileSecurity $unsafe $sid } catch { $rejected = $true }
if (-not $rejected) { throw 'Unprotected credential ACL accepted' }
$unsafe = New-PasswordFileSecurity $sid
$other = New-Object Security.Principal.SecurityIdentifier('S-1-1-0')
$unsafe.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($other, 'Read', 'Allow')))
$rejected = $false
try { Assert-PasswordFileSecurity $unsafe $sid } catch { $rejected = $true }
if (-not $rejected) { throw 'Additional credential access accepted' }
$unsafe = New-PasswordFileSecurity $sid
$unsafe.SetOwner($other)
$rejected = $false
try { Assert-PasswordFileSecurity $unsafe $sid } catch { $rejected = $true }
if (-not $rejected) { throw 'Incorrect credential owner accepted' }
$creation = @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'New-ProtectedPasswordFile' }, $true))
if ($creation.Count -ne 1 -or $creation[0].Extent.Text -notmatch 'FileSecurity' -or $creation[0].Extent.Text -notmatch 'CreateNew') { throw 'Credential creation must apply security atomically' }
$rightsTypes = @($creation[0].FindAll({ param($node) $node -is [System.Management.Automation.Language.TypeExpressionAst] -and $node.TypeName.Name -like '*FileSystemRights' }, $true))
if ($rightsTypes.Count -ne 1 -or $rightsTypes[0].TypeName.GetReflectionType() -ne [Security.AccessControl.FileSystemRights]) { throw 'Credential creation must reference the resolvable FileSystemRights type' }
$initCalls = @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.CommandAst] -and $node.GetCommandName() -eq 'Invoke-Pg' -and $node.CommandElements.Count -ge 3 -and $node.CommandElements[1].Value -eq 'initdb.exe' }, $true))
if ($initCalls.Count -ne 1 -or $initCalls[0].Extent.Text -notmatch '--pwfile' -or $initCalls[0].Extent.Text -notmatch '--auth=scram-sha-256') { throw 'initdb must receive the SCRAM password file' }
if ($ast.Extent.Text -match 'ALTER ROLE') { throw 'Offline password reset must not be necessary' }
$bootstrapCalls = @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.CommandAst] -and $node.GetCommandName() -eq 'Invoke-PasswordFileBootstrap' }, $true))
if ($bootstrapCalls.Count -ne 1) { throw 'Expected one credential bootstrap' }
$bootstrapText = $bootstrapCalls[0].Extent.Text
foreach ($required in @('New-ProtectedPasswordFile', 'Assert-PasswordFileSecurity', '$script:passwordStream.Dispose()', "'initdb.exe'", '--pwfile', 'Assert-NoReparseAncestors $root', '[IO.FileAttributes]::ReparsePoint', '[IO.File]::Delete($passwordFile)')) {
    if (-not $bootstrapText.Contains($required)) { throw "Missing bootstrap safeguard: $required" }
}
if ($bootstrapText -match 'Remove-Item|Delete\(\$root\)') { throw 'Bootstrap must not delete the retained root' }
& {
    $script:events = @()
    $create = { $script:events += 'create' }
    $cleanup = { $script:events += 'cleanup' }
    Invoke-PasswordFileBootstrap $create { $script:events += 'initdb' } $cleanup
    if (($script:events -join ',') -cne 'create,initdb,cleanup') { throw 'Bootstrap cleanup sequence incorrect' }
    $script:events = @()
    try { Invoke-PasswordFileBootstrap $create { throw 'initdb failed' } $cleanup } catch { }
    if (($script:events -join ',') -cne 'create,cleanup') { throw 'Failed initdb must clean up credential' }
    $script:events = @()
    try { Invoke-PasswordFileBootstrap $create { Assert-PasswordFileSecurity $unsafe $sid; $script:events += 'write' } $cleanup } catch { }
    if (($script:events -join ',') -cne 'create,cleanup') { throw 'Invalid ACL must prevent credential write and trigger cleanup' }
    $script:events = @()
    try { Invoke-PasswordFileBootstrap { throw 'create failed' } { throw 'unexpected' } $cleanup } catch { }
    if ($script:events.Count -ne 0) { throw 'Uncreated credential must not be cleaned up' }
    $rejected = $false
    try { Invoke-PasswordFileBootstrap $create {} { throw 'cleanup failed' } } catch { $rejected = $true }
    if (-not $rejected) { throw 'Credential cleanup failure must fail closed' }
}
if ((Get-SmokeFailureDiagnostic 'initdb.exe') -notmatch 'initdb.exe') { throw 'Missing sanitized stage diagnostic' }
if ((Get-SmokeFailureDiagnostic 'secret arbitrary input') -match 'secret') { throw 'Stage diagnostic exposed untrusted input' }
Assert-SmokeQueryResult @('1')
Invoke-SmokeQueryCheck { '1' }
foreach ($result in @(@('0'), @('1', '1'), @())) {
    $rejected = $false
    try { Assert-SmokeQueryResult $result } catch { $rejected = $true }
    if (-not $rejected) { throw 'Invalid SQL result accepted' }
}
$rejected = $false
try { Invoke-SmokeQueryCheck { '0' } } catch { $rejected = $true }
if (-not $rejected) { throw 'Wrong SQL query result accepted' }
$rejected = $false
try { Invoke-SmokeQueryCheck { throw 'SQL failed' } } catch { $rejected = $true }
if (-not $rejected) { throw 'SQL failure accepted' }
$diagnostic = Get-StartupFailureDiagnostic 'C:\owned\demo' 'C:\owned\demo\pgdata'
foreach ($expected in @('C:\owned\demo', 'C:\owned\demo\pgdata', 'may still be running', 'verify', 'do not kill')) {
    if ($diagnostic -notlike "*$expected*") { throw "Missing startup diagnostic: $expected" }
}
& {
    $script:listeners = @()
    $script:connections = 0
    $script:stops = 0
    function Get-NetTCPConnection { param($LocalPort, $State, $ErrorAction) return $script:listeners }
    $connect = { $script:connections++ }
    $stop = { $script:stops++ }
    $listener = [pscustomobject]@{ LocalAddress = '127.0.0.1'; LocalPort = 55434; State = 'Listen'; OwningProcess = 1234 }
    $script:listeners = @($listener)
    Invoke-VerifiedDatabaseAction 1234 55434 $connect
    if ($script:connections -ne 1) { throw 'Matching listener must allow action' }
    foreach ($case in @(
        @{ PidValue = 0; Listeners = @($listener) },
        @{ PidValue = 9999; Listeners = @($listener) },
        @{ PidValue = 1234; Listeners = @() },
        @{ PidValue = 1234; Listeners = @($listener, $listener) },
        @{ PidValue = 1234; Listeners = @([pscustomobject]@{ LocalAddress = '127.0.0.1'; LocalPort = 55434; State = 'Listen'; OwningProcess = 9999 }) },
        @{ PidValue = 1234; Listeners = @([pscustomobject]@{ LocalAddress = '0.0.0.0'; LocalPort = 55434; State = 'Listen'; OwningProcess = 1234 }) }
    )) {
        $script:listeners = $case.Listeners
        $rejected = $false
        try { Invoke-VerifiedDatabaseAction $case.PidValue 55434 $connect } catch { $rejected = $true }
        if (-not $rejected -or $script:connections -ne 1) { throw 'Unsafe listener allowed connection' }
    }
    $script:listeners = @($listener)
    Invoke-VerifiedPostmasterStop 1234 { 1234 } $stop
    if ($script:stops -ne 1) { throw 'Matching process must allow stop' }
    foreach ($actual in @(0, 9999, $null, @(1234, 1234))) {
        $rejected = $false
        try { Invoke-VerifiedPostmasterStop 1234 { $actual } $stop } catch { $rejected = $true }
        if (-not $rejected -or $script:stops -ne 1) { throw 'Unsafe process allowed stop' }
    }
    $rejected = $false
    try { Invoke-VerifiedPostmasterStop 0 { 1234 } $stop } catch { $rejected = $true }
    if (-not $rejected -or $script:stops -ne 1) { throw 'Missing original PID allowed stop' }
    function Get-NetTCPConnection { param($LocalPort, $State, $ErrorAction) throw 'Listener lookup failed' }
    $rejected = $false
    try { Invoke-VerifiedDatabaseAction 1234 55434 $connect } catch { $rejected = $true }
    if (-not $rejected -or $script:connections -ne 1) { throw 'Listener lookup failure allowed connection' }
}
& {
$script:checkedPaths = @()
function Get-Item {
    param([string]$LiteralPath, [switch]$Force)
    $script:checkedPaths += $LiteralPath
    $attributes = if ($LiteralPath -eq 'C:\unsafe') { [IO.FileAttributes]::ReparsePoint } else { [IO.FileAttributes]::Directory }
    return [pscustomobject]@{ Attributes = $attributes }
}
$rejected = $false
try { Assert-NoReparseAncestors 'C:\unsafe\nested\data' } catch { $rejected = $true }
if (-not $rejected -or $script:checkedPaths -notcontains 'C:\unsafe') { throw 'Reparse ancestor must be rejected' }
$script:checkedPaths = @()
Assert-NoReparseAncestors 'C:\safe\nested\data'
foreach ($expected in @('C:\safe\nested\data', 'C:\safe\nested', 'C:\safe', 'C:\')) {
    if ($script:checkedPaths -notcontains $expected) { throw "Ancestor not checked: $expected" }
}
}
$valid = @('1234', 'C:\owned\pgdata', '0', '55434', '', '127.0.0.1')
Assert-PostmasterIdentity $valid 'C:\owned\pgdata' 55434
foreach ($invalid in @(
    @('1234', 'C:\other\pgdata', '0', '55434', '', '127.0.0.1'),
    @('1234', 'C:\owned\pgdata', '0', '55435', '', '127.0.0.1'),
    @('1234', 'C:\owned\pgdata', '0', '55434', '', '*'),
    @('0', 'C:\owned\pgdata', '0', '55434', '', '127.0.0.1'),
    @('1234', 'C:\owned\pgdata')
)) {
    $rejected = $false
    try { Assert-PostmasterIdentity $invalid 'C:\owned\pgdata' 55434 } catch { $rejected = $true }
    if (-not $rejected) { throw 'Invalid postmaster identity accepted' }
}
$ErrorActionPreference = 'Continue'
$output = & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -Preflight -DatabaseSmokeTest 2>&1
$ErrorActionPreference = 'Stop'
if ($LASTEXITCODE -eq 0) { throw 'Conflicting modes must fail closed' }
if (($output -join "`n") -notmatch 'Choose only one mode') { throw 'Missing conflicting-mode guard' }
$smokeFunction = @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Invoke-DatabaseSmokeTest' }, $true))
if ($smokeFunction.Count -ne 1) { throw 'Expected exactly one smoke function' }
foreach ($required in @('New-SmokeDatabaseName', 'Copy-IsolatedPrismaInputs $prismaSource $root', 'New-SmokeMigrationStartInfo', 'Invoke-SmokeMigrationSequence', "'createdb.exe'", 'Invoke-SmokeMigration $migrationInfo', "'-T', 'template0', `$database")) {
    if (-not $smokeFunction[0].Extent.Text.Contains($required)) { throw "Smoke mode missing migration wiring: $required" }
}
foreach ($required in @('New-SmokeSeedStartInfo $migrationInfo', "`$stage = 'demo seed'", 'Invoke-VerifiedClusterAction $verifiedPid $port { Assert-OwnedPostmaster } { Invoke-SmokeMigration $seedInfo }')) {
    if (-not $smokeFunction[0].Extent.Text.Contains($required)) { throw "Smoke mode missing seed wiring: $required" }
}
$seedInfo = New-SmokeSeedStartInfo $migrationInfo 'C:\backend\node_modules\ts-node\dist\bin.js' 'C:\backend\prisma\seed-demo-entry.ts' 'C:\backend\tsconfig.json' ('d' * 64)
if ($seedInfo.EnvironmentVariables['DATABASE_URL'] -cne $migrationInfo.EnvironmentVariables['DATABASE_URL'] -or
    $seedInfo.EnvironmentVariables['DEMO_OWNED_TARGET'] -cne $migrationInfo.EnvironmentVariables['DATABASE_URL'] -or
    $seedInfo.EnvironmentVariables['DEMO_OWNED_MARKER'] -cne 'visible-demo-smoke-v1' -or
    $seedInfo.EnvironmentVariables['DEMO_ADMIN_PASSWORD'] -cne ('d' * 64) -or
    $seedInfo.EnvironmentVariables.ContainsKey('NODE_OPTIONS') -or $seedInfo.Arguments.Contains(('d' * 64))) { throw 'Unsafe seed process plan' }
$body = $smokeFunction[0].Body.Extent
$source = $ast.Extent.Text
$mockSource = $source.Substring(0, $body.StartOffset) + "{ Write-Output 'mock smoke dispatched' }" + $source.Substring($body.EndOffset)
$output = @(& ([scriptblock]::Create($mockSource)) -DatabaseSmokeTest)
if ($output.Count -ne 1 -or $output[0] -cne 'mock smoke dispatched') { throw 'Smoke mode must dispatch exactly once and return' }
$output = @(& ([scriptblock]::Create($mockSource)) -BackendSmokeTest)
if ($output.Count -ne 1 -or $output[0] -cne 'mock smoke dispatched') { throw 'Backend mode must dispatch exactly once and return' }
foreach ($required in @('New-BackendLaunchPlan $root $node $tsNode', "`$plan.Environment['DATABASE_URL'] = `$migrationInfo.EnvironmentVariables['DATABASE_URL']", 'New-BackendProcessStartInfo $plan', '$child.Start()', 'Assert-BackendOwnership $childState.Pid', "[Net.HttpWebRequest]::Create('http://127.0.0.1:3201/api')", '$request.Proxy = $null', '$request.AllowAutoRedirect = $false', '[int]$response.StatusCode -eq 200', '$child.Kill()', '$child.WaitForExit(30000)')) {
    if (-not $smokeFunction[0].Extent.Text.Contains($required)) { throw "Backend smoke missing wiring: $required" }
}
if ($smokeFunction[0].Extent.Text.IndexOf('Assert-BackendOwnership $childState.Pid') -gt $smokeFunction[0].Extent.Text.IndexOf('[Net.HttpWebRequest]::Create(')) { throw 'Backend ownership must be checked before readiness' }
if ($smokeFunction[0].Extent.Text.IndexOf('$child.Kill()') -gt $smokeFunction[0].Extent.Text.IndexOf("'pg_ctl.exe stop'")) { throw 'Backend must stop before PostgreSQL' }
$ErrorActionPreference = 'Continue'
$output = & powershell -NoProfile -ExecutionPolicy Bypass -File $runner -BackendSmokeTest -DatabaseSmokeTest 2>&1
$ErrorActionPreference = 'Stop'
if ($LASTEXITCODE -eq 0 -or ($output -join "`n") -notmatch 'Choose only one mode') { throw 'Backend conflicting modes must fail closed' }
$output = & powershell -NoProfile -ExecutionPolicy Bypass -File $runner 2>&1
if ($LASTEXITCODE -eq 0) { throw 'Unverified full-app startup must fail closed' }
if (($output -join "`n") -notmatch 'Full-app startup is blocked') { throw 'Missing startup blocker' }
Write-Output 'Isolation checks passed'
