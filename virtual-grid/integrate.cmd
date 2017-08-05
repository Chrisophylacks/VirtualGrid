echo on
call npm run build
del /S /Q %~dp0..\test-app\node_modules\virtual-grid\dist 1>nul
xcopy dist %~dp0..\test-app\node_modules\virtual-grid\dist /E /I /Q