@echo off
setlocal EnableExtensions

if /I "%~1"=="--dry-run" (
  echo OK
  exit /b 0
)

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

where npm >nul 2>nul
if errorlevel 1 (
  echo npm no está instalado o no está en el PATH.
  exit /b 1
)

call :install_dependencies "%BACKEND_DIR%" "backend"
if errorlevel 1 exit /b 1

call :install_dependencies "%FRONTEND_DIR%" "frontend"
if errorlevel 1 exit /b 1

echo Iniciando backend...
start "Rifas Backend" /D "%BACKEND_DIR%" cmd /k npm run dev

echo Iniciando frontend...
start "Rifas Frontend" /D "%FRONTEND_DIR%" cmd /k npm run dev

echo.
echo Backend en http://localhost:3001
echo Frontend en http://localhost:5173
echo.
echo Deja abiertas las dos ventanas para mantener los servidores activos.
echo Cierra cada ventana cuando quieras detener el proyecto.
exit /b 0

:install_dependencies
set "PROJECT_DIR=%~1"
set "PROJECT_NAME=%~2"

if exist "%PROJECT_DIR%\node_modules" exit /b 0

echo Instalando dependencias en %PROJECT_NAME%...
pushd "%PROJECT_DIR%"

if exist package-lock.json (
  call npm ci
) else (
  call npm install
)

if errorlevel 1 (
  popd
  exit /b 1
)

popd
exit /b 0