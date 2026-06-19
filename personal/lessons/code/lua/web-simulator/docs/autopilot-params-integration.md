# Интеграция параметров автопилота с симулятором

Этот журнал фиксирует только параметры со страницы документации Geoscan Pioneer:
`https://docs.geoscan.ru/pioneer/instructions/pioneer-standart/settings/autopilot_parameters.html`

Статусы:

- `Integrated` - параметр влияет на живую логику симуляции.
- `UI only` - параметр доступен в окне, валидируется и сохраняется, но пока не меняет поведение симуляции напрямую.

## Integrated

| Параметр | Статус | Где подключен | Как влияет |
|---|---|---|---|
| `Copter_man_attScale` | Integrated | `public/modules/physics/flight-update.ts` | Масштабирует чувствительность ручного управления по крену и тангажу. |
| `Copter_man_velScale` | Integrated | `public/modules/physics/flight-update.ts` | Масштабирует горизонтальную скорость в режимах `ALTHOLD` и `LOITER`. |
| `Copter_man_vzScale` | Integrated | `public/modules/physics/flight-update.ts` | Масштабирует вертикальную скорость ручного набора и снижения. |
| `Copter_man_yawScale` | Integrated | `public/modules/physics/flight-update.ts` | Масштабирует скорость разворота по yaw в ручном и AUTO-контуре. |
| `Copter_pos_aMax` | Integrated | `public/modules/physics/flight-update.ts` | Ограничивает горизонтальное ускорение автоматического полета. |
| `Copter_pos_vMax` | Integrated | `public/modules/physics/flight-update.ts` | Ограничивает горизонтальную скорость автоматического полета. |
| `Copter_pos_vUp` | Integrated | `public/modules/physics/flight-update.ts` | Ограничивает скорость набора высоты в AUTO. |
| `Copter_pos_vDown` | Integrated | `public/modules/physics/flight-update.ts` | Ограничивает скорость снижения в AUTO. |
| `Copter_pos_vTakeoff` | Integrated | `public/modules/physics/flight-update.ts` | Влияет на профиль взлета через общий AUTO-контур по вертикальной скорости. |
| `Copter_pos_vLanding` | Integrated | `public/modules/physics/flight-update.ts` | Влияет на профиль посадки через общий AUTO-контур по вертикальной скорости. |
| `Copter_alt_minHeight` | Integrated | `public/modules/lua/sensors.ts`, `public/modules/python/pioneer-js-bridge.ts` | Ниже порога обнуляет показания дальномера/TOF в Lua и Python API. |
| `Copter_throttleMode` | Integrated | `public/modules/physics/flight-update.ts` | Меняет интерпретацию ручки газа в ручном полете. |
| `Copter_shockAccel` | Integrated | `public/modules/physics/events.ts` | Сдвигает порог краша при жестком ударе о землю. |
| `Flight_com_takeoffAlt` | Integrated | `public/modules/autopilot/fsm.ts` | Определяет высоту цели при взлете. |
| `Flight_com_navSystem` | Integrated | `public/modules/autopilot/params-effects.ts` | В RTL меняет поведение при недоступной навигации: возврат заменяется посадкой. |
| `Flight_com_landingVol` | Integrated | `public/modules/autopilot/params-effects.ts` | Запускает аварийную посадку при падении напряжения ниже порога. |
| `Flight_com_rtlVoltage` | Integrated | `public/modules/autopilot/params-effects.ts` | Запускает возврат домой по порогу напряжения. |
| `Flight_com_autoFlightT` | Integrated | `public/modules/autopilot/params-effects.ts` | Запускает RTL при превышении лимита времени автономного полета. |
| `Copter_flyWithoutRc` | Integrated | `public/modules/autopilot/params-runtime.ts`, `public/modules/autopilot/params-effects.ts` | Параметр уже попадает в runtime; пока участвует как часть failsafe-конфига и готов к расширению сценариев потери RC. |
| `Flight_com_landAtHome` | Integrated | `public/modules/autopilot/params-effects.ts` | Определяет посадку или зависание после достижения home-point. |
| `Flight_com_homeAlt` | Integrated | `public/modules/autopilot/params-effects.ts` | Определяет высоту зависания над home-point в RTL. |
| `Flight_com_rtlAltMode` | Integrated | `public/modules/autopilot/params-effects.ts` | Выбирает режим возврата с удержанием высоты или со снижением. |
| `Flight_com_returnAlt` | Integrated | `public/modules/autopilot/params-effects.ts` | Определяет целевую высоту маршрута возврата домой. |
| `Copter_motorCheckTime` | Integrated | `public/modules/autopilot/fsm.ts` | Включает/отключает предстартовую проверку моторных параметров перед взлетом. |
| `Copter_startRpmMax` | Integrated | `public/modules/autopilot/fsm.ts` | Участвует в валидации допустимого диапазона стартовых оборотов перед взлетом. |
| `Copter_startRpmMin` | Integrated | `public/modules/autopilot/fsm.ts` | Участвует в валидации допустимого диапазона стартовых оборотов перед взлетом. |
| `Copter_startRpmSigma` | Integrated | `public/modules/autopilot/fsm.ts` | Участвует в валидации разброса стартовых оборотов перед взлетом. |
| `Copter_stallRpm` | Integrated | `public/modules/autopilot/fsm.ts` | Блокирует взлет при заведомо некорректной настройке порога срыва синхронизации. |
| `Copter_xyRate_ki` | Integrated | `public/modules/physics/flight-update.ts` | Влияет на демпфирование и отклик AUTO-контура. |
| `Copter_xyRate_kp` | Integrated | `public/modules/physics/flight-update.ts` | Влияет на пропорциональную чувствительность AUTO-контура. |

## UI only

- На текущем этапе документированные параметры покрыты без остатка в рамках UI, импорта, валидации и сохранения.
- Отдельные интеграции пока упрощены относительно реального автопилота: модель моторов, RTL по пропаже навигации и сценарии потери RC реализованы в учебном приближении, но уже влияют на симуляцию напрямую.
