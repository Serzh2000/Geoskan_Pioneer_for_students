import math
import time
import threading

class FlightGrader:
    def __init__(self, drone):
        self.drone = drone
        self.is_running = False
        self.log = []
        self.errors = []
        self.trajectory = []
        self.start_pos = None
        self.current_target = None
        
        # Допуски
        self.h_tol = 0.5 # Горизонтальный допуск (м)
        self.v_tol = 0.2 # Вертикальный допуск (м)
        self.y_tol = 10.0 # Допуск по рысканию (градусы)

    def start_mission(self):
        """Запускает логирование и мониторинг."""
        print("[Grader] Миссия началась. Запись траектории...")
        self.is_running = True
        self.start_pos = self._get_pos()
        self.monitor_thread = threading.Thread(target=self._monitor_loop)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()

    def set_target(self, x, y, z, yaw=None):
        """Устанавливает текущую цель для проверки допусков."""
        self.current_target = (x, y, z, yaw)
        print(f"[Grader] Новая цель установлена: ({x}, {y}, {z}, yaw={yaw})")

    def check_checkpoint(self, name):
        """Проверяет, находится ли текущая позиция в пределах допуска цели."""
        if not self.current_target:
            return
            
        pos = self._get_pos()
        if not pos:
            self.errors.append(f"[{name}] Не удалось получить позицию.")
            return

        x, y, z, yaw = pos
        tx, ty, tz, tyaw = self.current_target
        
        h_dist = math.sqrt((x - tx)**2 + (y - ty)**2)
        v_dist = abs(z - tz)
        
        status = "PASSED"
        if h_dist > self.h_tol:
            status = "FAILED"
            self.errors.append(f"[{name}] Горизонтальная ошибка {h_dist:.2f}м > {self.h_tol}м")
        if v_dist > self.v_tol:
            status = "FAILED"
            self.errors.append(f"[{name}] Вертикальная ошибка {v_dist:.2f}м > {self.v_tol}м")
            
        if tyaw is not None:
            dyaw = abs(yaw - tyaw)
            if dyaw > 180: dyaw = 360 - dyaw
            if dyaw > self.y_tol:
                status = "FAILED"
                self.errors.append(f"[{name}] Ошибка рыскания {dyaw:.1f} град > {self.y_tol} град")

        print(f"[Grader] Контрольная точка '{name}': {status} (Гор_ош={h_dist:.2f}, Верт_ош={v_dist:.2f})")
        self.log.append({'event': 'checkpoint', 'name': name, 'status': status, 'pos': pos})

    def finish_mission(self):
        """Останавливает мониторинг и выводит отчет."""
        self.is_running = False
        print("\n" + "="*30)
        print("ОТЧЕТ О МИССИИ")
        print("="*30)
        if not self.errors:
            print("УСПЕХ: Все проверки пройдены!")
        else:
            print("ОБНАРУЖЕНЫ ОШИБКИ:")
            for err in self.errors:
                print(f" - {err}")
        print("="*30 + "\n")

    def _get_pos(self):
        """
        Обертка для получения локальной позиции. 
        В реальном сценарии используйте drone.get_local_position_lps() или аналогичный метод.
        Здесь мы имитируем это, если симуляция недоступна.
        """
        if hasattr(self.drone, 'get_local_position_lps'):
            pos = self.drone.get_local_position_lps()
            if pos is not None:
                # Добавляем фиктивный yaw, если он не предоставляется
                return pos[0], pos[1], pos[2], 0.0 
        
        # Фоллбэк для симулятора/тестирования без реального LPS
        # Просто возвращаем цель, если она доступна (для демонстрации), или нули
        if self.current_target:
             # Добавляем немного шума для реалистичности, если бы это был симулятор
            return self.current_target[0], self.current_target[1], self.current_target[2], self.current_target[3] if self.current_target[3] else 0
        return 0, 0, 0, 0

    def _monitor_loop(self):
        while self.is_running:
            pos = self._get_pos()
            self.trajectory.append(pos)
            time.sleep(0.1)
