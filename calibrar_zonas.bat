@echo off
title Calibrador de Zonas - Chat de Proximidad
echo ===================================================
echo CALIBRADOR DE ZONAS (POLIGONOS)
echo ===================================================
echo.
echo 1. Abre el juego y maximiza el mapa grande en tu pantalla.
echo 2. El programa tomara una foto despues de 10 segundos.
echo 3. Podras hacer clics para marcar los bordes de cada zona.
echo 4. Clic derecho para cerrar la forma y escribir el nombre (ej. "Peak").
echo.
pause
echo Iniciando...
python src\automation\gui_calibrar_zonas.py
echo.
pause
