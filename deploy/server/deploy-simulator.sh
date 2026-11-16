#!/bin/bash
# Скрипт выкладки симулятора НА СЕРВЕРЕ. Его запускает workflow `deploy simulator` (.github/workflows/deploy.yml) по SSH:
# архив релиза приходит на стандартный ввод, всё остальное делает этот скрипт: проверка архива, резервные копии, распаковка,
# сборка, перезапуск и откат при неудачной сборке.
#
# Установка (один раз, под root на сервере):
#   install -m 755 deploy-simulator.sh /usr/local/bin/deploy-simulator
#   в ~/.ssh/authorized_keys ключ деплоя с жёстким ограничением, чтобы он умел только это:
#   command="/usr/local/bin/deploy-simulator",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA... deploy-github
#
# Пути и имена ниже совпадают с боевым сервером (проверено при ручной выкладке).
set -euo pipefail

APP=/var/www/fastuser/data/www/simulator.sakoryagin.ru
DATA=/var/lib/pioneer-sim
PM2_NAME=simulator-server
STAMP=$(date +%Y%m%d-%H%M%S)
export PATH=/root/.nvm/versions/node/v26.8.1/bin:$PATH   # системный node 18 не собирает vite

ARCHIVE=$(mktemp /root/sim-release-XXXXXX.tgz)
trap 'rm -f "$ARCHIVE"' EXIT
cat > "$ARCHIVE"

# 1. Архив должен быть целым и содержать приложение, иначе выходим, ничего не тронув.
tar -tzf "$ARCHIVE" > /dev/null
tar -tzf "$ARCHIVE" | grep -q '^package.json$' || { echo 'В архиве нет package.json: это не релиз симулятора' >&2; exit 2; }

# 2. Резервные копии: приложение, собранный dist и данные пользователей.
tar -czf "/root/app-before-ci-$STAMP.tgz" --exclude=node_modules -C "$APP" .
cp -a "$APP/dist" "/root/dist-before-ci-$STAMP"
[ -x /root/backup-pioneer-sim.sh ] && /root/backup-pioneer-sim.sh
cp -a "$DATA" "/root/pioneer-sim-data-before-ci-$STAMP"

# 3. Распаковка поверх. Данные в $DATA и node_modules не трогаются. Лишние старые файлы архив не удаляет.
tar -xzf "$ARCHIVE" --no-same-owner -C "$APP"

# 4. Сборка до перезапуска: если она упала, работающий сайт остаётся прежним, а мы откатываем распакованное.
cd "$APP"
if ! npm run build > "/root/build-ci-$STAMP.log" 2>&1; then
    echo "Сборка не удалась, журнал: /root/build-ci-$STAMP.log. Возвращаю прежнюю версию." >&2
    tar -xzf "/root/app-before-ci-$STAMP.tgz" --no-same-owner -C "$APP"
    exit 3
fi

# 5. Перезапуск с теми же переменными окружения; сайт ещё несколько минут пересобирается и отвечает 502, потом 200.
pm2 restart "$PM2_NAME" --update-env
echo "Выложено: $STAMP"
