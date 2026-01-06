# 🎮 Chat de Proximidad Free Fire - Bot de Discord

Bot de Discord para gestionar jugadores en salas de Free Fire con sistema de butacas y comandos rápidos de admin.

## 🚀 Instalación Rápida

### 1. Requisitos
- [Node.js](https://nodejs.org/) v18+
- Bot de Discord creado en [Developer Portal](https://discord.com/developers/applications)

### 2. Configurar

```bash
# Instalar dependencias
npm install

# Crear archivo de configuración
copy .env.example .env
```

Admin revoca butaca	/revocar {número}
Jugador sale solo	/salir
/butacas

Comando	¿Quién puede usarlo?
/revocar	Solo admins (permiso "Mover miembros") ✅
/mover	Solo admins ✅
45f (rápido)	Solo admins ✅

### 3. Iniciar el Servidor

```bash
# Registrar comandos (solo primera vez o si cambias comandos)
npm run deploy

# Iniciar el bot
npm start
```

El bot mostrará:
```
✅ Conectado como: chatProximidad#xxxx
🌐 [API] Servidor escuchando en puerto 3001
```

---

## 📋 Comandos

### Para Jugadores
| Comando | Descripción |
|---------|-------------|
| `/registrar` | Obtener butaca automática (1-55) |
| `/salir` | Liberar tu butaca |
| `/ubicacion` | Indicar zona en el mapa |
| `/cercanos` | Ver jugadores en tu zona |

### Para Administradores
| Comando | Descripción |
|---------|-------------|
| `/revocar 15` | Revocar butaca #15 |
| `/mover 15 f` | Mover jugador #15 a Factory |
| `15f` | Comando rápido: mover #15 a Factory |

---

## ⚡ Comandos Rápidos (Solo Admins)

Escribe directamente en el chat: `{número}{código}`

**Ejemplo:** `45f` = Mover jugador #45 a Factory

### Códigos de Zonas (Bermuda)

| Código | Zona | Código | Zona |
|--------|------|--------|------|
| `sh` | Shipyard | `bu` | Bullseye |
| `r` | Riverside | `g` | Graveyard |
| `pl` | Plantation | `m` | Mill |
| `o` | Observatory | `k` | Katulistiwa |
| `ke` | Keraton | `b` | Bimasakti Strip |
| `ct` | Clock Tower | `pk` | Peak |
| `cp` | Cape Town | `h` | Hangar |
| `f` | Factory | `kt` | Kota Tua |
| `p` | Pochinok | `se` | Sentosa |
| `rn` | Rim Nam Village | `me` | Mars Electric |

---

## 📝 Licencia

MIT License
