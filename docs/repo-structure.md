# Структура репозитория: что не так и как привести в порядок

Документ описывает текущее состояние, целевую структуру, таблицу переноса и порядок миграции. Ничего из переноса пока **не выполнено**: пути на этих каталогах зашиты в CI, тестах, LaTeX и конфигах, поэтому сначала согласуем план.

## Что сейчас мешает

| Проблема | Где | Чем плохо |
|---|---|---|
| Главный продукт спрятан на 7 уровней вглубь | `personal/lessons/code/lua/web-simulator` | Симулятор давно умеет Lua, Python и Blockly, при этом лежит в «lua» внутри «lessons» внутри «personal». Новичок его не найдёт. |
| Каталог `personal` ничего не значит | `personal/lessons/...` | Один подкаталог внутри, имя говорит «чьё», а не «что». |
| Три копии примеров | `personal/lessons/code/lua/examples`, `code/python/examples`, `web-simulator/examples`, `web-simulator/examples-python` | Книга берёт примеры из первых двух, симулятор из копий, копии обновляет скрипт `sync-examples`. Легко отредактировать не ту. |
| Результаты сборки в git | `personal/lessons/build` (156 файлов, кэш minted, `main.pdf`) | Шум в каждом коммите, конфликты, раздутая история. |
| Устаревшие вещи в корне и рядом | `missions_points_flight.lua`, `status-before-dc.txt`, `personal/lessons/*.txt`, `*.lua`, `code/lua/simulator` (старый Lua-симулятор, 24 КБ) | Непонятно, что актуально. |
| Скрипты под старую раскладку | `scripts/update_structure.py`, `fix_python_paths.py`, `fix_python_examples_paths.py`, `personal/lessons/update_paths.py` | Правят пути, которых уже нет. |
| Документы симулятора раздроблены | `web-simulator/docs` (аудиты, планы, JSON-отчёты), `web-simulator/*.md`, корневой `docs/` | Сложно понять, что читать, а что отчёт прошлой итерации. |
| Сторонние материалы двух видов | `geoskan/` (PDF производителя), `vendor/` (сохранённые HTML-страницы) | Это одно и то же по смыслу: чужое, только для чтения. |

## Целевая структура

```
Geoskan-Pioneer-for-students/
├─ README.md
├─ simulator/                 веб-симулятор (бывший personal/lessons/code/lua/web-simulator)
│  ├─ public/  tests/  tools/  server*.ts  package.json …
│  └─ docs/                   только то, что нужно разработчику симулятора
├─ book/                      учебник (бывший personal/lessons/{tex,data,build.bat})
│  ├─ tex/
│  ├─ data/
│  └─ build.bat               результат сборки в build/ (в .gitignore), PDF отдаём через Releases
├─ examples/                  ЕДИНСТВЕННЫЙ источник примеров
│  ├─ lua/        02_sensors  04_language  05_leds  06_missions
│  ├─ lua-tasks/  (бывшее code/lua/tasks)
│  └─ python/     (бывшее code/python/examples, вместе с answers)
├─ third-party/
│  ├─ geoskan/                материалы производителя (бывшая geoskan/)
│  └─ web-docs/               сохранённые страницы (бывшая vendor/)
├─ docs/                      README-картинки, этот документ, обзоры
└─ tools/                     общие скрипты (оставить только живые)
```

Идея: **что запускаем** (`simulator`), **что читаем** (`book`), **чему учим** (`examples`), **чужое** (`third-party`). Любой каталог верхнего уровня понятен по имени.

## Таблица переноса

| Было | Станет |
|---|---|
| `personal/lessons/code/lua/web-simulator/` | `simulator/` |
| `personal/lessons/tex/` | `book/tex/` |
| `personal/lessons/data/` | `book/data/` |
| `personal/lessons/build.bat` | `book/build.bat` |
| `personal/lessons/build/` | удалить из git, добавить в `.gitignore` |
| `personal/lessons/code/lua/examples/` | `examples/lua/` |
| `personal/lessons/code/lua/tasks/` | `examples/lua-tasks/` |
| `personal/lessons/code/python/{examples,answers}/` | `examples/python/` |
| `simulator/examples/`, `simulator/examples-python/` (копии) | не хранить, `sync-examples` собирает их при сборке; в `.gitignore` |
| `geoskan/` | `third-party/geoskan/` |
| `vendor/` | `third-party/web-docs/` |
| `scripts/` | `tools/`, устаревшее удалить |
| `personal/lessons/code/lua/simulator/` | удалить (старый Lua-симулятор) или `archive/` |
| `missions_points_flight.lua`, `status-before-dc.txt`, `personal/lessons/*.txt|*.lua` | перенести в `examples/lua/` или удалить |

## Что придётся поправить после переноса

1. `.github/workflows/web-simulator-ci.yml`: пути `paths:`, `working-directory`, `cache-dependency-path` указывают на старый каталог.
2. `simulator/tools/sync_lesson_examples.mjs`: источники `../examples` и `../../python/examples` станут `../examples/lua` и `../examples/python`.
3. `simulator/vite.config.ts`: корни плагина `examplesApiPlugin` (`examples`, `../examples`, `../../python/examples`) и `outDir`.
4. `simulator/tests/lessons-book-examples.test.ts` (читает `tex/main.tex` и файлы примеров), а также `editor-temporary-document.test.ts` и `mission-guide-drafts.test.ts`, если они читают пути репозитория.
5. LaTeX: базовый каталог окружения `codefile` в `book/tex/styles/preamble.tex` (сейчас пути вида `lua/examples/...` считаются от `code/`), `build.bat`, пути к `images/`.
6. `README.md`, `book/README.md`, `docs/`: ссылки и раздел про лицензию (упоминает `/personal`).
7. Деплой симулятора (`simulator.sakoryagin.ru`): если сборка запускается из старого каталога, обновить рабочий каталог. `Dockerfile` лежит внутри симулятора и переедет вместе с ним.
8. `.claude/launch.json` и любые закладки/ярлыки на старые пути.

## Порядок миграции (по шагам, каждый шаг отдельным коммитом)

1. **Очистка без переносов.** Убрать из git `personal/lessons/build`, дописать `.gitignore` (`build/`, `*.stackdump`, `.impeccable/`, `.tmp/`), вынести устаревшие скрипты и стражей из корня.
2. **Единый источник примеров.** Перенести примеры в `examples/`, поправить `sync_lesson_examples.mjs`, vite и тест книги, удалить копии из симулятора. Проверка: `npm run sync-examples`, `jest tests/lessons-book-examples.test.ts`.
3. **Учебник.** `git mv personal/lessons/tex book/tex`, поправить `preamble.tex` и `build.bat`. Проверка: `book/build.bat`, PDF собирается, листинги подсвечены.
4. **Симулятор.** `git mv personal/lessons/code/lua/web-simulator simulator`, поправить CI и деплой. Проверка: `npm ci`, `type-check`, `lint`, `test`, `npm run build`.
5. **Сторонние материалы и документы.** `geoskan` и `vendor` в `third-party`, документы симулятора разобрать на «нужные» и «архив отчётов».
6. **Финиш.** Удалить пустой `personal/`, обновить README и лицензионный раздел.

`git mv` сохраняет историю файлов, поэтому `git log --follow` продолжит работать.

## Риски и как их снять

* **Сломать CI или деплой.** Шаг 4 делаем в отдельной ветке, CI гоним до слияния.
* **Потерять локальные закладки и настройки редактора.** Предупредить в README (раздел «Что изменилось»).
* **Длинные пути на Windows.** После переноса они станут короче (7 уровней вместо 3), так что это плюс.
* **Большие бинарные файлы в истории** (`pioneer-basic.glb` и др.) не решаются переносом. Если размер репозитория станет проблемой, позже можно подключить Git LFS для `*.glb`, `*.blend`, `*.pdf`.

## Минимальный вариант, если переносить не хочется

Не двигать каталоги, а только: убрать `build/` из git, сделать копии примеров генерируемыми (`.gitignore`), удалить устаревшее, положить в `personal/lessons/code/lua/web-simulator/README.md` пометку «это главный проект» и сослаться на него из корневого README. Это закрывает около половины проблем почти бесплатно.
