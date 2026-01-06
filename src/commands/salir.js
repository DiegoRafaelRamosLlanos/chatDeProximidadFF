const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const playerManager = require('../managers/PlayerManager');
const voiceManager = require('../managers/VoiceChannelManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('salir')
        .setDescription('🚪 Salir de la sala y liberar tu butaca'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const playerNumber = playerManager.getNumberByUserId(userId);
        const location = playerManager.getLocation(userId);

        // Si no está registrado
        if (!playerNumber && !location) {
            return interaction.reply({
                content: '🤔 No estás registrado en ninguna butaca.',
                flags: 64
            });
        }

        // Remover jugador (libera butaca y ubicación)
        playerManager.removePlayer(userId);

        // Desconectar del canal de voz
        let voiceMessage = '';
        const member = interaction.member;

        if (member && member.voice.channel) {
            const result = await voiceManager.disconnectFromVoice(member);
            voiceMessage = `\n🔊 ${result.message}`;
        }

        const occupied = playerManager.getOccupiedCount();
        await interaction.reply({
            content: `👋 Has salido. Butaca **#${playerNumber || '?'}** liberada.${voiceMessage}\n\n📊 Jugadores: ${occupied}/55`,
            flags: 64
        });
    }
};
