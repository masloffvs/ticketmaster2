#!/usr/bin/env zsh
set -euo pipefail

TARGET="bun-linux-x64"
BINS_DIR="bins"

# Функция "умной" установки пакетов
smart_install() {
    local dir=$1
    echo "[builder] checking dependencies in $dir..."
    
    # Тихо переходим в директорию
    pushd "$dir" > /dev/null
    
    local needs_install=0
    
    # Проверяем, есть ли папка node_modules вообще
    if [[ ! -d "node_modules" ]]; then
        needs_install=1
        # Если package.json новее, чем node_modules
        elif [[ -f "package.json" && "package.json" -nt "node_modules" ]]; then
        needs_install=1
        # Если старый бинарный локфайл новее
        elif [[ -f "bun.lockb" && "bun.lockb" -nt "node_modules" ]]; then
        needs_install=1
        # Если новый текстовый локфайл новее
        elif [[ -f "bun.lock" && "bun.lock" -nt "node_modules" ]]; then
        needs_install=1
    fi
    
    if [[ $needs_install -eq 1 ]]; then
        echo "[builder] 📦 Changes detected in $dir! Running bun install..."
        bun install
        # Важный хак: обновляем время изменения папки node_modules,
        # чтобы при следующем запуске без изменений проверка не срабатывала вхолостую
        touch node_modules
    else
        echo "[builder] ✅ Dependencies in $dir are up to date."
    fi
    
    # Возвращаемся обратно
    popd > /dev/null
}

echo "[builder] cleaning $BINS_DIR/"
rm -rf "$BINS_DIR"
mkdir -p "$BINS_DIR"

# Вызываем умный инсталл для каждого слоя перед сборкой
smart_install "logger"
smart_install "workerslayer"
smart_install "serverlayer"
smart_install "weblayer"
smart_install "logger" 

echo "----------------------------------------"

echo "[builder] compiling workerslayer -> $TARGET"
bun build --compile --target=$TARGET --outfile=$BINS_DIR/workerslayer.bin workerslayer/index.ts

echo "[builder] compiling serverlayer -> $TARGET"
bun build --compile --target=$TARGET --outfile=$BINS_DIR/server.bin serverlayer/src/index.ts

echo "[builder] building weblayer static"
pushd weblayer > /dev/null
rm -rf dist
bun run build
popd > /dev/null
mv weblayer/dist $BINS_DIR/weblayer

echo "[builder] done"
ls -lh $BINS_DIR/server.bin $BINS_DIR/workerslayer.bin
# Немного почистил вывод wc -l от лишних пробелов с помощью awk
echo "[builder] weblayer assets: $(ls $BINS_DIR/weblayer | wc -l | awk '{print $1}') files"