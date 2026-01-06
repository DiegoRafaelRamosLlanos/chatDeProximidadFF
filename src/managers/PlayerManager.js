// Gestor de jugadores y sus ubicaciones
class PlayerManager {
    constructor() {
        // Map: odUserId -> { map, zone, timestamp, username, playerNumber }
        this.players = new Map();
        // Map: playerNumber -> odUserId (para búsqueda rápida)
        this.numberToUser = new Map();
    }

    // ═══════════════════════════════════════════════════════════════
    // REGISTRO DE NÚMEROS DE JUGADOR
    // ═══════════════════════════════════════════════════════════════

    // Registrar número de asiento
    registerPlayerNumber(odUserId, playerNumber, username) {
        // Si el usuario ya tenía otro número, liberarlo
        const existingData = this.players.get(odUserId);
        if (existingData && existingData.playerNumber) {
            this.numberToUser.delete(existingData.playerNumber);
        }

        // Registrar el nuevo número
        this.numberToUser.set(playerNumber, odUserId);

        // Actualizar o crear datos del jugador
        const currentData = this.players.get(odUserId) || {};
        this.players.set(odUserId, {
            ...currentData,
            playerNumber: playerNumber,
            username: username,
            timestamp: Date.now()
        });
    }

    // Obtener jugador por número de asiento
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

    // Obtener número por ID de usuario
    getNumberByUserId(odUserId) {
        const data = this.players.get(odUserId);
        return data ? data.playerNumber : null;
    }

    // Listar todos los jugadores registrados
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

    // Establecer ubicación de un jugador
    setLocation(odUserId, mapId, zoneId, username) {
        const currentData = this.players.get(odUserId) || {};
        this.players.set(odUserId, {
            ...currentData,
            map: mapId,
            zone: zoneId,
            username: username,
            timestamp: Date.now()
        });
    }

    // Obtener ubicación de un jugador
    getLocation(odUserId) {
        return this.players.get(odUserId) || null;
    }

    // Obtener todos los jugadores en una zona específica
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

    // Obtener todos los jugadores en un mapa
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

    // Remover un jugador
    removePlayer(odUserId) {
        const data = this.players.get(odUserId);
        if (data && data.playerNumber) {
            this.numberToUser.delete(data.playerNumber);
        }
        return this.players.delete(odUserId);
    }

    // Limpiar todos los registros (útil para nueva partida)
    clearAll() {
        this.players.clear();
        this.numberToUser.clear();
    }

    // Obtener estadísticas
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

// Exportar una instancia única (singleton)
module.exports = new PlayerManager();

