const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const playerManager = require('../managers/PlayerManager');
const { confinedUsers, cleanupConfinementRole } = require('./confinar');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('liberar')
        .setDescription('🔓 Libera jugadores del confinamiento (quita rol y desbloquea canales)')
        .addStringOption(option =>
            option.setName('objetivo')
                .setDescription('Número de jugador (1-50) o "todos"')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 }); // ephemeral

        const objetivo = interaction.options.getString('objetivo').toLowerCase();
        const guild = interaction.guild;
        let playersToRelease = [];
        let results = { success: [], notConfined: [], failed: [] };

        if (objetivo === 'todos') {
            // Liberar todos los confinados de este servidor
            for (const [odUserId, data] of confinedUsers) {
                if (data.guildId === guild.id) {
                    const playerData = playerManager.getLocation(odUserId);
                    playersToRelease.push({
                        odUserId,
                        playerNumber: playerData?.playerNumber || '?',
                        username: playerData?.username || 'Desconocido',
                        roleId: data.roleId
                    });
                }
            }
        } else {
            const playerNumber = parseInt(objetivo);
            if (isNaN(playerNumber) || playerNumber < 1 || playerNumber > 50) {
                return await interaction.editReply({
                    content: '❌ Uso: `/liberar 15` o `/liberar todos`'
                });
            }

            const playerData = playerManager.getPlayerByNumber(playerNumber);
            if (!playerData) {
                return await interaction.editReply({
                    content: `❌ No hay jugador #${playerNumber} registrado.`
                });
            }

            if (!confinedUsers.has(playerData.odUserId)) {
                return await interaction.editReply({
                    content: `⚠️ El jugador #${playerNumber} no está confinado.`
                });
            }

            const confineData = confinedUsers.get(playerData.odUserId);
            playersToRelease.push({
                odUserId: playerData.odUserId,
                playerNumber: playerNumber,
                username: playerData.username,
                roleId: confineData.roleId
            });
        }

        if (playersToRelease.length === 0) {
            return await interaction.editReply({
                content: '⚠️ No hay jugadores confinados para liberar.'
            });
        }

        console.log(`\n🔓 [LIBERAR] Procesando ${playersToRelease.length} jugadores...`);

        // Liberar cada jugador
        for (const player of playersToRelease) {
            try {
                if (confinedUsers.has(player.odUserId)) {
                    const member = await guild.members.fetch(player.odUserId).catch(() => null);

                    if (member && player.roleId) {
                        // Quitar rol de confinamiento
                        const role = guild.roles.cache.get(player.roleId);
                        if (role) {
                            await member.roles.remove(role);
                            console.log(`   ✅ Rol quitado de: ${player.username}`);
                        }
                    }

                    // Quitar del registro
                    confinedUsers.delete(player.odUserId);
                    results.success.push(`#${player.playerNumber} ${player.username}`);
                } else {
                    results.notConfined.push(`#${player.playerNumber}`);
                }
            } catch (error) {
                console.error(`   ❌ Error: ${error.message}`);
                results.failed.push(`#${player.playerNumber} (error: ${error.message})`);
            }
        }

        // Si liberamos a todos, limpiar los permisos del rol en los canales
        if (objetivo === 'todos' && results.success.length > 0) {
            await cleanupConfinementRole(guild);
            console.log(`   🧹 Permisos de canales limpiados`);
        }

        // Construir respuesta
        let response = [];

        if (results.success.length > 0) {
            response.push(`🔓 **Liberados (rol removido):**\n${results.success.join(', ')}`);
        }
        if (results.notConfined.length > 0) {
            response.push(`⚠️ **No estaban confinados:**\n${results.notConfined.join(', ')}`);
        }
        if (results.failed.length > 0) {
            response.push(`❌ **Fallaron:**\n${results.failed.join(', ')}`);
        }

        await interaction.editReply({
            content: response.join('\n\n') || '❌ No se liberó a nadie.'
        });
    }
};
