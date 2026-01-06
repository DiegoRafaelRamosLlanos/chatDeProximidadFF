const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { maps } = require('../config/maps');
const playerManager = require('../managers/PlayerManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cercanos')
        .setDescription('👥 Ver jugadores cerca de tu ubicación'),

    async execute(interaction) {
        const location = playerManager.getLocation(interaction.user.id);

        // Si no tiene ubicación
        if (!location) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Sin ubicación')
                .setDescription('No has indicado tu ubicación todavía.')
                .addFields({
                    name: '💡 Consejo',
                    value: 'Usa `/ubicacion` para seleccionar dónde estás en el mapa.'
                });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const map = maps[location.map];
        const zoneName = map.zones[location.zone];
        const playersInZone = playerManager.getPlayersInZone(location.map, location.zone);
        const otherPlayers = playersInZone.filter(p => p.userId !== interaction.user.id);

        let playerList = '';
        if (otherPlayers.length > 0) {
            playerList = otherPlayers
                .map((p, i) => `${i + 1}. **${p.username}**`)
                .join('\n');
        } else {
            playerList = '*No hay otros jugadores en tu zona*';
        }

        const embed = new EmbedBuilder()
            .setColor(0x00BFFF)
            .setTitle(`📍 ${zoneName} - ${map.name}`)
            .setDescription(`Estás en **${zoneName}**`)
            .addFields(
                {
                    name: `👥 Jugadores cercanos (${otherPlayers.length})`,
                    value: playerList
                }
            )
            .setFooter({ text: 'Los jugadores cercanos pueden verte también' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
