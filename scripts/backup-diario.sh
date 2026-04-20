#!/bin/bash
# ============================================
# BACKUP DIARIO — RepairTrackQR
# ============================================
# Ejecutar con cron a las 3 AM todos los días:
#   crontab -e
#   0 3 * * * /root/backup-diario.sh >> /root/backup.log 2>&1
#
# Qué hace:
#  - Dump completo de la BD 'repairtrack' en formato custom
#  - Tar.gz de la carpeta /var/www/repairtrack/public/uploads
#  - Guarda en /root/backups/
#  - Conserva últimos 14 días, borra los más viejos
# ============================================

set -e

BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M")
DATE_ONLY=$(date +"%Y-%m-%d")
RETENTION_DAYS=14

# DB config (cambia si cambiaste password)
DB_NAME="repairtrack"
DB_USER="postgres"
DB_PASS="1210"

# Rutas
UPLOADS_DIR="/var/www/repairtrack/public/uploads"

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

echo "================================================"
echo "🔄 Backup iniciado: $TIMESTAMP"
echo "================================================"

# ===== 1) Backup de la Base de Datos =====
echo "📦 Respaldando base de datos '$DB_NAME'..."
DB_FILE="$BACKUP_DIR/db_${DATE_ONLY}.dump"

PGPASSWORD="$DB_PASS" pg_dump -U "$DB_USER" -h localhost -Fc -Z 9 -f "$DB_FILE" "$DB_NAME"

if [ $? -eq 0 ] && [ -s "$DB_FILE" ]; then
    DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
    echo "✅ BD respaldada: $DB_FILE ($DB_SIZE)"
else
    echo "❌ ERROR al respaldar BD"
    exit 1
fi

# ===== 2) Backup de Uploads =====
echo "📸 Respaldando carpeta de uploads..."
UPLOADS_FILE="$BACKUP_DIR/uploads_${DATE_ONLY}.tar.gz"

if [ -d "$UPLOADS_DIR" ]; then
    tar -czf "$UPLOADS_FILE" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")" 2>/dev/null
    if [ -s "$UPLOADS_FILE" ]; then
        UP_SIZE=$(du -h "$UPLOADS_FILE" | cut -f1)
        echo "✅ Uploads respaldados: $UPLOADS_FILE ($UP_SIZE)"
    else
        echo "⚠️  Uploads está vacío o no se pudo comprimir"
    fi
else
    echo "⚠️  Carpeta de uploads no existe ($UPLOADS_DIR)"
fi

# ===== 3) Limpiar backups antiguos =====
echo "🧹 Limpiando backups con más de $RETENTION_DAYS días..."
find "$BACKUP_DIR" -name "db_*.dump" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

# ===== 4) Resumen =====
echo "📊 Estado actual de backups:"
ls -lh "$BACKUP_DIR" | tail -n +2 | awk '{print "  " $9 " (" $5 ")"}'

TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "💾 Tamaño total: $TOTAL_SIZE"

echo "================================================"
echo "✅ Backup completado: $(date +"%Y-%m-%d %H:%M:%S")"
echo "================================================"
echo ""
