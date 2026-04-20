#!/bin/bash
# ============================================
# RESTAURAR BACKUP — RepairTrackQR
# ============================================
# Uso:
#   ./restore-backup.sh YYYY-MM-DD
# Ejemplo:
#   ./restore-backup.sh 2026-04-18
#
# Qué hace:
#  - Restaura la BD desde /root/backups/db_YYYY-MM-DD.dump
#  - Restaura uploads desde /root/backups/uploads_YYYY-MM-DD.tar.gz
#  - ⚠️ SOBRESCRIBE los datos actuales
# ============================================

set -e

if [ -z "$1" ]; then
    echo "❌ Debes especificar la fecha del backup a restaurar"
    echo ""
    echo "Uso: $0 YYYY-MM-DD"
    echo ""
    echo "Backups disponibles:"
    ls /root/backups/db_*.dump 2>/dev/null | sed 's|.*db_||;s|.dump||' | sort
    exit 1
fi

DATE="$1"
DB_FILE="/root/backups/db_${DATE}.dump"
UPLOADS_FILE="/root/backups/uploads_${DATE}.tar.gz"
UPLOADS_DIR="/var/www/repairtrack/public/uploads"

DB_NAME="repairtrack"
DB_USER="postgres"
DB_PASS="1210"

echo "================================================"
echo "⚠️  RESTAURACIÓN DE BACKUP — $DATE"
echo "================================================"

if [ ! -f "$DB_FILE" ]; then
    echo "❌ No existe el backup de BD: $DB_FILE"
    exit 1
fi

echo ""
echo "📦 BD a restaurar: $DB_FILE"
echo "📸 Uploads a restaurar: $UPLOADS_FILE"
echo ""
echo "⚠️  ESTO SOBRESCRIBIRÁ TODOS LOS DATOS ACTUALES"
read -p "¿Continuar? (escribe SI para confirmar): " confirm

if [ "$confirm" != "SI" ]; then
    echo "Cancelado"
    exit 0
fi

# Detener app
echo ""
echo "🛑 Deteniendo PM2..."
pm2 stop repairtrack || true

# Restaurar BD
echo "🔄 Restaurando base de datos..."
PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -h localhost -c "DROP DATABASE IF EXISTS $DB_NAME;" postgres
PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -h localhost -c "CREATE DATABASE $DB_NAME;" postgres
PGPASSWORD="$DB_PASS" pg_restore -U "$DB_USER" -h localhost -d "$DB_NAME" "$DB_FILE"
echo "✅ BD restaurada"

# Restaurar uploads
if [ -f "$UPLOADS_FILE" ]; then
    echo "🔄 Restaurando uploads..."
    rm -rf "$UPLOADS_DIR"
    mkdir -p "$(dirname "$UPLOADS_DIR")"
    tar -xzf "$UPLOADS_FILE" -C "$(dirname "$UPLOADS_DIR")"
    echo "✅ Uploads restaurados"
else
    echo "⚠️  No hay backup de uploads para esta fecha"
fi

# Reiniciar app
echo "🚀 Reiniciando PM2..."
pm2 restart repairtrack

echo ""
echo "================================================"
echo "✅ Restauración completada"
echo "================================================"
