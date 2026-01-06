const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Cargar todos los comandos
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command) {
        commands.push(command.data.toJSON());
        console.log(`📦 Preparando comando: /${command.data.name}`);
    }
}

// Registrar comandos
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('═══════════════════════════════════════');
        console.log('🚀 Registrando comandos slash...');
        console.log('═══════════════════════════════════════');

        // Registrar en un servidor específico (más rápido para desarrollo)
        if (process.env.GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );
            console.log(`✅ ${commands.length} comando(s) registrados en el servidor`);
        } else {
            // Registrar globalmente (tarda hasta 1 hora)
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            console.log(`✅ ${commands.length} comando(s) registrados globalmente`);
        }

        console.log('═══════════════════════════════════════');
        console.log('¡Listo! Ahora ejecuta: npm start');
        console.log('═══════════════════════════════════════');
    } catch (error) {
        console.error('❌ Error al registrar comandos:', error);
    }
})();
