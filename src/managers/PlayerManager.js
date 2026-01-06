// Gestor de jugadores y sus ubicaciones con persistencia
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'players.json');

class PlayerManager {
    constructor() {
        // Map: odUserId -> { map, zone, timestamp, username, playerNumber }
        this.players = new Map();
        // Map: playerNumber -> odUserId (para búsqueda rápida)
        this.numberToUser = new Map();

        // Cargar datos guardados
        this.loadData();
    }

    // ═══════════════════════════════════════════════════════════════
    // PERSISTENCIA DE DATOS
    // ═══════════════════════════════════════════════════════════════

    loadData() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

                // Restaurar players
                if (data.players) {
                    for (const [key, value] of Object.entries(data.players)) {
                        this.players.set(key, value);
                    }
                }

                // Restaurar numberToUser
                if (data.numberToUser) {
                    for (const [key, value] of Object.entries(data.numberToUser)) {
                        this.numberToUser.set(parseInt(key), value);
                    }
                }

                console.log(`📂 Datos cargados: ${this.numberToUser.size} jugadores`);
            }
        } catch (error) {
            console.error('⚠️ Error cargando datos:', error.message);
        }
    }

    saveData() {
        try {
            // Crear directorio si no existe
            const dir = path.dirname(DATA_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const data = {
                players: Object.fromEntries(this.players),
                numberToUser: Object.fromEntries(this.numberToUser)
            };

            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('⚠️ Error guardando datos:', error.message);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // REGISTRO DE NÚMEROS DE JUGADOR
    // ═══════════════════════════════════════════════════════════════

    registerPlayerNumber(odUserId, playerNumber, username) {
        const existingData = this.players.get(odUserId);
        if (existingData && existingData.playerNumber) {
            this.numberToUser.delete(existingData.playerNumber);
        }

        this.numberToUser.set(playerNumber, odUserId);

        const currentData = this.players.get(odUserId) || {};
        this.players.set(odUserId, {
            ...currentData,
            playerNumber: playerNumber,
            username: username,
            timestamp: Date.now()
        });

        this.saveData(); // Guardar automáticamente
    }

    getPlayerByNumber(playerNumber) {
        const odUserId = this.numberToUser.get(playerNumber);
        if (!odUserId) return null;

        const data = this.players.get(odUserId);
        if (!data) return null;

        return {
            odUserId: odUserId,
            playerNumber: playerNumber,
            username: data.username,
            map: data.map,
            zone: data.zone
        };
    }

    getNumberByUserId(odUserId) {
        const data = this.players.get(odUserId);
        return data ? data.playerNumber : null;
    }

    getNextAvailableNumber() {
        const MAX_PLAYERS = 55;
        for (let i = 1; i <= MAX_PLAYERS; i++) {
            if (!this.numberToUser.has(i)) {
                return i;
            }
        }
        return null;
    }

    getOccupiedCount() {
        return this.numberToUser.size;
    }

    getRegisteredPlayers() {
        const registered = [];
        for (const [number, odUserId] of this.numberToUser) {
            const data = this.players.get(odUserId);
            if (data) {
                registered.push({
                    number: number,
                    odUserId: odUserId,
                    username: data.username,
                    zone: data.zone
                });
            }
        }
        return registered.sort((a, b) => a.number - b.number);
    }

    // ═══════════════════════════════════════════════════════════════
    // GESTIÓN DE UBICACIONES
    // ═══════════════════════════════════════════════════════════════

    setLocation(odUserId, mapId, zoneId, username) {
        const currentData = this.players.get(odUserId) || {};
        this.players.set(odUserId, {
            ...currentData,
            map: mapId,
            zone: zoneId,
            username: username,
            timestamp: Date.now()
        });

        this.saveData(); // Guardar automáticamente
    }

    getLocation(odUserId) {
        return this.players.get(odUserId) || null;
    }

    getPlayersInZone(mapId, zoneId) {
        const playersInZone = [];
        for (const [odUserId, data] of this.players) {
            if (data.map === mapId && data.zone === zoneId) {
                playersInZone.push({
                    odUserId: odUserId,
                    username: data.username,
                    playerNumber: data.playerNumber,
                    timestamp: data.timestamp
                });
            }
        }
        return playersInZone;
    }

    getPlayersInMap(mapId) {
        const playersInMap = [];
        for (const [odUserId, data] of this.players) {
            if (data.map === mapId) {
                playersInMap.push({
                    odUserId: odUserId,
                    username: data.username,
                    playerNumber: data.playerNumber,
                    zone: data.zone,
                    timestamp: data.timestamp
                });
            }
        }
        return playersInMap;
    }

    removePlayer(odUserId) {
        const data = this.players.get(odUserId);
        if (data && data.playerNumber) {
            this.numberToUser.delete(data.playerNumber);
        }
        const result = this.players.delete(odUserId);

        this.saveData(); // Guardar automáticamente
        return result;
    }

    clearAll() {
        this.players.clear();
        this.numberToUser.clear();
        this.saveData();
    }

    getStats() {
        const stats = {
            totalPlayers: this.players.size,
            registeredWithNumber: this.numberToUser.size,
            byMap: {}
        };

        for (const [odUserId, data] of this.players) {
            if (data.map) {
                if (!stats.byMap[data.map]) {
                    stats.byMap[data.map] = 0;
                }
                stats.byMap[data.map]++;
            }
        }

        return stats;
    }
}

module.exports = new PlayerManager();
