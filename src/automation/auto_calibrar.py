import time
import mss
from PIL import Image
import os
import sys

print("Instalando dependencias necesarias temporalmente...")
os.system("pip install pynput")

from pynput import mouse

print("---------------------------------------")
print("Herramienta de Calibracion Automatica")
print("---------------------------------------")
print("\nSigue estas instrucciones cuidadosamente:\n")
print("1. Abre el juego y asegurate de que se vea el nombre de la zona en tu minimapa.")
print("2. Haz clic en la ESQUINA SUPERIOR IZQUIERDA de donde aparece el texto de la zona.")
print("3. Luego haz clic en la ESQUINA INFERIOR DERECHA del texto.")

clicks = []

def on_click(x, y, button, pressed):
    if pressed and button == mouse.Button.left:
        clicks.append((int(x), int(y)))
        if len(clicks) == 1:
            print(f"> Primer punto guardado: ({int(x)}, {int(y)}). Ahora haz clic en la esquina inferior derecha.")
        elif len(clicks) == 2:
            print(f"> Segundo punto guardado: ({int(x)}, {int(y)}). Procesando...")
            return False # Detiene el listener

# Iniciar listener
with mouse.Listener(on_click=on_click) as listener:
    listener.join()

if len(clicks) == 2:
    left = min(clicks[0][0], clicks[1][0])
    top = min(clicks[0][1], clicks[1][1])
    right = max(clicks[0][0], clicks[1][0])
    bottom = max(clicks[0][1], clicks[1][1])
    
    width = right - left
    height = bottom - top
    
    region = {
        "left": left,
        "top": top,
        "width": width,
        "height": height
    }
    
    print("\n> Capturando la region seleccionada para verificar...")
    
    try:
        with mss.mss() as sct:
            screenshot = sct.grab(region)
            imagen = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
            
            output_path = "test_capture.png"
            imagen.save(output_path)
            
            print(f"OK! Imagen guardada en: {output_path}")
            print("\nCopia la siguiente configuracion dentro de src/automation/bridge.py:")
            print("--------------------------------------------------")
            print(f'SCREEN_REGION = {{')
            print(f'    "left": {left},')
            print(f'    "top": {top},')
            print(f'    "width": {width},')
            print(f'    "height": {height}')
            print(f'}}')
            print("--------------------------------------------------")
            print("\nAbriendo la imagen para que verifiques que el texto de la zona quedo bien enmarcado...")
            os.startfile(output_path)
    except Exception as e:
        print(f"ERROR al capturar: {e}")
else:
    print("ERROR: No se registraron los clics necesarios.")
