import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { createDroneModel, whenDroneModelReady } from '../drone-model/index.js';

const EXPORT_FILE_NAME = 'pioneer-drone.glb';

const button = document.getElementById('export-drone-button') as HTMLButtonElement | null;
const statusEl = document.getElementById('export-drone-status');

if (!button || !statusEl) {
    throw new Error('Export page elements are missing.');
}

const exportButton = button;
const exportStatusEl = statusEl;

exportButton.addEventListener('click', () => {
    void exportDroneModel();
});

async function exportDroneModel() {
    exportButton.disabled = true;
    setStatus('Собираю модель...');

    try {
        const drone = createDroneModel();
        await whenDroneModelReady(drone);

        setStatus('Экспортирую GLB...');
        const glb = await exportAsGlb(drone);
        downloadFile(glb, EXPORT_FILE_NAME);
        setStatus(`Готово. Файл ${EXPORT_FILE_NAME} скачан.`);
    } catch (error) {
        console.error('[DroneExport] Failed to export drone model.', error);
        setStatus(`Ошибка экспорта: ${formatError(error)}`);
    } finally {
        exportButton.disabled = false;
    }
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

function setStatus(text: string) {
    exportStatusEl.textContent = text;
}

function formatError(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}
