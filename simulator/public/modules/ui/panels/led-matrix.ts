/**
 * Модуль интерфейса LED-матрицы.
 * Инициализирует сетку светодиодов (LED) в правой панели телеметрии.
 * Создает HTML-элементы для каждого пикселя матрицы, чтобы их можно
 * было обновлять из Lua-скрипта.
 */
export function initLEDMatrixUI() {
    const grid = document.getElementById('led-matrix-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < 25; i++) {
        const pixel = document.createElement('div');
        pixel.className = 'led-pixel';
        pixel.id = `led-pixel-${i + 4}`; // offset by 4 for base LEDs
        pixel.title = `Светодиод ${i + 4}`;
        grid.appendChild(pixel);
    }
}
