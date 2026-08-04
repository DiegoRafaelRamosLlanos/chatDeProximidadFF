import tkinter as tk
from PIL import Image, ImageTk
import mss
import os
import json
import time

print("Tienes 10 segundos para abrir el juego y maximizar el mapa...")
for i in range(10, 0, -1):
    print(f"Tomando foto en {i}...")
    time.sleep(1)

print("Tomando captura de pantalla del juego...")
with mss.mss() as sct:
    screenshot = sct.grab(sct.monitors[1]) # Captura el monitor principal
    img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
    
class CalibratorUI:
    def __init__(self, master, img):
        self.master = master
        self.master.attributes("-fullscreen", True)
        self.master.title("Calibrador de Mapa Grande")
        
        self.canvas = tk.Canvas(master, cursor="cross")
        self.canvas.pack(fill="both", expand=True)
        
        self.tk_img = ImageTk.PhotoImage(img)
        self.canvas.create_image(0, 0, anchor="nw", image=self.tk_img)
        
        self.start_x = None
        self.start_y = None
        self.rect = None
        
        self.canvas.bind("<ButtonPress-1>", self.on_press)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_release)
        
        # Instrucciones en pantalla
        self.canvas.create_rectangle(10, 10, 500, 80, fill="black", stipple="gray50")
        self.canvas.create_text(20, 20, anchor="nw", text="DIBUJA UN CUADRADO SOBRE EL MAPA GRANDE", fill="white", font=("Arial", 12, "bold"))
        self.canvas.create_text(20, 50, anchor="nw", text="Este será el cuadrado azul. Haz clic, arrastra y suelta para seleccionar. (Presiona ESC para salir)", fill="white", font=("Arial", 10))
        
        self.master.bind("<Escape>", lambda e: self.master.destroy())

    def on_press(self, event):
        self.start_x = event.x
        self.start_y = event.y
        if self.rect:
            self.canvas.delete(self.rect)
        self.rect = self.canvas.create_rectangle(self.start_x, self.start_y, self.start_x, self.start_y, outline="blue", width=3)

    def on_drag(self, event):
        cur_x, cur_y = (event.x, event.y)
        self.canvas.coords(self.rect, self.start_x, self.start_y, cur_x, cur_y)

    def on_release(self, event):
        end_x, end_y = (event.x, event.y)
        
        left = min(self.start_x, end_x)
        top = min(self.start_y, end_y)
        right = max(self.start_x, end_x)
        bottom = max(self.start_y, end_y)
        
        width = right - left
        height = bottom - top
        
        if width > 10 and height > 10:
            print(f"\n¡Coordenadas obtenidas!")
            coords = {
                "map_x_start": left,
                "map_y_start": top,
                "map_x_end": right,
                "map_y_end": bottom
            }
            print(coords)
            
            # Guardar en archivo JSON
            os.makedirs("data", exist_ok=True)
            with open("data/map_coords.json", "w") as f:
                json.dump(coords, f, indent=4)
                
            print("\nCoordenadas guardadas en data/map_coords.json. Cerrando ventana...")
            self.master.destroy()

root = tk.Tk()
app = CalibratorUI(root, img)
root.mainloop()
