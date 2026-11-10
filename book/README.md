# Учебное пособие «Программирование дронов и создание автономных беспилотных миссий»

Книга охватывает два дрона: Пионер Базовый (Lua и Python, `pioneer_sdk`) и Пионер Мини 2 (Python на борту: `pioneer_sdk2`, `pioneer_rknn`, блоки Pioneer Bricks; часть V: ROS 2 `gs_core` и рой `pioneer_swarm`).

## Структура каталогов
- `tex/` — исходники LaTeX
  - `main.tex` — порядок глав
  - `styles/preamble.tex` — оформление, рамки, окружение `codefile`, титульный лист
  - `styles/references.bib` — список литературы (biber)
  - `chapters/intro`, `chapters/start` — аннотация, введение, где писать код (симулятор, режим «Обучение», настоящие дроны)
  - `chapters/lua-language`, `chapters/lua-leds`, `chapters/lua-missions` — часть I (Lua, Базовый)
  - `chapters/python`, `chapters/python-sdk` — часть II (Python и `pioneer_sdk`, Базовый) и часть III (навигация)
  - `chapters/python-onboard` — Пионер Мини 2: `pioneer_sdk2`, `pioneer_rknn`, Bricks (часть IV)
  - `chapters/ros2-swarm` — часть V: ROS 2 (`rclpy`, пакет `gs_core`) и рой (`pioneer_swarm`, Swarm Kit); примеры — `examples/python-onboard/ros2` и `.../swarm`
  - `chapters/appendix`, `chapters/rc_control` — приложения
  - `images/simulator/` — скриншоты симулятора; `images/bricks/` — снимки среды Bricks
- `data/` — карты и словари маркеров для примеров навигации
- `build/` — результат сборки (`build/main.pdf`) и кэш minted; в git не хранится
- `main.pdf` — актуальная собранная книга (обновляется после сборки)

Код для книги лежит не здесь, а в [`../examples`](../examples): окружение `\begin{codefile}{...}` берёт файлы оттуда (`lua/...`, `lua-tasks/...`, `python/...`, `python-onboard/...`, в том числе `python-onboard/ros2/...` и `python-onboard/swarm/...`). Веб-симулятор лежит в [`../simulator`](../simulator).

## Сборка
Нужны TeX Live 2024+ (XeLaTeX, minted v3, biber) и Python 3 с `pygments` и `latexminted`.

```bat
build.bat
```

(из каталога `book`)

Скрипт обновляет номер сборки, делает три прохода XeLaTeX и biber; результат — `build/main.pdf`.

## Проверка примеров
Каждый файл, на который ссылается книга, прогоняется в симуляторе:

```bash
cd simulator
npm test -- tests/lessons-book-examples.test.ts
```

Тест читает `tex/main.tex`, собирает все `codefile`-ссылки и проверяет: Lua — в настоящем рантайме симулятора (программа не падает, предстартовый валидатор молчит, полётные примеры взлетают, проходят свои точки и садятся, `print` печатает ожидаемое); Python-основы — в CPython по выводу; примеры с `pioneer_sdk` — на поддельном SDK по трассе команд; примеры с камерой — хотя бы компилируются. Бортовые программы Мини 2 (`pioneer_sdk2`, `pioneer_rknn`) выполняются на поддельных библиотеках, примеры ROS 2 — на эмуляции `rclpy` и `ros_pioneer_node` (`tests/helpers/ros2-runtime.ts`), примеры роя (`pioneer_swarm`) проверяются на синтаксис здесь и по существу в `tests/swarm-examples.test.ts`, программы Bricks сверяются с Python, сгенерированным самой средой (`tests/fixtures/bricks`). Добавили пример в книгу — добавьте его ожидания в `LUA_EXPECTATIONS` или `PYTHON_EXPECTATIONS`.

После правок примеров обновите копию в симуляторе: `npm run sync-examples` в `simulator`. Полётные программы Мини 2, ROS 2 и роя на настоящем дроне не запускались.

## Режим «Обучение» и числа в тексте
Книга ссылается на номера миссий пяти треков симулятора: Blockly (16), Lua (93), Python (124), «Мини 2 · SDK2» (64 миссии в 19 главах: главы 1–13 — `pioneer_sdk2`, 14–17 — ROS 2, 18–19 — рой), «Мини 2 · Bricks» (16 в 8 главах). Если миссии добавятся, обновите таблицы в `chapters/start/02b_learning_mode.tex` и врезки «Миссии симулятора» в главах.

## Скриншоты
Скриншоты в `tex/images/simulator/` сняты с запущенного симулятора (`http://localhost:3011`) headless-Chrome-скриптом `tools/shots.mjs` через протокол DevTools при DPR 2 (светлая тема, экскурсия пропущена ключом `geoskan_onboarding_tour_v2`). Обложка `cover.png` — кадр полёта, обрезанный до 16:9. Все снимки перечитаны с интерфейса, где есть переключатель `Базовый / Мини 2`, пять треков обучения (Blockly 16, Lua 93, Python 124, Мини 2 · Python 37, Мини 2 · Bricks 16), Bricks и режим `Python · SDK1/SDK2`. Новые: `11-editor-mini2.png` (Мини 2, Python · SDK2), `12-bricks.png` (Bricks), `13-mission-map-sdk2.png` (карта миссий SDK2), `14-mission-tracks.png` (панель миссии с пятью треками). Снимки `04-mission-card.png` и `04-editor-mission.png` в тексте не используются; `09-textbook.png` удалён (экрана «Учебник пилота» в симуляторе больше нет). После правок интерфейса: запустить симулятор и выполнить `node book/tools/shots.mjs [имя.png ...]`, затем проверить выноски `\callout` в `chapters/start/02_simulator.tex` и `02b_learning_mode.tex` (положения заданы долями ширины и высоты снимка). Заведомо устареет при следующем изменении шапки редактора или панели миссии: `02-editor-lua.png`, `10-mission-step.png`.

## Документация API
- Справочник в самой книге — приложение «Справочник Lua API Пионера», шпаргалка Lua / `pioneer_sdk` / `pioneer_sdk2` (с таблицей ROS 2 и `pioneer_swarm`), справочник команд в конце главы про `pioneer_sdk2` и справочник `gs_core` в главе про ROS 2.
- Официальная документация Базового: `third-party/web-docs/pioneer-api-docs/index.html` в корне репозитория; Мини 2 — docs.geoscan.ru (см. список литературы).
