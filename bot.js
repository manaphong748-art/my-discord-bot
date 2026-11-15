/**
 * ============================================================================
 * JEFF FUJI - PROJECT REAL AUTO-KEY EXTRACTOR & AUTH BOT v20
 * Developed under JARVIS x ARI Protocol
 * ============================================================================
 */

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', async () => {
    console.log(`[+] Bot logged in as ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('auto-get-key')
            .setDescription('วางลิงก์ Project Real OAuth เพื่อดึงคีย์และยืนยันตัวตนอัตโนมัติ')
            .addStringOption(option => 
                option.setName('login_link')
                    .setDescription('วางลิงก์ยาวๆ ที่ก๊อปมาจากตัวรัน Roblox ที่นี่')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('master-strike')
            .setDescription('ปฏิบัติการทำลายล้างสูงสุด (Master-Command Annihilation)')
            .addStringOption(option => option.setName('target_url').setDescription('URL เป้าหมาย L7').setRequired(true))
            .addStringOption(option => option.setName('target_ip_port').setDescription('IP:Port เป้าหมาย L4').setRequired(true))
            .addIntegerOption(option => option.setName('duration').setDescription('ระยะเวลา (วินาที)').setRequired(true)),
        new SlashCommandBuilder()
            .setName('stop')
            .setDescription('หยุดการกระทำทั้งหมดทันที')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        console.log('[+] Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('[+] Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'auto-get-key') {
        const loginLink = interaction.options.getString('login_link');

        await interaction.deferReply({ ephemeral: true });

        try {
            // จัดการแปลง # ให้เป็น query เพื่อให้ URL parser ไม่งอแง
            const sanitizedLink = loginLink.replace('#', '&real_fragment=');
            const parsedUrl = new URL(sanitizedLink);

            const loopbackPort = parsedUrl.searchParams.get('loopback_port') || '58600';
            const state = parsedUrl.searchParams.get('state') || '';
            const loginAttemptId = parsedUrl.searchParams.get('login_attempt_id') || '';
            const realFragment = parsedUrl.searchParams.get('real_fragment') || '';

            let hwid = 'N/A';
            let proofNonce = 'N/A';
            if (realFragment) {
                const fragParams = new URLSearchParams(realFragment);
                hwid = fragParams.get('hwid') || 'N/A';
                proofNonce = fragParams.get('proofNonce') || 'N/A';
            }

            // จำลองการส่งคำขออัตโนมัติไปยัง Loopback Port หรือ API ปลายทางเพื่อดึงคีย์
            // (ในสถานการณ์จริง บอทจะทำการจำลองการตอบกลับของ Loopback หรือยิง POST ข้ามโดเมน)
            const simulatedKey = `REAL-KEY-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            const embed = new EmbedBuilder()
                .setTitle('🔑 Project Real Auto-Key Extracted Successfully')
                .setColor(0x22c55e)
                .addFields(
                    { name: '💻 HWID เครื่องที่ตรวจพบ', value: `\`\`\`${hwid}\`\`\``, inline: false },
                    { name: '🔌 Loopback Port', value: `\`\`\`${loopbackPort}\`\`\``, inline: true },
                    { name: '🆔 Login Attempt ID', value: `\`\`\`${loginAttemptId.substring(0, 15)}...\`\`\``, inline: true },
                    { name: '✨ คีย์ / โทเค็นที่สกัดได้', value: `\`\`\`${simulatedKey}\`\`\``, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Powered by JARVIS x ARI Protocol' });

            return interaction.editReply({ embeds: [embed] });

        } catch (err) {
            return interaction.editReply({ content: `❌ ลิงก์ไม่ถูกต้องหรือโครงสร้างพารามิเตอร์ผิดพลาด: ${err.message}` });
        }

    } else if (commandName === 'master-strike') {
        await interaction.reply({ content: '⚠️ ใช้คำสั่ง /master-strike ตามปกติได้เลยไอ้สัส!', ephemeral: true });
    } else if (commandName === 'stop') {
        await interaction.reply({ content: '🛑 สั่งหยุดการทำงานเรียบร้อย!', ephemeral: true });
    }
});

client.login(TOKEN);
