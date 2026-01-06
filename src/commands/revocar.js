const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const playerManager = require('../managers/PlayerManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('revocar')
        .setDescription('🚫 [ADMIN] Revocar butaca de un jugador')
        .addIntegerOption(option =>
            option.setName('numero')
                .setDescription('Número de butaca a revocar (1-55)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(55))
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

    async execute(interaction) {
        const playerNumber = interaction.options.getInteger('numero');

        // Buscar jugador por número
        const playerData = playerManager.getPlayerByNumber(playerNumber);
        if (!playerData) {
            return interaction.reply({
                content: `❌ La butaca **#${playerNumber}** está vacía.`,
                flags: 64
            });
        }

        // Remover jugador
        playerManager.removePlayer(playerData.odUserId);

        const occupied = playerManager.getOccupiedCount();
        await interaction.reply({
            content: `✅ Butaca **#${playerNumber}** (${playerData.username}) revocada.\n\n📊 Jugadores: ${occupied}/55`,
            flags: 64
        });
    }
};
