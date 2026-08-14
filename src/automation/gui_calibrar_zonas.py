import tkinter as tk
from tkinter import simpledialog
from PIL import Image, ImageTk
import mss
import os
import json
import time

print("Tienes 10 segundos para abrir el juego y maximizar el mapa...")
for i in range(10, 0, -1):
    print(f"Tomando foto en {i}...")
    time.sleep(1)

print("Tomando captura de pantalla...")
with mss.mss() as sct:
    screenshot = sct.grab(sct.monitors[1]) # Captura el monitor principal
    img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")

class CalibratorZonasUI:
    def __init__(self, master, img):
        self.master = master
        self.master.attributes("-fullscreen", True)
        self.master.title("Calibrador de Zonas")
        
        self.canvas = tk.Canvas(master, cursor="cross")
        self.canvas.pack(fill="both", expand=True)
        
        self.tk_img = ImageTk.PhotoImage(img)
        self.canvas.create_image(0, 0, anchor="nw", image=self.tk_img)
        
        # Estado actual
        self.zonas = [] # Lista de diccionarios: {"name": "...", "points": [(x,y), ...]}
        self.current_polygon = [] # Puntos del polígono actual
        self.current_lines = [] # Referencias a las líneas dibujadas
        
        # Cargar zonas existentes si las hay
        self.zonas_file = "data/zonas.json"
        if os.path.exists(self.zonas_file):
            try:
                with open(self.zonas_file, "r") as f:
                    self.zonas = json.load(f)
            except:
                self.zonas = []
                
        self.draw_all_zonas()
        
        # Eventos
        self.canvas.bind("<ButtonPress-1>", self.on_left_click)   # Añadir punto
        self.canvas.bind("<ButtonPress-3>", self.on_right_click)  # Cerrar polígono
        self.master.bind("<Return>", self.save_and_exit)          # Guardar y salir
        self.master.bind("<Delete>", self.undo_last_zona)         # Deshacer última zona
        self.master.bind("<Escape>", lambda e: self.master.destroy()) # Cancelar
        
        # Instrucciones
        self.canvas.create_rectangle(10, 10, 550, 110, fill="black", stipple="gray50")
        self.canvas.create_text(20, 20, anchor="nw", text="DIBUJA ZONAS EN EL MAPA (Polígonos)", fill="white", font=("Arial", 12, "bold"))
        self.canvas.create_text(20, 45, anchor="nw", text="• CLIC IZQUIERDO: Añadir punto al borde de la zona.", fill="white", font=("Arial", 10))
        self.canvas.create_text(20, 60, anchor="nw", text="• CLIC DERECHO: Cerrar la zona y ponerle nombre.", fill="white", font=("Arial", 10))
        self.canvas.create_text(20, 75, anchor="nw", text="• TECLA SUPRIMIR: Borrar la última zona guardada.", fill="white", font=("Arial", 10))
        self.canvas.create_text(20, 90, anchor="nw", text="• TECLA ENTER: Guardar todas las zonas y salir. (ESC para cancelar)", fill="yellow", font=("Arial", 10, "bold"))

    def draw_all_zonas(self):
        # Dibujar las zonas que ya están guardadas
        for zona in self.zonas:
            pts = zona["points"]
            if len(pts) > 2:
                # Aplanar la lista de tuplas para create_polygon
                flat_pts = [coord for pt in pts for coord in pt]
                self.canvas.create_polygon(flat_pts, outline="green", fill="", width=2)
                # Dibujar el nombre en el centro aproximado
                cx = sum(p[0] for p in pts) / len(pts)
                cy = sum(p[1] for p in pts) / len(pts)
                self.canvas.create_text(cx, cy, text=zona["name"], fill="green", font=("Arial", 12, "bold"))

    def on_left_click(self, event):
        x, y = event.x, event.y
        self.current_polygon.append((x, y))
        
        # Dibujar un puntito
        self.canvas.create_oval(x-2, y-2, x+2, y+2, fill="red", outline="red", tags="current_temp")
        
        # Dibujar línea desde el punto anterior
        if len(self.current_polygon) > 1:
            px, py = self.current_polygon[-2]
            line = self.canvas.create_line(px, py, x, y, fill="red", width=2, tags="current_temp")
            self.current_lines.append(line)

    def on_right_click(self, event):
        if len(self.current_polygon) > 2:
            # Cerrar la línea visualmente
            px, py = self.current_polygon[-1]
            x0, y0 = self.current_polygon[0]
            self.canvas.create_line(px, py, x0, y0, fill="red", width=2, tags="current_temp")
            
            # Preguntar nombre
            nombre = simpledialog.askstring("Nombre de la Zona", "Ingresa el nombre para esta zona:")
            
            if nombre and nombre.strip():
                # Guardar la zona
                self.zonas.append({
                    "name": nombre.strip(),
                    "points": list(self.current_polygon)
                })
            
            # Limpiar lo temporal y volver a dibujar todo
            self.canvas.delete("current_temp")
            self.current_polygon = []
            self.current_lines = []
            self.draw_all_zonas()
        else:
            print("Necesitas al menos 3 puntos para cerrar una zona.")
            self.canvas.delete("current_temp")
            self.current_polygon = []

    def undo_last_zona(self, event):
        if self.zonas:
            eliminada = self.zonas.pop()
            print(f"Zona eliminada: {eliminada['name']}")
            # Borrar todo el canvas (excepto la imagen base y el texto) y redibujar
            self.canvas.delete("all")
            self.canvas.create_image(0, 0, anchor="nw", image=self.tk_img)
            
            # Re-dibujar instrucciones
            self.canvas.create_rectangle(10, 10, 550, 110, fill="black", stipple="gray50")
            self.canvas.create_text(20, 20, anchor="nw", text="DIBUJA ZONAS EN EL MAPA (Polígonos)", fill="white", font=("Arial", 12, "bold"))
            self.canvas.create_text(20, 45, anchor="nw", text="• CLIC IZQUIERDO: Añadir punto al borde de la zona.", fill="white", font=("Arial", 10))
            self.canvas.create_text(20, 60, anchor="nw", text="• CLIC DERECHO: Cerrar la zona y ponerle nombre.", fill="white", font=("Arial", 10))
            self.canvas.create_text(20, 75, anchor="nw", text="• TECLA SUPRIMIR: Borrar la última zona guardada.", fill="white", font=("Arial", 10))
            self.canvas.create_text(20, 90, anchor="nw", text="• TECLA ENTER: Guardar todas las zonas y salir. (ESC para cancelar)", fill="yellow", font=("Arial", 10, "bold"))

            self.draw_all_zonas()

    def save_and_exit(self, event):
        os.makedirs("data", exist_ok=True)
        with open(self.zonas_file, "w") as f:
            json.dump(self.zonas, f, indent=4)
        print(f"\n¡{len(self.zonas)} zonas guardadas en {self.zonas_file}!")
        self.master.destroy()

root = tk.Tk()
app = CalibratorZonasUI(root, img)
root.mainloop()
