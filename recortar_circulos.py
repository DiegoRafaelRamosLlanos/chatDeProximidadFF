import cv2
import numpy as np
import os
import shutil

# Rutas
TEMPLATES_DIR = "templates"
BACKUP_DIR = "templates_respaldo"

def main():
    print("Iniciando recorte circular de plantillas...")
    
    # Crear carpeta de respaldo si no existe
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        
    archivos = [f for f in os.listdir(TEMPLATES_DIR) if f.startswith("jugador_") and f.endswith(".png")]
    
    if not archivos:
        print("No se encontraron plantillas para procesar.")
        return
        
    for filename in archivos:
        filepath = os.path.join(TEMPLATES_DIR, filename)
        backup_path = os.path.join(BACKUP_DIR, filename)
        
        # 1. Hacer una copia de seguridad (solo si no existe ya)
        if not os.path.exists(backup_path):
            shutil.copy2(filepath, backup_path)
            
        # 2. Leer la imagen
        # Usamos cv2.IMREAD_UNCHANGED para mantener el canal Alpha si ya lo tiene
        img = cv2.imread(filepath, cv2.IMREAD_UNCHANGED)
        
        if img is None:
            print(f"Error al leer {filename}")
            continue
            
        h, w = img.shape[:2]
        
        # Si la imagen no tiene canal alpha (transparencia), se lo agregamos
        if len(img.shape) == 3 and img.shape[2] == 3:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
            
        # 3. Crear la mascara circular
        # Hacemos una matriz de ceros (completamente transparente)
        mascara = np.zeros((h, w), dtype=np.uint8)
        
        # Calculamos el centro y el radio
        centro_x, centro_y = w // 2, h // 2
        # El radio será un poquito menos de la mitad del ancho/alto para asegurar que quitamos los bordes
        radio = min(w, h) // 2
        
        # Dibujamos un círculo blanco (255) relleno en la máscara
        cv2.circle(mascara, (centro_x, centro_y), radio, 255, -1)
        
        # 4. Aplicar la mascara al canal alpha de la imagen
        # El canal alpha es el indice 3 (BGRA: 0=B, 1=G, 2=R, 3=Alpha)
        img[:, :, 3] = mascara
        
        # 5. Guardar la imagen sobreescribiendo la original en /templates
        cv2.imwrite(filepath, img)
        print(f" -> {filename} recortado en círculo exitosamente.")

    print("\n¡Proceso terminado! Tus plantillas ahora son círculos perfectos con esquinas transparentes.")
    print(f"Nota: Se guardó una copia de tus imágenes originales cuadradas en la carpeta '{BACKUP_DIR}'.")

if __name__ == "__main__":
    main()
