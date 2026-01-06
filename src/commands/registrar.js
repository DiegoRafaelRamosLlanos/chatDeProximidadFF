const { SlashCommandBuilder } = require('discord.js');
const playerManager = require('../managers/PlayerManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('registrar')
        .setDescription('📝 Registra tu número de asiento del juego')
        .addIntegerOption(option =>
            option.setName('numero')
                .setDescription('Tu número de asiento en el juego (1-50)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(50)),

    async execute(interaction) {
        const playerNumber = interaction.options.getInteger('numero');
        const userId = interaction.user.id;
        const username = interaction.user.username;

        // Verificar si el número ya está tomado
        const existingPlayer = playerManager.getPlayerByNumber(playerNumber);
        if (existingPlayer && existingPlayer.odUserId !== userId) {
            return interaction.reply({
                content: `❌ El número **${playerNumber}** ya está registrado por otro jugador.`,
                flags: 64
            });
        }

        // Registrar el número
        playerManager.registerPlayerNumber(userId, playerNumber, username);

        await interaction.reply({
            content: `✅ ¡Registrado! Tu número es **#${playerNumber}**\n\nEl observador podrá moverte usando: \`/mover ${playerNumber} [zona]\``,
            flags: 64
        });
    }
};
