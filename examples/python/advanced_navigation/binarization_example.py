import cv2

# ... (получение кадра frame) ...
gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

# Адаптивный порог: (src, maxValue, adaptiveMethod, thresholdType, blockSize, C)
binary = cv2.adaptiveThreshold(gray, 255, 
    cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
    cv2.THRESH_BINARY_INV, 7, 2)
