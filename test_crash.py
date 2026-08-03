import cv2
import numpy as np
import os
import sys

# Agregamos la ruta del proyecto al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.automation.vision_proximity import detect_player_circles

img = np.zeros((1080, 1920, 3), dtype=np.uint8)
cv2.circle(img, (960, 540), 20, (255, 255, 255), 2)

try:
    detect_player_circles(img)
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
