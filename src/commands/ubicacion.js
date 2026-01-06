const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { maps } = require('../config/maps');
const playerManager = require('../managers/PlayerManager');
const voiceManager = require('../managers/VoiceChannelManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ubicacion')
        .setDescription('📍 Indica tu ubicación en el mapa de Free Fire'),

    async execute(interaction) {
        // Crear menú de selección de mapas
        const mapOptions = Object.entries(maps).map(([id, map]) => ({
            label: map.name.replace(/^.+\s/, ''), // Quitar emoji del label
            value: id,
            emoji: map.emoji,
            description: `${Object.keys(map.zones).length} zonas disponibles`
        }));

        const mapSelect = new StringSelectMenuBuilder()
            .setCustomId('select_map')
            .setPlaceholder('🗺️ Selecciona un mapa')
            .addOptions(mapOptions);

        const row = new ActionRowBuilder().addComponents(mapSelect);

        const embed = new EmbedBuilder()
            .setColor(0xFF6600)
            .setTitle('🎮 Chat de Proximidad Free Fire')
            .setDescription('Selecciona el mapa donde estás jugando:')
            .setFooter({ text: 'Paso 1 de 2: Seleccionar mapa' });

        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: 64 // ephemeral
        });
    },

    // Manejar selección de mapa
    async handleMapSelect(interaction) {
        const selectedMap = interaction.values[0];
        const map = maps[selectedMap];

        // Crear menú de zonas (máximo 25 opciones por menú)
        const zoneEntries = Object.entries(map.zones).slice(0, 25);
        const zoneOptions = zoneEntries.map(([id, name]) => ({
            label: name,
            value: `${selectedMap}:${id}`,
            description: `Ir a ${name}`
        }));

        const zoneSelect = new StringSelectMenuBuilder()
            .setCustomId('select_zone')
            .setPlaceholder('📍 Selecciona tu zona')
            .addOptions(zoneOptions);

        const row = new ActionRowBuilder().addComponents(zoneSelect);

        const embed = new EmbedBuilder()
            .setColor(0xFF6600)
            .setTitle(`${map.emoji} ${map.name.replace(/^.+\s/, '')}`)
            .setDescription('Ahora selecciona la zona donde te encuentras:')
            .setFooter({ text: 'Paso 2 de 2: Seleccionar zona' });

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    },

    // Manejar selección de zona
    async handleZoneSelect(interaction) {
        // Diferir la respuesta primero para evitar timeout
        await interaction.deferUpdate();

        const [mapId, zoneId] = interaction.values[0].split(':');
        const map = maps[mapId];
        const zoneName = map.zones[zoneId];
        const mapName = map.name.replace(/^.+\s/, ''); // Sin emoji

        // Guardar ubicación
        playerManager.setLocation(
            interaction.user.id,
            mapId,
            zoneId,
            interaction.user.username
        );

        // Contar jugadores en la zona
        const playersInZone = playerManager.getPlayersInZone(mapId, zoneId);
        const otherPlayers = playersInZone.filter(p => p.userId !== interaction.user.id);

        // Intentar mover al canal de voz
        const member = interaction.member;
        const guild = interaction.guild;

        let voiceMessage = 'No estás en un canal de voz.';
        let voiceSuccess = false;

        if (member && guild) {
            const result = await voiceManager.moveToZoneChannel(
                member,
                guild,
                mapId,
                mapName,
                zoneName,
                map.emoji
            );

            voiceMessage = result.message;
            voiceSuccess = result.success;
        }

        const embed = new EmbedBuilder()
            .setColor(voiceSuccess ? 0x00FF00 : 0xFFAA00)
            .setTitle('✅ Ubicación establecida')
            .setDescription(`Ahora estás en **${zoneName}** (${map.name})`)
            .addFields(
                {
                    name: '👥 Jugadores cercanos',
                    value: otherPlayers.length > 0
                        ? `${otherPlayers.length} jugador(es) en tu zona`
                        : 'Nadie más en tu zona por ahora',
                    inline: true
                },
                {
                    name: '🔊 Canal de voz',
                    value: voiceMessage,
                    inline: true
                }
            )
            .setFooter({ text: 'Usa /cercanos para ver quién está cerca • /salir para irte' });

        await interaction.editReply({
            embeds: [embed],
            components: []
        });
    }
};
