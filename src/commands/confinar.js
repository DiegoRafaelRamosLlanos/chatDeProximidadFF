const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const playerManager = require('../managers/PlayerManager');

// Set para rastrear usuarios confinados: odUserId -> { channelId, guildId, roleId }
const confinedUsers = new Map();

// Cache de roles de confinamiento por servidor: guildId -> roleId
const confinementRoles = new Map();

/**
 * Obtiene o crea el rol de confinamiento y configura permisos en canales
 */
async function getOrCreateConfinementRole(guild, allowedChannelId) {
    const roleName = '🔒 Confinado';

    // Buscar rol existente
    let role = guild.roles.cache.find(r => r.name === roleName);

    if (!role) {
        // Crear rol
        try {
            role = await guild.roles.create({
                name: roleName,
                color: 0xFF0000, // Rojo
                reason: 'Rol para confinar jugadores a un canal de voz'
            });
            console.log(`✅ Rol "${roleName}" creado`);
        } catch (error) {
            console.error(`❌ Error creando rol: ${error.message}`);
            return null;
        }
    }

    // Configurar permisos en TODOS los canales de voz
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice);

    for (const [channelId, channel] of voiceChannels) {
        try {
            if (channelId === allowedChannelId) {
                // Canal permitido: puede conectarse
                await channel.permissionOverwrites.edit(role, {
                    Connect: true
                });
                console.log(`   ✅ ${channel.name}: permitido`);
            } else {
                // Otros canales: NO puede conectarse
                await channel.permissionOverwrites.edit(role, {
                    Connect: false
                });
                console.log(`   🚫 ${channel.name}: bloqueado`);
            }
        } catch (error) {
            console.error(`   ⚠️ Error en ${channel.name}: ${error.message}`);
        }
    }

    return role;
}

/**
 * Limpia los permisos del rol de confinamiento de todos los canales
 */
async function cleanupConfinementRole(guild) {
    const roleName = '🔒 Confinado';
    const role = guild.roles.cache.find(r => r.name === roleName);

    if (role) {
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice);
        for (const [channelId, channel] of voiceChannels) {
            try {
                await channel.permissionOverwrites.delete(role);
            } catch (error) {
                // Ignorar
            }
        }
    }
}

module.exports = {
    confinedUsers,
    cleanupConfinementRole,

    data: new SlashCommandBuilder()
        .setName('confinar')
        .setDescription('🔒 Mueve jugadores a un canal de voz y bloquea otros canales')
        .addStringOption(option =>
            option.setName('objetivo')
                .setDescription('Número de jugador (1-50) o "todos"')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal de voz destino')
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 }); // ephemeral

        const objetivo = interaction.options.getString('objetivo').toLowerCase();
        const targetChannel = interaction.options.getChannel('canal');
        const guild = interaction.guild;

        // Verificar permisos del bot
        const botMember = guild.members.me;
        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return await interaction.editReply({
                content: '❌ **El bot necesita el permiso "Gestionar roles" para confinar jugadores.**\n\nVe a Configuración del servidor → Roles → chatProximidad → y activa "Gestionar roles"'
            });
        }

        let playersToConfine = [];
        let results = { success: [], failed: [], notInVoice: [] };

        if (objetivo === 'todos') {
            const registrados = playerManager.getRegisteredPlayers();
            for (const player of registrados) {
                playersToConfine.push({
                    odUserId: player.odUserId,
                    playerNumber: player.number,
                    username: player.username
                });
            }
        } else {
            const playerNumber = parseInt(objetivo);
            if (isNaN(playerNumber) || playerNumber < 1 || playerNumber > 50) {
                return await interaction.editReply({
                    content: '❌ Uso: `/confinar 15 #canal` o `/confinar todos #canal`'
                });
            }

            const playerData = playerManager.getPlayerByNumber(playerNumber);
            if (!playerData) {
                return await interaction.editReply({
                    content: `❌ No hay jugador #${playerNumber} registrado.`
                });
            }

            playersToConfine.push({
                odUserId: playerData.odUserId,
                playerNumber: playerNumber,
                username: playerData.username
            });
        }

        if (playersToConfine.length === 0) {
            return await interaction.editReply({
                content: '❌ No hay jugadores registrados para confinar.'
            });
        }

        // Obtener o crear rol de confinamiento con permisos configurados
        console.log(`\n🔒 [CONFINAR] Configurando rol y permisos para ${targetChannel.name}...`);
        const confinementRole = await getOrCreateConfinementRole(guild, targetChannel.id);

        if (!confinementRole) {
            return await interaction.editReply({
                content: '❌ No se pudo crear el rol de confinamiento. Verifica los permisos del bot.'
            });
        }

        console.log(`\n👥 Procesando ${playersToConfine.length} jugadores...`);

        // Procesar cada jugador
        for (const player of playersToConfine) {
            try {
                const member = await guild.members.fetch(player.odUserId).catch(() => null);
                if (!member) {
                    results.failed.push(`#${player.playerNumber} (no encontrado)`);
                    continue;
                }

                // Asignar rol de confinamiento
                await member.roles.add(confinementRole);
                console.log(`   ✅ Rol asignado a: ${player.username}`);

                // Mover al canal destino si está en voz
                if (member.voice.channel) {
                    try {
                        await member.voice.setChannel(targetChannel);
                    } catch (moveError) {
                        console.error(`   ⚠️ Error moviendo: ${moveError.message}`);
                    }
                    results.success.push(`#${player.playerNumber} ${player.username}`);
                } else {
                    results.notInVoice.push(`#${player.playerNumber} ${player.username}`);
                }

                // Registrar como confinado
                confinedUsers.set(player.odUserId, {
                    channelId: targetChannel.id,
                    guildId: guild.id,
                    roleId: confinementRole.id
                });

            } catch (error) {
                console.error(`   ❌ Error: ${error.message}`);
                results.failed.push(`#${player.playerNumber} (error: ${error.message})`);
            }
        }

        // Construir respuesta
        let response = [];

        if (results.success.length > 0) {
            response.push(`✅ **Confinados a ${targetChannel.name}:**\n${results.success.join(', ')}`);
        }
        if (results.notInVoice.length > 0) {
            response.push(`⚠️ **Rol asignado pero no estaban en voz:**\n${results.notInVoice.join(', ')}`);
        }
        if (results.failed.length > 0) {
            response.push(`❌ **Fallaron:**\n${results.failed.join(', ')}`);
        }

        response.push(`\n🔒 Los jugadores con rol **${confinementRole.name}** solo pueden unirse a **${targetChannel.name}**`);

        await interaction.editReply({
            content: response.join('\n\n') || '❌ No se pudo confinar a nadie.'
        });
    }
};
