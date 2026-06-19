# Матрица покрытия параметров автопилота

Источник параметров: `pio-classic-newopt-stable-1.6.7178-1.properties`.
Источник описаний: `https://docs.geoscan.ru/pioneer/instructions/pioneer-standart/settings/autopilot_parameters.html`.

Принцип заполнения столбца "интегрирован ли параметр": учитывается только реальное влияние на поведение симулятора. Наличие параметра в UI, импорте `.properties`, валидации и локальном storage само по себе не считается интеграцией.

| Название параметра | Есть ли описание на сайте Geoscan | Интегрирован ли параметр в симулятор |
|---|---|---|
| `BoardPioneer_auxUMux` | Нет | Нет |
| `BoardPioneer_baudrate` | Нет | Нет |
| `BoardPioneer_logger` | Нет | Нет |
| `BoardPioneer_modules_actionCam` | Нет | Нет |
| `BoardPioneer_modules_gnss` | Нет | Нет |
| `BoardPioneer_modules_ultrasonic` | Нет | Нет |
| `BoardPioneer_radiocraft` | Нет | Нет |
| `BoardPioneer_scriptDelayMs` | Нет | Нет |
| `Board_number` | Нет | Нет |
| `Board_serial` | Нет | Нет |
| `Board_type` | Нет | Нет |
| `Board_version_major` | Нет | Нет |
| `Board_version_minor` | Нет | Нет |
| `Copter_alt_b` | Нет | Нет |
| `Copter_alt_heightOff` | Нет | Нет |
| `Copter_alt_i` | Нет | Нет |
| `Copter_alt_minHeight` | Да | Да, `public/modules/lua/sensors.ts`, `public/modules/python/pioneer-js-bridge.ts` |
| `Copter_alt_p` | Нет | Нет |
| `Copter_alt_wBaro` | Нет | Нет |
| `Copter_alt_wRange` | Нет | Нет |
| `Copter_alt_wRtk` | Нет | Нет |
| `Copter_flyWithoutRc` | Да | Да, `public/modules/autopilot/fsm.ts` |
| `Copter_landedState` | Нет | Нет |
| `Copter_man_attScale` | Да | Да, `public/modules/physics/flight-update.ts` |
| `Copter_man_flip` | Нет | Нет |
| `Copter_man_rcMode0` | Нет | Нет |
| `Copter_man_rcMode1` | Нет | Нет |
| `Copter_man_rcMode2` | Нет | Нет |
| `Copter_man_velScale` | Да | Да, `public/modules/physics/flight-update.ts` |
| `Copter_man_vzScale` | Да | Да, `public/modules/physics/flight-update.ts` |
| `Copter_man_yawScale` | Да | Да, `public/modules/physics/flight-update.ts` |
| `Copter_maxTakeoffAng` | Нет | Нет |
| `Copter_measureEndH` | Нет | Нет |
| `Copter_minPwm` | Нет | Нет |
| `Copter_motorCheckTime` | Да | Да, `public/modules/autopilot/fsm.ts` |
| `Copter_offHeight` | Нет | Нет |
| `Copter_optFlow_bandwidth` | Нет | Нет |
| `Copter_optFlow_maxHeight` | Нет | Нет |
| `Copter_optFlow_scale` | Нет | Нет |
| `Copter_overturnThr` | Нет | Нет |
| `Copter_pos_aMax` | Да | Да, `public/modules/physics/flight-update.ts` |
| `Copter_pos_decK` | Нет | Нет |
| `Copter_pos_decReg` | Нет | Нет |
| `Copter_pos_failSpeed` | Нет | Нет |
| `Copter_pos_ff0` | Нет | Нет |
| `Copter_pos_ff1` | Нет | Нет |
| `Copter_pos_ff2` | Нет | Нет |
| `Copter_pos_gpsK` | Нет | Нет |
| `Copter_pos_gpsT` | Нет | Нет |
| `Copter_pos_k` | Нет | Нет |
| `Copter_pos_magHeading` | Нет | Нет |
| `Copter_pos_maxAttitude` | Нет | Нет |
| `Copter_pos_maxError` | Нет | Нет |
| `Copter_pos_vDesc` | Нет | Нет |
| `Copter_pos_vDown` | Да | Да, `public/modules/physics/flight-update.ts` |
| `Copter_pos_vLanding` | Да | Да, `public/modules/physics/flight-update.ts` |
| `Copter_pos_vMax` | Да | Да, `public/modules/physics/flight-update.ts` |
| `Copter_pos_vTakeoff` | Да | Да, `public/modules/physics/flight-update.ts` |
| `Copter_pos_vUp` | Да | Да, `public/modules/physics/flight-update.ts` |
| `Copter_shockAccel` | Да | Да, `public/modules/physics/events.ts` |
| `Copter_stallRpm` | Да | Да, `public/modules/autopilot/fsm.ts` |
| `Copter_startRpmMax` | Да | Да, `public/modules/autopilot/fsm.ts` |
| `Copter_startRpmMin` | Да | Да, `public/modules/autopilot/fsm.ts` |
| `Copter_startRpmSigma` | Да | Да, `public/modules/autopilot/fsm.ts` |
| `Copter_throttleMode` | Да | Да, `public/modules/physics/flight-update.ts` |
| `Copter_windScaleAtt` | Нет | Нет |
| `Copter_windScaleCtl` | Нет | Нет |
| `Copter_windThreshold` | Нет | Нет |
| `Copter_xyRate_b0` | Нет | Нет |
| `Copter_xyRate_b1` | Нет | Нет |
| `Copter_xyRate_ki` | Да | Да, `public/modules/physics/flight-update.ts` |
| `Copter_xyRate_kp` | Да | Да, `public/modules/physics/flight-update.ts` |
| `Copter_xyRate_minRpm` | Нет | Нет |
| `Copter_xyRate_rateK` | Нет | Нет |
| `Copter_xyRate_rateLim` | Нет | Нет |
| `Copter_xyRate_test` | Нет | Нет |
| `Copter_xyRate_type` | Нет | Нет |
| `Copter_xyRate_wc` | Нет | Нет |
| `Copter_xyRate_wo` | Нет | Нет |
| `Copter_zRate_kp` | Нет | Нет |
| `Copter_zRate_p` | Нет | Нет |
| `Copter_zRate_wc` | Нет | Нет |
| `Flight_chargeMonitor_distance` | Нет | Нет |
| `Flight_chargeMonitor_velScale` | Нет | Нет |
| `Flight_com_autoFlightT` | Да | Да, `public/modules/autopilot/params-effects.ts` |
| `Flight_com_autoLandRad` | Нет | Нет |
| `Flight_com_descThr` | Нет | Нет |
| `Flight_com_engineMaxT` | Нет | Нет |
| `Flight_com_failMaxRoll` | Нет | Нет |
| `Flight_com_flyAreaSize` | Нет | Нет |
| `Flight_com_gnssSearchT` | Нет | Нет |
| `Flight_com_groundSpeed` | Нет | Нет |
| `Flight_com_homeAlt` | Да | Да, `public/modules/autopilot/params-effects.ts` |
| `Flight_com_landAtHome` | Да | Да, `public/modules/autopilot/params-effects.ts` |
| `Flight_com_landingAlt` | Упоминается без отдельного описания | Да, `public/modules/physics/flight-update.ts` |
| `Flight_com_landingVol` | Да | Да, `public/modules/autopilot/params-effects.ts` |
| `Flight_com_maxAltitude` | Нет | Нет |
| `Flight_com_navMaxPitch` | Нет | Нет |
| `Flight_com_navMaxRoll` | Нет | Нет |
| `Flight_com_navMinPitch` | Нет | Нет |
| `Flight_com_navSystem` | Да | Да, `public/modules/autopilot/params-effects.ts` |
| `Flight_com_returnAlt` | Да | Да, `public/modules/autopilot/params-effects.ts` |
| `Flight_com_rtlAltMode` | Да | Да, `public/modules/autopilot/params-effects.ts` |
| `Flight_com_rtlCharge` | Нет | Нет |
| `Flight_com_rtlVoltage` | Да | Да, `public/modules/autopilot/params-effects.ts` |
| `Flight_com_takeoffAlt` | Да | Да, `public/modules/autopilot/fsm.ts` |
| `Flight_man_timeout` | Нет | Нет |
| `Flight_mission_cmds` | Нет | Нет |
| `Flight_mission_indices` | Нет | Нет |
| `Flight_mission_points` | Нет | Нет |
| `ICM20689_accelRange` | Нет | Нет |
| `ICM20689_bandwidth` | Нет | Нет |
| `ICM20689_filter_t0` | Нет | Нет |
| `ICM20689_filter_t1` | Нет | Нет |
| `ICM20689_gyroRange` | Нет | Нет |
| `ICM20689_sampleRate` | Нет | Нет |
| `Imu_accKp` | Нет | Нет |
| `Imu_defaultSpeed` | Нет | Нет |
| `Imu_ejectDuration` | Нет | Нет |
| `Imu_ejectSensitivity` | Нет | Нет |
| `Imu_gpsEnabled` | Нет | Нет |
| `Imu_gpsKp` | Нет | Нет |
| `Imu_gyroCalibration` | Нет | Нет |
| `Imu_magCalibAlpha` | Нет | Нет |
| `Imu_magCalibration` | Нет | Нет |
| `Imu_magEnabled` | Нет | Нет |
| `Imu_magKp` | Нет | Нет |
| `Imu_maxSpeed` | Нет | Нет |
| `Imu_minSpeed` | Нет | Нет |
| `Imu_temperature` | Нет | Нет |
| `Imu_useAirSpeed` | Нет | Нет |
| `Imu_useMagHeading` | Нет | Нет |
| `Imu_useRisingEdge` | Нет | Нет |
| `Logger_attitude` | Нет | Нет |
| `Logger_controls` | Нет | Нет |
| `Logger_gnss` | Нет | Нет |
| `Logger_imu` | Нет | Нет |
| `Logger_mag` | Нет | Нет |
| `Logger_nav` | Нет | Нет |
| `Logger_other` | Нет | Нет |
| `Logger_position` | Нет | Нет |
| `Logger_power` | Нет | Нет |
| `Logger_pressure` | Нет | Нет |
| `Logger_reducedLog` | Нет | Нет |
| `Modules_debug` | Нет | Нет |
| `Modules_declination` | Нет | Нет |
| `Modules_logfile` | Нет | Нет |
| `Modules_lua` | Нет | Нет |
| `Modules_simulator` | Нет | Нет |
| `Modules_zones` | Нет | Нет |
| `RC11xx_channel` | Нет | Нет |
| `RC11xx_netId` | Нет | Нет |
| `RC11xx_power` | Нет | Нет |
| `RC11xx_rate` | Нет | Нет |
| `SensorMux_gnss` | Нет | Нет |
| `SensorMux_imu` | Нет | Нет |
| `SensorMux_lns` | Нет | Нет |
| `SensorMux_mag` | Нет | Нет |
| `SensorMux_power` | Нет | Нет |
| `SensorMux_pressure_diff` | Нет | Нет |
| `SensorMux_pressure_stat` | Нет | Нет |
| `Sensors_accel_samples` | Нет | Нет |
| `Sensors_accel_threshold` | Нет | Нет |
| `Sensors_airspeed_enabled` | Нет | Нет |
| `Sensors_airspeed_pitotMax` | Нет | Нет |
| `Sensors_airspeed_pitotMin` | Нет | Нет |
| `Sensors_airspeed_scale` | Нет | Нет |
| `Sensors_airspeed_temperature` | Нет | Нет |
| `Sensors_gyro_calibrate` | Нет | Нет |
| `Sensors_gyro_delay` | Нет | Нет |
| `Sensors_gyro_samples` | Нет | Нет |
| `Sensors_gyro_threshold` | Нет | Нет |
| `Sensors_gyro_tolerance` | Нет | Нет |
| `Sensors_gyro_variance` | Нет | Нет |
| `Sensors_mag_count` | Нет | Нет |
| `Sensors_mag_tolerance` | Нет | Нет |
| `Sensors_ns_autoselect` | Нет | Нет |
| `Sensors_pressure_delay` | Нет | Нет |
| `Sensors_pressure_filtering` | Нет | Нет |
| `Sensors_pressure_samples` | Нет | Нет |
| `Sensors_rates_accel` | Нет | Нет |
| `Sensors_rates_baro` | Нет | Нет |
| `Sensors_rates_compass` | Нет | Нет |
| `Sensors_rates_gps` | Нет | Нет |
| `Sensors_rates_gyro` | Нет | Нет |
| `Sensors_rates_ppm` | Нет | Нет |
| `State_lastPoint` | Нет | Нет |
| `State_state` | Нет | Нет |
| `Telemetry_debug` | Нет | Нет |
| `Telemetry_high` | Нет | Нет |
| `Telemetry_low` | Нет | Нет |
| `Telemetry_medium` | Нет | Нет |
| `Telemetry_stream` | Нет | Нет |

Примечание: почти все параметры из файла уже доступны в окне настройки и корректно импортируются через `public/modules/ui/settings/autopilot-params-model.ts`, но в таблице выше это не считается поведенческой интеграцией.
