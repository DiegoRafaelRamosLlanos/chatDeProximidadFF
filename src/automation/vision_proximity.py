import cv2
import numpy as np
import mss
import os
import time
import easyocr
import requests

# Crear carpeta para debug
DEBUG_DIR = "debug_circles"
TEMPLATES_DIR = "templates"

for folder in [DEBUG_DIR, TEMPLATES_DIR]:
    if not os.path.exists(folder):
        os.makedirs(folder)

# Inicializar el lector OCR UNA sola vez (es lento la primera vez, después es rápido)
print("Cargando motor de reconocimiento de numeros (OCR)...")
reader = easyocr.Reader(['en'], gpu=False, verbose=False)
print("Motor OCR listo!")

def capture_screen():
    with open("trace.txt", "a") as f: f.write("-> Iniciando capture_screen\n")
    print("Tomando captura de pantalla...")
    with open("trace.txt", "a") as f: f.write("-> Tomando captura...\n")
    try:
        with mss.mss() as sct:
            monitor = sct.monitors[1]
            screenshot = sct.grab(monitor)
            img = np.array(screenshot)
            img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
            with open("trace.txt", "a") as f: f.write("-> Captura MSS exitosa\n")
            return img
    except Exception as e:
        with open("trace.txt", "a") as f: f.write(f"-> Error MSS: {e}\n")
        print(f"Error con mss ({e}), intentando metodo alternativo (PIL)...")
        from PIL import ImageGrab
        img = ImageGrab.grab()
        img = np.array(img)
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        with open("trace.txt", "a") as f: f.write("-> Captura PIL exitosa\n")
        return img

def detect_players_by_template(img):
    h, w = img.shape[:2]
    
    # =========================================================
    # PASO 1: Recortar SOLO el area del mapa
    # =========================================================
    coords_file = "data/map_coords.json"
    if os.path.exists(coords_file):
        import json
        with open(coords_file, "r") as f:
            coords = json.load(f)
            map_x_start = coords["map_x_start"]
            map_y_start = coords["map_y_start"]
            map_x_end = coords["map_x_end"]
            map_y_end = coords["map_y_end"]
    else:
        # Valores por defecto basados en porcentajes
        map_x_start = int(w * 0.48)
        map_y_start = int(h * 0.05)
        map_x_end = int(w * 0.98)
        map_y_end = int(h * 0.92)
    
    map_region = img[map_y_start:map_y_end, map_x_start:map_x_end]
    output = img.copy()
    
    print(f"Area del mapa recortada: {map_region.shape[1]}x{map_region.shape[0]} px")
    
    # Rectangulo azul del area de busqueda
    cv2.rectangle(output, (map_x_start, map_y_start), (map_x_end, map_y_end), (255, 0, 0), 2)
    
    # Cargar zonas poligonales si existen
    zonas_definidas = []
    zonas_file = "data/zonas.json"
    if os.path.exists(zonas_file):
        try:
            import json
            with open(zonas_file, "r") as f:
                zonas_definidas = json.load(f)
            
            # Dibujar las zonas en el output para debug
            for z in zonas_definidas:
                pts = np.array(z["points"], np.int32)
                pts = pts.reshape((-1, 1, 2))
                cv2.polylines(output, [pts], isClosed=True, color=(255, 165, 0), thickness=2)
                # Dibujar el nombre de la zona
                cx = int(np.mean([p[0] for p in z["points"]]))
                cy = int(np.mean([p[1] for p in z["points"]]))
                cv2.putText(output, z["name"], (cx - 20, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 165, 0), 2)
        except Exception as e:
            print(f"Error cargando zonas: {e}")
    
    jugadores_detectados = []
    
    # =========================================================
    # PASO 2: ENCONTRAR CÍRCULOS (Template Matching permisivo)
    # =========================================================
    # Cargar plantillas disponibles para usar su forma circular como guía
    plantillas_disponibles = [f for f in os.listdir(TEMPLATES_DIR) if f.endswith(".png")]
    
    plantillas_img = []
    for filename in plantillas_disponibles:
        p_path = os.path.join(TEMPLATES_DIR, filename)
        t_img = cv2.imread(p_path, cv2.IMREAD_COLOR)
        if t_img is not None:
            plantillas_img.append(t_img)
            
    # Si no hay plantillas, crear un círculo gris sintético de referencia para buscar
    if not plantillas_img:
        t_img = np.zeros((30, 30, 3), dtype=np.uint8)
        cv2.circle(t_img, (15, 15), 14, (128, 128, 128), -1)
        cv2.circle(t_img, (15, 15), 14, (50, 50, 50), 2)
        plantillas_img.append(t_img)

    THRESHOLD_DETECCION = 0.48  # Permisivo para encontrar TODOS los círculos
    circulos_encontrados = []
    
    for t_img in plantillas_img:
        t_h, t_w = t_img.shape[:2]
        res = cv2.matchTemplate(map_region, t_img, cv2.TM_CCOEFF_NORMED)
        loc = np.where(res >= THRESHOLD_DETECCION)
        
        for pt in zip(*loc[::-1]):
            x_map, y_map = pt
            centro_x = x_map + (t_w // 2)
            centro_y = y_map + (t_h // 2)
            
            es_duplicado = False
            for c in circulos_encontrados:
                dist = ((centro_x - c['cx'])**2 + (centro_y - c['cy'])**2)**0.5
                if dist < 18:
                    es_duplicado = True
                    break
                    
            if not es_duplicado:
                circulos_encontrados.append({
                    "x": x_map, "y": y_map, 
                    "w": t_w, "h": t_h,
                    "cx": centro_x, "cy": centro_y
                })

    print(f"   Círculos encontrados en el mapa: {len(circulos_encontrados)}")
    
    # =========================================================
    # PASO 3: LEER EL NÚMERO con OCR
    # =========================================================
    ids_encontrados = set()
    
    for idx, circ in enumerate(circulos_encontrados):
        x, y, w_c, h_c = circ['x'], circ['y'], circ['w'], circ['h']
        
        # Agregar un pequeño margen al recorte
        margen = 2
        x1 = max(0, x - margen)
        y1 = max(0, y - margen)
        x2 = min(map_region.shape[1], x + w_c + margen)
        y2 = min(map_region.shape[0], y + h_c + margen)
        
        roi = map_region[y1:y2, x1:x2]
        
        if roi.shape[0] < 10 or roi.shape[1] < 10:
            continue
        
        # Escalar el ROI x5 para que el OCR lea mejor los números pequeños
        roi_grande = cv2.resize(roi, None, fx=5, fy=5, interpolation=cv2.INTER_CUBIC)
        
        # Convertir a escala de grises
        gris_roi = cv2.cvtColor(roi_grande, cv2.COLOR_BGR2GRAY)
        
        # CLAVE: Aplicar máscara circular para ELIMINAR todo lo que está fuera del círculo
        # (letras del mapa, flechas de dirección del jugador, bordes)
        rh, rw = gris_roi.shape[:2]
        mascara_circ = np.zeros((rh, rw), dtype=np.uint8)
        # Círculo más pequeño (32%) para evitar completamente la flecha direccional del borde
        radio = int(min(rw, rh) * 0.32)
        cv2.circle(mascara_circ, (rw // 2, rh // 2), radio, 255, -1)
        
        # Poner en blanco todo lo que está FUERA del círculo (fondo blanco = invisible para OCR)
        gris_roi_limpio = np.full_like(gris_roi, 255)
        gris_roi_limpio[mascara_circ == 255] = gris_roi[mascara_circ == 255]
        
        # Binarización DINÁMICA: calcular el brillo medio del círculo gris
        pixeles_centro = gris_roi[mascara_circ == 255]
        brillo_mediano = np.median(pixeles_centro)
        # El texto siempre es más brillante que el fondo gris. Usamos el brillo mediano + 15.
        umbral_dinamico = min(brillo_mediano + 15, 220) # tope en 220 por seguridad
        
        _, binario = cv2.threshold(gris_roi_limpio, umbral_dinamico, 255, cv2.THRESH_BINARY)
        
        # INVERTIR: El OCR funciona mejor con texto NEGRO sobre fondo BLANCO
        binario = cv2.bitwise_not(binario)
        
        # Agregar padding blanco alrededor (el OCR necesita espacio para leer mejor)
        padding = 20
        binario = cv2.copyMakeBorder(binario, padding, padding, padding, padding, 
                                      cv2.BORDER_CONSTANT, value=255)
        
        # Guardar debug de cada círculo
        debug_path = os.path.join(DEBUG_DIR, f"circulo_{idx}.png")
        cv2.imwrite(debug_path, binario)
        
        # Leer el número con OCR (umbrales bajos para detectar dígitos simples como 4, 8)
        resultados = reader.readtext(binario, allowlist='0123456789', detail=1, paragraph=False,
                                      text_threshold=0.3, low_text=0.3)
        
        numero_leido = None
        mejor_confianza = 0.0
        
        for (bbox, texto, confianza) in resultados:
            texto_limpio = texto.strip()
            
            # El número 6 (solo) casi siempre es interpretado como un 0 por EasyOCR
            # Como no existe el jugador "0", lo mapeamos automáticamente al 6.
            if texto_limpio == '0' and confianza > 0.60:
                texto_limpio = '6'
                
            if texto_limpio.isdigit():
                num = int(texto_limpio)
                if 1 <= num <= 60 and confianza > mejor_confianza and confianza > 0.45:
                    numero_leido = num
                    mejor_confianza = confianza
                    
        # FALLBACK PARA EL NÚMERO 1: EasyOCR falla con líneas verticales simples.
        # Si no detectó nada, revisamos si la forma del texto parece un "1"
        if numero_leido is None:
            # Invertir binario para obtener el texto como blanco
            texto_blanco = cv2.bitwise_not(binario)
            cnts, _ = cv2.findContours(texto_blanco, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if cnts:
                c_max = max(cnts, key=cv2.contourArea)
                x_b, y_b, w_b, h_b = cv2.boundingRect(c_max)
                # Un "1" es alto y estrecho (alto es más del doble del ancho)
                if h_b > 25 and h_b > 2.2 * w_b:
                    numero_leido = 1
                    mejor_confianza = 0.99
        
        if numero_leido is not None and numero_leido not in ids_encontrados:
            ids_encontrados.add(numero_leido)
            
            abs_x = circ['cx'] + map_x_start
            abs_y = circ['cy'] + map_y_start
            
            # Determinar en qué zona está el jugador
            zona_actual = "Desconocida"
            for z in zonas_definidas:
                pts = np.array(z["points"], np.float32)
                # pointPolygonTest devuelve > 0 si está dentro, = 0 si está en el borde
                if cv2.pointPolygonTest(pts, (float(abs_x), float(abs_y)), False) >= 0:
                    zona_actual = z["name"]
                    break
            
            print(f"   >> JUGADOR #{numero_leido} detectado en X:{abs_x} Y:{abs_y} [Zona: {zona_actual}] (Confianza: {mejor_confianza:.2f})")
            
            jugador_info = {
                "id": int(numero_leido), 
                "x": int(abs_x), 
                "y": int(abs_y), 
                "zona": str(zona_actual)
            }
            jugadores_detectados.append(jugador_info)
            
            # Dibujar recuadro verde y número
            cv2.rectangle(output, 
                         (map_x_start + x, map_y_start + y), 
                         (map_x_start + x + w_c, map_y_start + y + h_c), 
                         (0, 255, 0), 2)
            cv2.putText(output, str(numero_leido), (abs_x + 10, abs_y + 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        else:
            # Dibujar en amarillo los círculos que detectó pero no pudo leer
            cv2.rectangle(output, 
                         (map_x_start + x, map_y_start + y), 
                         (map_x_start + x + w_c, map_y_start + y + h_c), 
                         (0, 255, 255), 1)
            if numero_leido is None:
                cv2.putText(output, "?", (circ['cx'] + map_x_start + 5, circ['cy'] + map_y_start + 5), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

    return output, jugadores_detectados

def main():
    with open("trace.txt", "w") as f: f.write("-> Iniciando MAIN\n")
    
    # Verificar si hay plantillas antes de empezar
    plantillas = [f for f in os.listdir(TEMPLATES_DIR) if f.endswith(".png")]
    if not plantillas:
        print("\n[ATENCION] No se encontraron imagenes de plantilla en la carpeta 'templates'.")
        print("Por favor, sigue las instrucciones para crear jugador_1.png, jugador_2.png, etc.")
    
    print("\n===================================================")
    print("ESCANER CONTINUO INICIADO (Ctrl+C para detener)")
    print("===================================================\n")
    
    ciclo = 1
    while True:
        try:
            print(f"\n--- [ CICLO DE ESCANEO #{ciclo} ] ---")
            img = capture_screen()
            with open("trace.txt", "a") as f: f.write(f"-> Capture screen finalizado (ciclo {ciclo})\n")
            
            resultado_img, jugadores = detect_players_by_template(img)
            
            # Guardar la imagen de depuración
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            out_filename = os.path.join(base_dir, "vision_debug.png")
            cv2.imwrite(out_filename, resultado_img)
            
            if jugadores:
                print("\n=== JUGADORES DETECTADOS ===")
                for j in jugadores:
                    print(f"   Butaca #{j['id']} -> Posicion ({j['x']}, {j['y']}) en Zona: {j.get('zona', 'Desconocida')}")
                
                print("\n=== ENVIANDO DATOS A DISCORD ===")
                try:
                    payload = {"players": jugadores, "guildId": "1454092469221458024"}
                    response = requests.post("http://localhost:3001/api/proximity", json=payload, timeout=5)
                    if response.status_code == 200:
                        print("✅ Datos enviados con éxito al bot.")
                    else:
                        print(f"⚠️ El bot respondió con error: {response.status_code}")
                except Exception as req_e:
                    print(f"❌ Error conectando con el bot: {req_e}")
                    
            else:
                print("No se identificaron jugadores.")
                
            print("Esperando 2 segundos para el siguiente escaneo...")
            time.sleep(2)
            ciclo += 1
            
        except KeyboardInterrupt:
            print("\nDeteniendo escáner...")
            break
        except Exception as e:
            print(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
            time.sleep(2)

if __name__ == "__main__":
    main()

