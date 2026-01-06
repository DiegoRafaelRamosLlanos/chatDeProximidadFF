const { SlashCommandBuilder } = require('discord.js');
const playerManager = require('../managers/PlayerManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('registrar')
        .setDescription('📝 Registrarte en la sala (se te asigna butaca automáticamente)'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;

        // Verificar si ya está registrado
        const existingNumber = playerManager.getNumberByUserId(userId);
        if (existingNumber) {
            return interaction.reply({
                content: `✅ Ya estás registrado con la butaca **#${existingNumber}**\n\nUsa \`/salir\` si quieres liberar tu butaca.`,
                flags: 64
            });
        }

        // Buscar siguiente butaca libre
        const nextNumber = playerManager.getNextAvailableNumber();
        if (nextNumber === null) {
            return interaction.reply({
                content: `❌ ¡Sala llena! Ya hay 55 jugadores registrados.\n\nEspera a que alguien salga.`,
                flags: 64
            });
        }

        // Registrar el número
        playerManager.registerPlayerNumber(userId, nextNumber, username);

        const occupied = playerManager.getOccupiedCount();
        await interaction.reply({
            content: `✅ ¡Registrado! Tu butaca es **#${nextNumber}**\n\n📊 Jugadores: ${occupied}/55`,
            flags: 64
        });
    }
};
