@echo off
echo ===================================================
echo INICIANDO ESCANER DEL MINIMAPA (BRIDGE OCR)
echo ===================================================
chcp 65001 > nul
set PYTHONIOENCODING=utf-8
python src\automation\bridge.py
pause
