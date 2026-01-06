const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const playerManager = require('../managers/PlayerManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('butacas')
        .setDescription('📋 [ADMIN] Ver lista de butacas ocupadas')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

    async execute(interaction) {
        const players = playerManager.getRegisteredPlayers();
        const occupied = playerManager.getOccupiedCount();

        if (players.length === 0) {
            return interaction.reply({
                content: '📋 No hay jugadores registrados.',
                flags: 64
            });
        }

        // Crear lista de butacas
        let list = '';
        for (const player of players) {
            const zone = player.zone ? ` → ${player.zone}` : '';
            list += `**#${player.number}** ${player.username}${zone}\n`;
        }

        const embed = new EmbedBuilder()
            .setColor(0x00AAFF)
            .setTitle('📋 Butacas Ocupadas')
            .setDescription(list)
            .setFooter({ text: `${occupied}/55 jugadores` });

        await interaction.reply({ embeds: [embed], flags: 64 });
    }
};
