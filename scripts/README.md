# Sistema de Backups — RepairTrackQR

Scripts automáticos para respaldar la BD y los uploads del servidor Hetzner.

## Archivos

- `backup-diario.sh` — Crea backup de BD + uploads (se ejecuta con cron)
- `restore-backup.sh` — Restaura a partir de un backup específico

## Instalación en el servidor (una sola vez)

```bash
ssh root@204.168.215.98

# 1) Copiar los scripts a /root
cd /var/www/repairtrack/scripts
cp backup-diario.sh /root/
cp restore-backup.sh /root/

# 2) Permisos de ejecución
chmod +x /root/backup-diario.sh /root/restore-backup.sh

# 3) Crear directorio de backups
mkdir -p /root/backups

# 4) Probar el script manualmente
/root/backup-diario.sh

# Si todo funciona bien, verás:
# "✅ Backup completado"
# y en /root/backups/ tendrás los archivos db_... y uploads_...

# 5) Configurar cron para ejecutar automático todos los días a las 3 AM
crontab -e

# Agregar esta línea al final:
0 3 * * * /root/backup-diario.sh >> /root/backup.log 2>&1

# Guardar y salir. Listo.
```

## Verificar que el cron funciona

```bash
# Ver cron configurado
crontab -l

# Ver log del último backup
cat /root/backup.log

# Ver backups guardados
ls -lh /root/backups/
```

## Restaurar un backup

```bash
# Ver qué backups hay disponibles
ls /root/backups/

# Restaurar el backup del 15 de abril:
/root/restore-backup.sh 2026-04-15

# El script pedirá confirmación escribiendo "SI" antes de sobrescribir los datos.
```

## Política de retención

- Se guardan los **últimos 14 días**
- Los backups más viejos se eliminan automáticamente
- Cada backup ocupa ~5-50 MB dependiendo de la cantidad de fotos

## Descargar un backup a tu PC (para tenerlo fuera del servidor)

Desde tu Windows PowerShell:

```powershell
# Descargar el backup de hoy
scp root@204.168.215.98:/root/backups/db_2026-04-18.dump C:\backups\
scp root@204.168.215.98:/root/backups/uploads_2026-04-18.tar.gz C:\backups\
```

Recomendación: descargar semanalmente los backups más importantes a tu PC o Google Drive para tener copia fuera del servidor por si el servidor sufre un fallo grave.
