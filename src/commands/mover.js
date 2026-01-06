const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const playerManager = require('../managers/PlayerManager');
const voiceManager = require('../managers/VoiceChannelManager');
const { maps } = require('../config/maps');

// Códigos cortos para zonas (Bermuda) - 20 zonas
const ZONE_SHORTCUTS = {
    // Bermuda - Zonas correctas del mapa
    'sh': 'Shipyard',
    'bu': 'Bullseye',
    'r': 'Riverside',
    'ri': 'Riverside',
    'g': 'Graveyard',
    'gr': 'Graveyard',
    'pl': 'Plantation',
    'm': 'Mill',
    'mi': 'Mill',
    'o': 'Observatory',
    'ob': 'Observatory',
    'k': 'Katulistiwa',
    'ka': 'Katulistiwa',
    'ke': 'Keraton',
    'b': 'Bimasakti Strip',
    'bi': 'Bimasakti Strip',
    'ct': 'Clock Tower',
    'c': 'Clock Tower',
    'pk': 'Peak',
    'pe': 'Peak',
    'cp': 'Cape Town',
    'ca': 'Cape Town',
    'h': 'Hangar',
    'ha': 'Hangar',
    'f': 'Factory',
    'fa': 'Factory',
    'kt': 'Kota Tua',
    'p': 'Pochinok',
    'po': 'Pochinok',
    'se': 'Sentosa',
    'rn': 'Rim Nam Village',
    'me': 'Mars Electric'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mover')
        .setDescription('🎮 [ADMIN] Mueve un jugador a una zona rápidamente')
        .addIntegerOption(option =>
            option.setName('numero')
                .setDescription('Número del jugador (1-50)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(50))
        .addStringOption(option =>
            option.setName('zona')
                .setDescription('Código de zona (p=Pochinok, f=Factory, ct=ClockTower, etc.)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

    // Códigos exportados para uso en otros módulos
    ZONE_SHORTCUTS,

    async execute(interaction) {
        const playerNumber = interaction.options.getInteger('numero');
        const zoneCode = interaction.options.getString('zona').toLowerCase();

        // Buscar la zona por código corto
        const zoneName = ZONE_SHORTCUTS[zoneCode];
        if (!zoneName) {
            return interaction.reply({
                content: `❌ Código de zona "${zoneCode}" no reconocido.\n📋 Códigos válidos: ${Object.keys(ZONE_SHORTCUTS).join(', ')}`,
                flags: 64
            });
        }

        // Buscar jugador registrado con ese número
        const playerData = playerManager.getPlayerByNumber(playerNumber);
        if (!playerData) {
            return interaction.reply({
                content: `❌ No hay jugador registrado con el número **${playerNumber}**.\nLos jugadores deben usar \`/registrar\` primero.`,
                flags: 64
            });
        }

        // Obtener el miembro de Discord
        const member = await interaction.guild.members.fetch(playerData.odUserId).catch(() => null);
        if (!member) {
            return interaction.reply({
                content: `❌ No se encontró al usuario en el servidor.`,
                flags: 64
            });
        }

        // Actualizar ubicación
        playerManager.setLocation(playerData.odUserId, 'bermuda', zoneName, member.user.username);

        // Mover al canal de voz
        let voiceResult = { success: false, message: 'No está en canal de voz' };
        if (member.voice.channel) {
            voiceResult = await voiceManager.moveToZoneChannel(
                member,
                interaction.guild,
                'bermuda',
                'Bermuda',
                zoneName,
                '🎮'
            );
        }

        await interaction.reply({
            content: `✅ **#${playerNumber}** (${member.user.username}) → **${zoneName}**\n${voiceResult.message}`,
            flags: 64
        });
    }
};
