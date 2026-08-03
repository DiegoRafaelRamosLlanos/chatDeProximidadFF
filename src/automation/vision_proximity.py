import cv2
import numpy as np
import mss
import os
import time
import easyocr

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
    print("Tienes 10 segundos para abrir el juego con el mapa grande...")
    for i in range(10, 0, -1):
        print(f"   {i}...")
        time.sleep(1)
        
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
    map_x_start = int(w * 0.48)
    map_y_start = int(h * 0.05)
    map_x_end = int(w * 0.98)
    map_y_end = int(h * 0.92)
    
    map_region = img[map_y_start:map_y_end, map_x_start:map_x_end]
    output = img.copy()
    
    print(f"Area del mapa recortada: {map_region.shape[1]}x{map_region.shape[0]} px")
    
    # Rectangulo azul del area de busqueda
    cv2.rectangle(output, (map_x_start, map_y_start), (map_x_end, map_y_end), (255, 0, 0), 2)
    
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
            
            print(f"   >> JUGADOR #{numero_leido} detectado en X:{abs_x} Y:{abs_y} (Confianza OCR: {mejor_confianza:.2f})")
            
            jugador_info = {"id": numero_leido, "x": abs_x, "y": abs_y}
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
    try:
        # Verificar si hay plantillas antes de tomar la captura
        plantillas = [f for f in os.listdir(TEMPLATES_DIR) if f.endswith(".png")]
        if not plantillas:
            print("\n[ATENCION] No se encontraron imagenes de plantilla en la carpeta 'templates'.")
            print("Por favor, sigue las instrucciones para crear jugador_1.png, jugador_2.png, etc.")
            print("Guardaremos una captura de pantalla actual para que puedas recortarlas.")
            
        img = capture_screen()
        with open("trace.txt", "a") as f: f.write("-> Capture screen finalizado, iniciando deteccion\n")
        
        resultado_img, jugadores = detect_players_by_template(img)
        
        with open("trace.txt", "a") as f: f.write("-> Deteccion finalizada, guardando imagen\n")

        # Usar ruta absoluta estricta para evitar problemas
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        out_filename = os.path.join(base_dir, "vision_debug.png")
        exito = cv2.imwrite(out_filename, resultado_img)
        
        # Crear un archivo de texto como prueba de que llegó hasta aquí
        with open(os.path.join(base_dir, "exito.txt"), "w") as f:
            f.write(f"Guardado exitoso: {exito}\nRuta: {out_filename}")
        
        if not exito:
            print(f"ALERTA: No se pudo guardar {out_filename}. ¿Está abierto en otro programa?")
            
        print(f"\nImagen principal guardada en: {out_filename}")
        
        if jugadores:
            print("\n=== JUGADORES DETECTADOS ===")
            for j in jugadores:
                print(f"   Butaca #{j['id']} -> Posicion ({j['x']}, {j['y']})")
            
            print("\n=== DISTANCIAS ENTRE JUGADORES ===")
            for i in range(len(jugadores)):
                for j in range(i+1, len(jugadores)):
                    dx = jugadores[i]['x'] - jugadores[j]['x']
                    dy = jugadores[i]['y'] - jugadores[j]['y']
                    dist = (dx**2 + dy**2) ** 0.5
                    cercanos = " << CERCANOS!" if dist < 100 else ""
                    print(f"   #{jugadores[i]['id']} <-> #{jugadores[j]['id']}: {dist:.0f} px{cercanos}")
        else:
            print("\nNo se identificaron jugadores.")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        with open("crash_log.txt", "w") as f:
            f.write(traceback.format_exc())
        traceback.print_exc()

if __name__ == "__main__":
    main()

