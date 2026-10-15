# Учебное пособие «Программирование дронов и создание автономных беспилотных миссий»

## Структура каталогов
- `tex/` — исходники LaTeX
  - `main.tex` — порядок глав
  - `styles/preamble.tex` — оформление, рамки, окружение `codefile`, титульный лист
  - `chapters/intro`, `chapters/start` — введение, аннотация, где писать код (симулятор и Pioneer Station)
  - `chapters/lua-language`, `chapters/lua-leds`, `chapters/lua-missions` — часть I (Lua)
  - `chapters/python`, `chapters/python-sdk` — часть II (Python) и часть III (навигация)
  - `chapters/appendix`, `chapters/rc_control` — приложения
  - `images/simulator/` — скриншоты симулятора (сделаны headless-Chrome-скриптом, см. ниже)
- `code/` — весь код, который вставляется в книгу окружением `\begin{codefile}{...}`
  - `code/lua/examples` — примеры глав (`02_sensors`, `04_language`, `05_leds`, `06_missions`)
  - `code/lua/tasks` — решения практических заданий (`05_leds`, `07_advanced_missions`)
  - `code/python/examples` — примеры Python: основы, `pioneer_sdk`, камера, ArUco, рой, навигация
  - `code/lua/web-simulator` — веб-симулятор (отдельный проект)
- `data/` — карты и словари маркеров для примеров навигации
- `build/` — результат сборки (`build/main.pdf`) и кэш minted

## Сборка
Нужны TeX Live 2024+ (XeLaTeX, minted v3, biber) и Python 3 с `pygments` и `latexminted`.

```bat
build.bat
```

Скрипт обновляет номер сборки, делает три прохода XeLaTeX и biber; результат — `build/main.pdf`.

## Проверка примеров
Каждый файл, на который ссылается книга, прогоняется в симуляторе:

```bash
cd code/lua/web-simulator
npm test -- tests/lessons-book-examples.test.ts
```

Тест читает `tex/main.tex`, собирает все `codefile`-ссылки и проверяет: Lua — в настоящем рантайме симулятора (программа не падает, предстартовый валидатор молчит, полётные примеры взлетают, проходят свои точки и садятся, `print` печатает ожидаемое); Python-основы — в CPython по выводу; примеры с `pioneer_sdk` — на поддельном SDK по трассе команд; примеры с камерой — хотя бы компилируются. Добавили пример в книгу — добавьте его ожидания в `LUA_EXPECTATIONS` или `PYTHON_EXPECTATIONS`.

После правок примеров обновите копию в симуляторе: `npm run sync-examples` в `code/lua/web-simulator`.

## Скриншоты
Скриншоты в `tex/images/simulator/` сняты с запущенного симулятора (`http://localhost:3011`) headless-Chrome-скриптом через протокол DevTools при DPR 2. Обложка `cover.png` — кадр полёта, обрезанный до 16:9.

## Документация API
- Справочник в самой книге — приложение «Справочник Lua API Пионера» и шпаргалка Lua/Python.
- Официальная документация: `vendor/pioneer-api-docs/index.html` в корне репозитория.
