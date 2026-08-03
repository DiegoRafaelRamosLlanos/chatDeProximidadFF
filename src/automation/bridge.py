# Bridge OCR - Free Fire Craftland a Discord
# Este script lee la pantalla y envía la ubicación al bot de Discord

import mss
import pytesseract
from PIL import Image
import requests
import time
import re
import sys
import os

# ═══════════════════════════════════════════════════════════════
# CONFIGURACIÓN DE TESSERACT (Windows)
# ═══════════════════════════════════════════════════════════════
# Ruta donde se instaló Tesseract OCR (ajústala si es diferente)
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

if os.path.exists(TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH
else:
    print(f"⚠️  ADVERTENCIA: No se encontró Tesseract en: {TESSERACT_PATH}")
    print("   Verifica la ruta de instalación de Tesseract OCR")

# ═══════════════════════════════════════════════════════════════
# CONFIGURACIÓN - MODIFICA ESTOS VALORES
# ═══════════════════════════════════════════════════════════════

# Tu ID de Discord (haz clic derecho en tu nombre > Copiar ID)
DISCORD_USER_ID = "858813079734452245"

# ID del servidor de Discord donde está el bot
GUILD_ID = "1454092469221458024"

# Puerto del bot (debe coincidir con API_PORT en .env)
BOT_API_URL = "http://localhost:3001/api/location"

# Región de la pantalla a leer (x, y, ancho, alto)
# Capturamos un área grande del lado izquierdo de la pantalla
# donde suele estar el minimapa para evitar tener que calibrar exacto.
SCREEN_REGION = {
    "left": 0,      # Empezar desde el borde izquierdo
    "top": 150,     # Bajar un poco
    "width": 400,   # Ancho generoso
    "height": 400   # Alto generoso
}

# Mapa que estás jugando
CURRENT_MAP = "bermuda"

# Intervalo de escaneo en segundos
SCAN_INTERVAL = 2

# Zonas válidas (el script solo enviará si detecta una de estas)
ZONAS_VALIDAS = [
    "Pochinok", "Observatory", "Peak", "Bimasakti", "Factory",
    "Hangar", "Riverside", "Warehouse", "Bullseye", "Clock Tower",
    "Mill", "Sentinel", "Graveyard", "Mars Electric", "Nurek Dam",
    "Katulistiwa", "Rim Nam", "Cape Town", "Brazilia", "Command Post"
]

# ═══════════════════════════════════════════════════════════════
# FUNCIONES
# ═══════════════════════════════════════════════════════════════

def capturar_pantalla():
    """Captura la región especificada de la pantalla"""
    with mss.mss() as sct:
        screenshot = sct.grab(SCREEN_REGION)
        return Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")

def extraer_texto(imagen):
    """Extrae texto de una imagen usando OCR"""
    # Convertir a escala de grises para mejor reconocimiento
    imagen_gris = imagen.convert('L')
    texto = pytesseract.image_to_string(imagen_gris)
    return texto.strip()

def buscar_zona(texto):
    """Busca si hay una zona válida en el texto detectado"""
    texto_lower = texto.lower()
    for zona in ZONAS_VALIDAS:
        if zona.lower() in texto_lower:
            return zona
    return None

def enviar_ubicacion(zona):
    """Envía la ubicación al bot de Discord"""
    payload = {
        "discordUserId": DISCORD_USER_ID,
        "zone": zona,
        "map": CURRENT_MAP,
        "guildId": GUILD_ID
    }
    
    try:
        response = requests.post(BOT_API_URL, json=payload, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Ubicación enviada: {zona}")
            print(f"   Voz: {data.get('voiceMessage', 'N/A')}")
            return True
        else:
            print(f"❌ Error del servidor: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ No se puede conectar al bot. ¿Está corriendo?")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("═══════════════════════════════════════")
    print("🎮 Bridge OCR - Craftland a Discord")
    print("═══════════════════════════════════════")
    print(f"📍 Región: {SCREEN_REGION}")
    print(f"🗺️  Mapa: {CURRENT_MAP}")
    print(f"⏱️  Intervalo: {SCAN_INTERVAL}s")
    print("═══════════════════════════════════════")
    print("Presiona Ctrl+C para detener\n")
    
    ultima_zona = None
    
    try:
        while True:
            # Capturar pantalla
            imagen = capturar_pantalla()
            
            # Extraer texto
            texto = extraer_texto(imagen)
            
            if texto:
                # Buscar zona válida
                zona = buscar_zona(texto)
                
                if zona and zona != ultima_zona:
                    print(f"🔍 Detectado: {zona}")
                    if enviar_ubicacion(zona):
                        ultima_zona = zona
            
            time.sleep(SCAN_INTERVAL)
            
    except KeyboardInterrupt:
        print("\n👋 Bridge detenido")

if __name__ == "__main__":
    # Verificar configuración
    if DISCORD_USER_ID == "TU_ID_AQUI":
        print("⚠️  ERROR: Configura tu DISCORD_USER_ID en el script")
        print("   Haz clic derecho en tu nombre en Discord > Copiar ID")
        sys.exit(1)
    
    if GUILD_ID == "TU_GUILD_ID_AQUI":
        print("⚠️  ERROR: Configura tu GUILD_ID en el script")
        print("   Haz clic derecho en el servidor > Copiar ID del servidor")
        sys.exit(1)
    
    main()
