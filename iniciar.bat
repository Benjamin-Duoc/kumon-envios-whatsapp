@echo off
title Kumon Los Presidentes - Sistema de Envios WhatsApp
echo ======================================================
echo Iniciando Sistema de Envios Automatizados WhatsApp...
echo Kumon Los Presidentes - Orientadora Ximena
echo ======================================================
echo.
echo Abriendo interfaz en el navegador...
timeout /t 2 /nobreak > nul
start http://localhost:3000
node src/server.js
pause

