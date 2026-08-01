param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [string]$EnvPath = "backend/.env",
  [string]$ComposePath = "docker-compose.yml"
)

$ErrorActionPreference = "Stop"

function Get-EnvValue {
  param([string]$Path, [string]$Name)
  $line = Get-Content -LiteralPath $Path | Where-Object { $_ -match "^$Name=" } | Select-Object -First 1
  if (-not $line) { throw "No se encontró $Name en $Path." }
  return (($line -replace "^$Name=", "").Trim().Trim('"'))
}

function Get-ContainerName {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return "tampo_postgres" }
  $line = Get-Content -LiteralPath $Path | Where-Object { $_ -match "^\s*container_name:\s*" } | Select-Object -First 1
  if (-not $line) { return "tampo_postgres" }
  return (($line -replace "^\s*container_name:\s*", "").Trim().Trim('"').Trim("'"))
}

if (-not (Test-Path -LiteralPath $BackupFile)) {
  throw "No existe el archivo de backup: $BackupFile"
}

$databaseUrl = Get-EnvValue -Path $EnvPath -Name "DATABASE_URL"
$uri = [Uri]$databaseUrl
$dbName = $uri.AbsolutePath.TrimStart("/")
$dbUser = [Uri]::UnescapeDataString($uri.UserInfo.Split(":")[0])
$containerName = Get-ContainerName -Path $ComposePath
$backupName = Split-Path -Path $BackupFile -Leaf
$containerPath = "/tmp/$backupName"

Write-Host "Validando backup..."
docker cp $BackupFile "${containerName}:$containerPath"
if ($LASTEXITCODE -ne 0) { throw "docker cp terminó con error." }

docker exec $containerName pg_restore --list $containerPath | Out-Null
if ($LASTEXITCODE -ne 0) { throw "El archivo no parece ser un backup válido de PostgreSQL." }

Write-Host "Restaurando $dbName desde $BackupFile..."
Write-Host "Advertencia: esta acción reemplaza objetos y datos de la base local."
docker exec $containerName pg_restore -U $dbUser -d $dbName --clean --if-exists --no-owner --no-privileges $containerPath
if ($LASTEXITCODE -ne 0) { throw "pg_restore terminó con error." }

Write-Host "Restauración finalizada correctamente."
