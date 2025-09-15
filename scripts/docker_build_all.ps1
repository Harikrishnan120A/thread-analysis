param(
  [string]$ComposeInfra = "infra/docker-compose.yml",
  [string]$ComposeApp = "infra/docker-compose.app.yml"
)

Write-Host "Building backend and frontend images..."
docker compose -f $ComposeInfra -f $ComposeApp build --no-cache
if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }
Write-Host "Starting services..."
docker compose -f $ComposeInfra -f $ComposeApp up -d
Write-Host "Services started: frontend http://localhost:3000 backend http://localhost:8000"

