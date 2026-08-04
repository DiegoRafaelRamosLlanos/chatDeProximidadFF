@echo off
title Calibrador del Mapa Grande - Chat de Proximidad
echo ===================================================
echo CALIBRADOR DE MAPA GRANDE
echo ===================================================
echo.
echo 1. Abre el juego y abre el MAPA GRANDE en pantalla completa.
echo 2. El programa tomara una foto de la pantalla.
echo 3. Dibuja un cuadrado encerrando TODO el mapa grande.
echo.
pause
echo Iniciando...
python src\automation\gui_calibrar_mapa.py
echo.
echo ¡Coordenadas guardadas! Ahora el escaner usara el recuadro que dibujaste.
pause
