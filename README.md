# RepairTrackQR - Multi-Sucursal

Sistema de seguimiento de reparaciones con soporte multi-sucursal, QR tracking, inventario, cotizaciones, y más.

## Stack
- **Frontend/Backend**: Next.js 16 + React 19
- **Base de datos**: PostgreSQL + Prisma 7
- **Auth**: JWT (jose + jsonwebtoken)
- **Estilos**: Tailwind CSS 4

## Roles
- **superadmin**: Acceso total, gestiona sucursales y usuarios globalmente
- **admin**: Gestiona su sucursal asignada
- **tech**: Solo ve sus reparaciones asignadas

## Credenciales por defecto (seed)
- Super Admin: `super@repairtrack.com` / `admin123`
- Admin Central: `admin.central@repairtrack.com` / `admin123`
- Admin Norte: `admin.norte@repairtrack.com` / `admin123`
- Acceso Setup: código `RTQR-2026`

---

## Desarrollo local

```bash
npm install
cp .env.example .env   # editar con tus datos
sudo -u postgres psql -c "CREATE DATABASE repairtrack;"
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

---

## Deploy en Servidor Hetzner (204.168.215.98)

### 1. Requisitos en el servidor

```bash
ssh root@204.168.215.98

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs postgresql postgresql-contrib nginx
npm install -g pm2
```

### 2. Subir proyecto

```bash
# Opción A: Desde GitHub
cd /var/www
git clone https://github.com/TU_USUARIO/RepairTrackQR.git repairtrack
cd repairtrack

# Opción B: Subir ZIP por SCP (desde tu PC Windows)
# scp RepairTrackQR-Corregido.zip root@204.168.215.98:/var/www/
# En el servidor:
# cd /var/www && unzip RepairTrackQR-Corregido.zip -d repairtrack && cd repairtrack
```

### 3. Configurar

```bash
# Crear .env
nano .env
# Pegar:
# DATABASE_URL="postgresql://postgres:TU_PASS@localhost:5432/repairtrack"
# JWT_SECRET="una-clave-muy-larga-y-segura"
# WASENDER_API_KEY="tu-key"

# Base de datos
sudo -u postgres psql -c "CREATE DATABASE repairtrack;"

# Instalar y build
npm install
npx prisma migrate deploy
npx tsx prisma/seed.ts    # Solo la primera vez
npm run build

# Preparar standalone
mkdir -p public/uploads
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

# Arrancar con PM2
pm2 start .next/standalone/server.js --name "repairtrack"
pm2 save
pm2 startup
```

### 4. Nginx reverse proxy

```bash
cat > /etc/nginx/sites-available/repairtrack << 'EOF'
server {
    listen 80;
    server_name 204.168.215.98;
    client_max_body_size 10M;

    location /uploads/ {
        alias /var/www/repairtrack/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/repairtrack /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

### 5. Actualizar después de cambios

```bash
cd /var/www/repairtrack
git pull origin main
npm install
npx prisma migrate deploy
npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
pm2 restart repairtrack
```

---

## Subir a GitHub (primera vez, desde tu PC)

```bash
git init
git add .
git commit -m "RepairTrackQR Multi-Sucursal v1.0"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/RepairTrackQR.git
git push -u origin main
```
