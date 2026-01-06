# 🎮 Chat de Proximidad Free Fire - Bot de Discord

Bot de Discord que permite a los jugadores de Free Fire indicar su ubicación en el mapa y conectar con otros jugadores cercanos.

## ✨ Características

- 🗺️ **3 mapas soportados**: Bermuda, Purgatorio, Kalahari
- 📍 **Más de 40 zonas** diferentes para elegir
- 👥 **Ver jugadores cercanos** en tu zona
- 💬 **Interfaz visual** con menús interactivos

## 📋 Comandos

| Comando | Descripción |
|---------|-------------|
| `/ubicacion` | Selecciona el mapa y zona donde estás |
| `/cercanos` | Ver lista de jugadores en tu zona |
| `/salir` | Salir de tu ubicación actual |

## 🚀 Instalación

### 1. Requisitos previos
- [Node.js](https://nodejs.org/) v18 o superior
- Una cuenta de Discord

### 2. Crear el Bot en Discord

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Click en **"New Application"** y dale un nombre
3. Ve a la sección **"Bot"** en el menú izquierdo
4. Click en **"Add Bot"**
5. En **"Privileged Gateway Intents"**, activa:
   - ✅ PRESENCE INTENT
   - ✅ SERVER MEMBERS INTENT
   - ✅ MESSAGE CONTENT INTENT
6. Click en **"Reset Token"** y copia el token (guárdalo, solo se muestra una vez)
7. Ve a **"OAuth2" > "URL Generator"**
8. Selecciona scopes: `bot` y `applications.commands`
9. Selecciona permisos: `Send Messages`, `Use Slash Commands`, `Embed Links`
10. Copia la URL generada y ábrela para invitar el bot a tu servidor

### 3. Configurar el proyecto

```bash
# Clonar o ir al directorio del proyecto
cd chatDeProximidadFF

# Instalar dependencias
npm install

# Copiar archivo de configuración
copy .env.example .env
```

### 4. Editar el archivo .env

Abre `.env` y completa los valores:

```env
DISCORD_TOKEN=tu_token_del_bot_aqui
CLIENT_ID=tu_application_id_aqui
GUILD_ID=tu_server_id_aqui
```

**¿Dónde encuentro estos valores?**
- `DISCORD_TOKEN`: Lo copiaste en el paso 2.6
- `CLIENT_ID`: En Discord Developer Portal > Tu aplicación > "Application ID"
- `GUILD_ID`: En Discord, click derecho en tu servidor > "Copiar ID del servidor" (necesitas modo desarrollador activado)

### 5. Registrar comandos y ejecutar

```bash
# Registrar los slash commands (solo la primera vez)
npm run deploy

# Iniciar el bot
npm start
```

## 📖 Uso

1. Escribe `/ubicacion` en cualquier canal
2. Selecciona el mapa (Bermuda, Purgatorio o Kalahari)
3. Selecciona la zona donde estás
4. Usa `/cercanos` para ver quién más está en tu zona
5. Usa `/salir` cuando termines de jugar

## 🗺️ Mapas y Zonas

### 🏝️ Bermuda (20 zonas)
Pochinok, Clock Tower, Factory, Sentosa, Peak, Cape Town, Shipyard, Mill, Hangar, Observatory, Plantation, Riverside, Rim Nam Village, Mars Electric, Bimasakti Strip, Katulistiwa, Kota Tua, Graveyard, Bullseye, Keraton

### 🏔️ Purgatorio (7 zonas)
Central, Forge, Golf Course, Lumber Mill, Moathouse, Mt. Villa, Ski Lodge

### 🏜️ Kalahari (13 zonas)
Refinery, Command Post, Bayfront, Mammoth, Santa Catarina, The Maze, Foundation, Confinement, Council Hall, Old Hampton, Shrines, Stone Ridge, The Sub

## 📝 Licencia

MIT License
