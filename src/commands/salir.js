const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const playerManager = require('../managers/PlayerManager');
const voiceManager = require('../managers/VoiceChannelManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('salir')
        .setDescription('🚪 Salir de tu ubicación actual'),

    async execute(interaction) {
        const location = playerManager.getLocation(interaction.user.id);

        // Si no tiene ubicación
        if (!location) {
            const embed = new EmbedBuilder()
                .setColor(0xFFAA00)
                .setTitle('🤔 Ya estás fuera')
                .setDescription('No tienes ninguna ubicación establecida.');

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Remover jugador
        playerManager.removePlayer(interaction.user.id);

        // Desconectar del canal de voz
        let voiceMessage = '';
        const member = interaction.member;

        if (member && member.voice.channel) {
            const result = await voiceManager.disconnectFromVoice(member);
            voiceMessage = result.message;
        }

        const embed = new EmbedBuilder()
            .setColor(0x9932CC)
            .setTitle('👋 Has salido')
            .setDescription('Ya no apareces en ninguna zona del mapa.')
            .addFields(
                {
                    name: '🔊 Canal de voz',
                    value: voiceMessage || 'No estabas en un canal de voz.',
                    inline: true
                },
                {
                    name: '💡 Volver a entrar',
                    value: 'Usa `/ubicacion` cuando quieras indicar tu posición de nuevo.',
                    inline: false
                }
            );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
