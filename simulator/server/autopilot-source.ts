import type express from 'express';
import fs from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Исходный файл параметров автопилота (шаблон, который окно «Параметры автопилота» читает при запуске).
 *
 * Чтение открыто всем: это общий шаблон. Запись нужна только разработчику (локально) и в настольной сборке, где пользователь один.
 * На общем сервере она закрыта: иначе любой посетитель мог бы перезаписать файл, который потом читают все. Включается явно,
 * переменной окружения AUTOPILOT_SOURCE_WRITE=1. Путь к файлу на диске наружу отдаётся только тогда, когда запись разрешена.
 */
export function isAutopilotSourceWritable(env: NodeJS.ProcessEnv, context: { distBuild: boolean; packaged: boolean }): boolean {
    return env.AUTOPILOT_SOURCE_WRITE === '1' || context.packaged || !context.distBuild;
}

export function registerAutopilotSourceRoutes(app: express.Express, options: { filePath: string; writable: boolean }) {
    const { filePath, writable } = options;

    app.get('/api/autopilot-parameters', async (_req, res) => {
        try {
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'Файл параметров автопилота не найден.' });
            }
            const content = await readFile(filePath, 'utf8');
            return res.json({
                fileName: path.basename(filePath),
                ...(writable ? { filePath } : {}),
                writable,
                content
            });
        } catch (error) {
            console.error('Failed to read autopilot parameters:', error);
            return res.status(500).json({ error: 'Не удалось прочитать файл параметров автопилота.' });
        }
    });

    app.put('/api/autopilot-parameters', async (req, res) => {
        if (!writable) {
            return res.status(403).json({ error: 'Запись исходного файла параметров на этом сервере отключена. Скачайте профиль файлом.' });
        }
        const content = typeof req.body?.content === 'string' ? req.body.content : null;
        if (!content) {
            return res.status(400).json({ error: 'Тело запроса должно содержать строковое поле content.' });
        }
        try {
            await writeFile(filePath, content, 'utf8');
            return res.json({ ok: true, fileName: path.basename(filePath), filePath, writable, updatedAt: new Date().toISOString() });
        } catch (error) {
            console.error('Failed to save autopilot parameters:', error);
            return res.status(500).json({ error: 'Не удалось сохранить файл параметров автопилота.' });
        }
    });
}
