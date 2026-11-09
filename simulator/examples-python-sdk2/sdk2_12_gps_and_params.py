from pioneer_sdk2 import Pioneer
from pioneer_sdk2.piosdk2 import NavSystem, NavStatus

pioneer = Pioneer()

try:
    # Система навигации читается из параметра автопилота.
    nav = pioneer.get_nav_system()
    print("Навигация:", nav.name)

    if nav == NavSystem.GPS:
        print("Координаты:", pioneer.get_global_position_gps())
        print("Спутники GPS и ГЛОНАСС:", pioneer.get_satellites_count())
        print("Статус GPS:", pioneer.get_nav_status_gps())
    else:
        # У Мини 2 в симуляторе локальная навигация (LPS), как в помещении.
        print("Статус LPS:", pioneer.get_nav_status_lps())
        print("Позиция:", pioneer.get_local_position_lps())
        # GPS-методы без GNSS-модуля печатают пояснение и возвращают None.
        if pioneer.get_global_position_gps() is None:
            print("GPS нет, летаем по локальным координатам")

    # Параметры автопилота: get_param читает, set_param пишет.
    print("flyWithoutRc до:", pioneer.get_param("Copter_flyWithoutRc"))
    if pioneer.set_param("Copter_flyWithoutRc", 1):
        print("flyWithoutRc после:", pioneer.get_param("Copter_flyWithoutRc"))
finally:
    pioneer.close_connection()
