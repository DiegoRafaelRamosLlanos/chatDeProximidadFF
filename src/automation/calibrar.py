# Herramienta para encontrar las coordenadas de captura
# Ejecuta este script y mueve el mouse a la esquina de donde quieres capturar

import time
import mss
from PIL import Image
import os

def get_mouse_position():
    """Obtiene la posición del mouse (requiere pyautogui)"""
    try:
        import pyautogui
        return pyautogui.position()
    except ImportError:
        return None

def capturar_region(region):
    """Captura una región de la pantalla"""
    with mss.mss() as sct:
        screenshot = sct.grab(region)
        return Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")

def main():
    print("═══════════════════════════════════════")
    print("🎯 Herramienta de Calibración de Región")
    print("═══════════════════════════════════════")
    print("")
    print("Esta herramienta te ayudará a encontrar las coordenadas")
    print("de la región donde aparece el nombre de la zona en tu juego.")
    print("")
    
    # Solicitar coordenadas manualmente
    print("📍 Ingresa las coordenadas de la esquina SUPERIOR IZQUIERDA:")
    left = int(input("   X (izquierda): "))
    top = int(input("   Y (arriba): "))
    
    print("")
    print("📏 Ingresa el tamaño de la región:")
    width = int(input("   Ancho: "))
    height = int(input("   Alto: "))
    
    region = {
        "left": left,
        "top": top, 
        "width": width,
        "height": height
    }
    
    print("")
    print(f"📸 Capturando región: {region}")
    
    # Capturar y guardar
    imagen = capturar_region(region)
    
    # Guardar imagen de prueba
    output_path = "test_capture.png"
    imagen.save(output_path)
    print(f"✅ Imagen guardada en: {output_path}")
    print("")
    print("🔍 Abre 'test_capture.png' y verifica que contiene el texto de la zona.")
    print("")
    print("📋 Copia esta configuración a bridge.py:")
    print("")
    print(f'SCREEN_REGION = {{')
    print(f'    "left": {left},')
    print(f'    "top": {top},')
    print(f'    "width": {width},')
    print(f'    "height": {height}')
    print(f'}}')
    
    # Abrir imagen
    os.startfile(output_path)

if __name__ == "__main__":
    main()
