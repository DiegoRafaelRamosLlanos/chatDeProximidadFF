const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Importar managers para la API
const playerManager = require('./managers/PlayerManager');
const voiceManager = require('./managers/VoiceChannelManager');

// Crear cliente de Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

// ═══════════════════════════════════════════════════════════════
// SERVIDOR EXPRESS PARA API DE AUTOMATIZACIÓN
// ═══════════════════════════════════════════════════════════════
const app = express();
app.use(express.json());

const API_PORT = process.env.API_PORT || 3001;

// Endpoint para recibir actualizaciones de ubicación automáticas
app.post('/api/location', async (req, res) => {
    try {
        const { discordUserId, zone, map, guildId } = req.body;

        if (!discordUserId || !zone || !guildId) {
            return res.status(400).json({
                error: 'Faltan campos requeridos: discordUserId, zone, guildId'
            });
        }

        // Obtener el guild y el miembro
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ error: 'Servidor no encontrado' });
        }

        const member = await guild.members.fetch(discordUserId).catch(() => null);
        if (!member) {
            return res.status(404).json({ error: 'Usuario no encontrado en el servidor' });
        }

        // Guardar ubicación
        const mapId = map || 'bermuda';
        playerManager.setLocation(discordUserId, mapId, zone, member.user.username);

        // Mover al canal de voz si está conectado
        let voiceResult = { success: false, message: 'No está en canal de voz' };
        if (member.voice.channel) {
            voiceResult = await voiceManager.moveToZoneChannel(
                member,
                guild,
                mapId,
                mapId.charAt(0).toUpperCase() + mapId.slice(1),
                zone,
                '🎮'
            );
        }

        res.json({
            success: true,
            user: member.user.username,
            zone: zone,
            voiceMoved: voiceResult.success,
            voiceMessage: voiceResult.message
        });

        console.log(`📍 [API] ${member.user.username} -> ${zone} (voz: ${voiceResult.success ? '✅' : '❌'})`);

    } catch (error) {
        console.error('❌ [API] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', bot: client.isReady() ? 'connected' : 'disconnected' });
});

// Colección de comandos
client.commands = new Collection();

// Cargar comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Comando cargado: /${command.data.name}`);
    }
}

// Evento: Bot listo
client.once(Events.ClientReady, (c) => {
    console.log('═══════════════════════════════════════');
    console.log('🎮 Bot de Proximidad Free Fire');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Conectado como: ${c.user.tag}`);
    console.log(`📊 Servidores: ${c.guilds.cache.size}`);
    console.log('═══════════════════════════════════════');
    console.log('Comandos disponibles:');
    console.log('  /ubicacion - Indicar tu posición');
    console.log('  /cercanos  - Ver jugadores cerca');
    console.log('  /salir     - Salir de la zona');
    console.log('═══════════════════════════════════════');
});

// Evento: Interacción (comandos y menús)
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        // Manejar Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            await command.execute(interaction);
        }

        // Manejar Select Menus
        if (interaction.isStringSelectMenu()) {
            const ubicacionCmd = client.commands.get('ubicacion');

            if (interaction.customId === 'select_map') {
                await ubicacionCmd.handleMapSelect(interaction);
            } else if (interaction.customId === 'select_zone') {
                await ubicacionCmd.handleZoneSelect(interaction);
            }
        }
    } catch (error) {
        console.error('❌ Error en interacción:', error.message);

        // Solo intentar responder si la interacción no ha expirado
        try {
            const errorEmbed = {
                embeds: [{
                    color: 0xFF0000,
                    title: '❌ Error',
                    description: 'Hubo un error al procesar tu solicitud. Intenta de nuevo.'
                }],
                flags: 64 // ephemeral
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorEmbed);
            } else {
                await interaction.reply(errorEmbed);
            }
        } catch (replyError) {
            // La interacción ya expiró, solo logear
            console.log('⚠️ No se pudo responder (interacción expirada)');
        }
    }
});

// ═══════════════════════════════════════════════════════════════
// COMANDOS RÁPIDOS DE ADMIN (ej: "45f" = jugador 45 a Factory)
// ═══════════════════════════════════════════════════════════════
const { ZONE_SHORTCUTS } = require('./commands/mover');
const { PermissionFlagsBits } = require('discord.js');

client.on(Events.MessageCreate, async (message) => {
    // Ignorar bots
    if (message.author.bot) return;

    // Verificar que es un comando rápido: número + letras (ej: 45f, 12ct)
    const quickCmd = message.content.toLowerCase().trim();
    const match = quickCmd.match(/^(\d{1,2})([a-z]+)$/);
    if (!match) return;

    const playerNumber = parseInt(match[1]);
    const zoneCode = match[2];

    // Validar número (1-50)
    if (playerNumber < 1 || playerNumber > 50) return;

    // Validar código de zona
    const zoneName = ZONE_SHORTCUTS[zoneCode];
    if (!zoneName) return;

    // Verificar permisos de admin
    if (!message.member.permissions.has(PermissionFlagsBits.MoveMembers)) {
        return; // Silenciosamente ignorar si no es admin
    }

    try {
        // Buscar jugador por número
        const playerData = playerManager.getPlayerByNumber(playerNumber);
        if (!playerData) {
            await message.reply({ content: `❌ No hay jugador #${playerNumber} registrado.` });
            return;
        }

        // Obtener miembro de Discord
        const member = await message.guild.members.fetch(playerData.odUserId).catch(() => null);
        if (!member) {
            await message.reply({ content: `❌ Jugador no encontrado en el servidor.` });
            return;
        }

        // Actualizar ubicación
        playerManager.setLocation(playerData.odUserId, 'bermuda', zoneName, member.user.username);

        // Mover al canal de voz si está conectado
        let voiceResult = { success: false, message: '' };
        if (member.voice.channel) {
            voiceResult = await voiceManager.moveToZoneChannel(
                member,
                message.guild,
                'bermuda',
                'Bermuda',
                zoneName,
                '🎮'
            );
        }

        // Respuesta mínima para rapidez
        await message.react('✅');
        console.log(`⚡ [QUICK] #${playerNumber} → ${zoneName} (${member.user.username})`);

    } catch (error) {
        console.error('❌ [QUICK] Error:', error.message);
        await message.react('❌').catch(() => { });
    }
});

// Manejar errores no capturados para evitar crashes
process.on('unhandledRejection', (error) => {
    console.error('⚠️ Unhandled rejection:', error.message);
});

client.on('error', (error) => {
    console.error('⚠️ Client error:', error.message);
});

// Iniciar bot y servidor API
client.login(process.env.DISCORD_TOKEN);

app.listen(API_PORT, () => {
    console.log(`🌐 [API] Servidor escuchando en puerto ${API_PORT}`);
    console.log(`   POST http://localhost:${API_PORT}/api/location`);
});
