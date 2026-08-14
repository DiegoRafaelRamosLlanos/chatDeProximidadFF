const { ChannelType, PermissionFlagsBits } = require('discord.js');

class VoiceChannelManager {
    constructor() {
        // Cache de canales creados: { "bermuda:pochinok": channelId }
        this.channelCache = new Map();
    }

    /**
     * Obtiene o crea el canal de voz para una zona
     */
    async getOrCreateZoneChannel(guild, mapName, zoneName, mapEmoji) {
        const channelName = `${mapEmoji} ${zoneName}`;
        const cacheKey = `${guild.id}:${mapName}:${zoneName}`;

        // Buscar en cache primero
        if (this.channelCache.has(cacheKey)) {
            const cachedId = this.channelCache.get(cacheKey);
            const cachedChannel = guild.channels.cache.get(cachedId);
            if (cachedChannel) return cachedChannel;
        }

        // Buscar canal existente por nombre
        let channel = guild.channels.cache.find(
            c => c.type === ChannelType.GuildVoice && c.name === channelName
        );

        // Si no existe, crearlo
        if (!channel) {
            try {
                // Buscar o crear categoría para el mapa
                const categoryName = `🎮 ${mapName.toUpperCase()}`;
                let category = guild.channels.cache.find(
                    c => c.type === ChannelType.GuildCategory && c.name === categoryName
                );

                if (!category) {
                    category = await guild.channels.create({
                        name: categoryName,
                        type: ChannelType.GuildCategory
                    });
                }

                // Crear canal de voz
                channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildVoice,
                    parent: category.id,
                    userLimit: 99 // Máximo de usuarios
                });

                console.log(`🔊 Canal creado: ${channelName}`);
            } catch (error) {
                console.error(`❌ Error creando canal ${channelName}:`, error.message);
                return null;
            }
        }

        // Guardar en cache
        this.channelCache.set(cacheKey, channel.id);
        return channel;
    }

    /**
     * Mueve un usuario al canal de voz de su zona
     */
    async moveToZoneChannel(member, guild, mapId, mapName, zoneName, mapEmoji) {
        // El usuario debe estar en un canal de voz para ser movido
        if (!member.voice.channel) {
            return {
                success: false,
                reason: 'not_in_voice',
                message: '⚠️ Debes estar en un canal de voz para ser movido automáticamente.'
            };
        }

        const channel = await this.getOrCreateZoneChannel(guild, mapName, zoneName, mapEmoji);

        if (!channel) {
            return {
                success: false,
                reason: 'channel_error',
                message: '❌ No se pudo crear el canal de voz.'
            };
        }

        try {
            await member.voice.setChannel(channel);
            return {
                success: true,
                channel: channel,
                message: `🔊 Te movimos al canal **${channel.name}**`
            };
        } catch (error) {
            console.error(`❌ Error moviendo usuario:`, error.message);
            return {
                success: false,
                reason: 'move_error',
                message: '❌ No se pudo moverte al canal. ¿El bot tiene permisos?'
            };
        }
    }

    /**
     * Desconecta a un usuario del canal de voz
     */
    async disconnectFromVoice(member) {
        if (!member.voice.channel) {
            return { success: true, message: 'No estabas en un canal de voz.' };
        }

        try {
            await member.voice.disconnect();
            return { success: true, message: '👋 Te desconectamos del canal de voz.' };
        } catch (error) {
            return { success: false, message: '❌ No se pudo desconectarte.' };
        }
    }

    /**
     * Mueve un usuario a un canal dinámico (para encuentros)
     */
    async moveToDynamicChannel(member, guild, channelName) {
        if (!member.voice.channel) return { success: false, message: 'No está en voz' };

        // Buscar canal dinámico
        let channel = guild.channels.cache.find(
            c => c.type === ChannelType.GuildVoice && c.name === channelName
        );

        if (!channel) {
            try {
                const categoryName = '⚔️ ENCUENTROS DINÁMICOS';
                let category = guild.channels.cache.find(
                    c => c.type === ChannelType.GuildCategory && c.name === categoryName
                );
                if (!category) {
                    category = await guild.channels.create({ 
                        name: categoryName, 
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: [
                            {
                                id: guild.roles.everyone.id,
                                allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel]
                            }
                        ]
                    });
                }

                channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildVoice,
                    parent: category.id,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel]
                        }
                    ]
                });
                console.log(`⚔️ Canal dinámico creado: ${channelName}`);
            } catch (e) {
                console.error(`Error creando canal dinámico ${channelName}:`, e.message);
                return { success: false };
            }
        }

        try {
            if (member.voice.channel.id !== channel.id) {
                await member.voice.setChannel(channel);
            }
            return { success: true, channel: channel };
        } catch (e) {
            return { success: false };
        }
    }

    /**
     * Mueve a un usuario a la Sala General
     */
    async moveToSala(member, guild) {
        if (!member.voice.channel) return { success: false };
        
        let sala = guild.channels.cache.find(c => c.type === ChannelType.GuildVoice && c.name.toLowerCase().includes("sala"));
        
        if (!sala) return { success: false, message: 'No se encontró Sala' };

        try {
            if (member.voice.channel.id !== sala.id) {
                await member.voice.setChannel(sala);
            }
            return { success: true };
        } catch (e) {
            return { success: false };
        }
    }

    /**
     * Limpia los canales dinámicos vacíos
     */
    async cleanupEmptyDynamicChannels(guild) {
        const categoryName = '⚔️ ENCUENTROS DINÁMICOS';
        let category = guild.channels.cache.find(
            c => c.type === ChannelType.GuildCategory && c.name === categoryName
        );

        if (!category) return;

        for (const [id, channel] of category.children.cache) {
            if (channel.type === ChannelType.GuildVoice && channel.members.size === 0) {
                try {
                    await channel.delete('Canal de encuentro vacío');
                    console.log(`🗑️ Canal dinámico eliminado: ${channel.name}`);
                } catch (e) {
                    // Ignore deletion errors
                }
            }
        }
    }
}

module.exports = new VoiceChannelManager();
