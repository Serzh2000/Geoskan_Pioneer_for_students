import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { createDroneModel } from '../drone-model/index.js';

const EXPORT_TIMEOUT_MS = 8000;
const EXPORT_FILE_NAME = 'pioneer-drone.glb';

const button = document.getElementById('export-drone-button') as HTMLButtonElement | null;
const statusEl = document.getElementById('export-drone-status');

if (!button || !statusEl) {
    throw new Error('Export page elements are missing.');
}

button.addEventListener('click', () => {
    void exportDroneModel();
});

async function exportDroneModel() {
    button.disabled = true;
    setStatus('Собираю модель...');

    try {
        const drone = createDroneModel();
        await waitForCadAssets(drone, EXPORT_TIMEOUT_MS);

        setStatus('Экспортирую GLB...');
        const glb = await exportAsGlb(drone);
        downloadFile(glb, EXPORT_FILE_NAME);
        setStatus(`Готово. Файл ${EXPORT_FILE_NAME} скачан.`);
    } catch (error) {
        console.error('[DroneExport] Failed to export drone model.', error);
        setStatus(`Ошибка экспорта: ${formatError(error)}`);
    } finally {
        button.disabled = false;
    }
}

async function waitForCadAssets(drone: ReturnType<typeof createDroneModel>, timeoutMs: number) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        const hasFrame = !!drone.getObjectByName('pioneer_cad_frame');
        const hasMotors = !!drone.getObjectByName('pioneer_cad_motors');
        if (hasFrame && hasMotors) return;
        await delay(100);
    }

    throw new Error('CAD parts were not ready before timeout.');
}

function exportAsGlb(drone: ReturnType<typeof createDroneModel>) {
    const exporter = new GLTFExporter();

    return new Promise<Blob>((resolve, reject) => {
        exporter.parse(
            drone,
            (result) => {
                if (!(result instanceof ArrayBuffer)) {
                    reject(new Error('Binary GLB export returned unexpected result.'));
                    return;
                }

                resolve(new Blob([result], { type: 'model/gltf-binary' }));
            },
            (error) => reject(error),
            { binary: true, onlyVisible: true }
        );
    });
}

function downloadFile(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function delay(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function setStatus(text: string) {
    statusEl.textContent = text;
}

function formatError(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}
