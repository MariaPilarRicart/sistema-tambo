param(
  [string]$EnvPath = "backend/.env",
  [string]$ComposePath = "docker-compose.yml",
  [string]$BackupDir = "database/backups",
  [string]$Prefix = "ganaderia-test"
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

$databaseUrl = Get-EnvValue -Path $EnvPath -Name "DATABASE_URL"
$uri = [Uri]$databaseUrl
$dbName = $uri.AbsolutePath.TrimStart("/")
$dbUser = [Uri]::UnescapeDataString($uri.UserInfo.Split(":")[0])
$containerName = Get-ContainerName -Path $ComposePath

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$fileName = "$Prefix-$stamp.dump"
$localPath = Join-Path $BackupDir $fileName
$containerPath = "/tmp/$fileName"

Write-Host "Generando backup completo de $dbName en Docker ($containerName)..."
docker exec $containerName pg_dump -U $dbUser -d $dbName -Fc -f $containerPath
if ($LASTEXITCODE -ne 0) { throw "pg_dump terminó con error." }

docker cp "${containerName}:$containerPath" $localPath
if ($LASTEXITCODE -ne 0) { throw "docker cp terminó con error." }

if (-not (Test-Path -LiteralPath $localPath)) { throw "No se encontró el archivo generado: $localPath" }
$file = Get-Item -LiteralPath $localPath
if ($file.Length -le 0) { throw "El backup generado está vacío: $localPath" }

docker exec $containerName pg_restore --list $containerPath | Out-Null
if ($LASTEXITCODE -ne 0) { throw "pg_restore --list no pudo leer el backup." }

Write-Host "Backup generado y validado:"
Write-Host $file.FullName
