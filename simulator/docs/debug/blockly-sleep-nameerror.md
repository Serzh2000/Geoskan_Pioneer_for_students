# Debug Session: blockly-sleep-nameerror
- **Status**: [OPEN]
- **Issue**: Blockly генерирует вызов sleep без определения имени
- **Debug Server**: pending
- **Log File**: .dbg/trae-debug-log-blockly-sleep-nameerror.ndjson

## Reproduction Steps
1. Создать Python Blockly-программу с блоком ожидания.
2. Скомпилировать программу через compileMainEditorWorkspace.
3. Запустить полученный Python-код.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Блок генерирует sleep, а обвязка импортирует только time | High | Low | Confirmed |
| B | Алиасы ожидания генерируют разные вызовы | Medium | Low | Inconclusive |
| C | Компилятор теряет определения генератора | Medium | Medium | Rejected for root cause |
| D | Порядок блоков влияет на импорт | Low | Medium | Rejected |
| E | camera и stream также остаются неопределёнными | Medium | Medium | Inconclusive |

## Log Evidence
Лог 5: hasBareSleep=true, hasTimeSleep=false для блоков sleep и math_number.
Лог 6: тело генератора начинается с sleep(1), импорт функции sleep отсутствует.
Падающий regression-тест подтверждает итоговый код: import time вместе с sleep(1).
Post-fix лог 1: hasBareSleep=false, hasTimeSleep=true для тех же блоков.
Post-fix лог 2: тело генератора начинается с time.sleep(1).

## Verification Conclusion
До исправления: import time + sleep(1), NameError.
После исправления: import time + time.sleep(1), regression-тест проходит.
Полный набор: 23 test suites, 178 tests passed.
