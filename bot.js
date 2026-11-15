/**
 * ============================================================================
 * JEFF FUJI - PROJECT REAL EXECUTOR AUTH PARSER & BYPASS ENGINE v18
 * Developed under JARVIS x ARI Protocol
 * ============================================================================
 */

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const https = require('https');
const http = require('http');

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
            .setName('parse-real-auth')
            .setDescription('แกะพารามิเตอร์ HWID และ Loopback Auth จากลิงก์ Project Real')
            .addStringOption(option => 
                option.setName('auth_link')
                    .setDescription('วางลิงก์ยาวๆ ของ projectreal.gg ที่นี่')
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

    if (commandName === 'parse-real-auth') {
        const authLink = interaction.options.getString('auth_link');

        await interaction.deferReply({ ephemeral: true });

        try {
            // ใช้ URL parser เพื่อแยกแยะพารามิเตอร์และ Hash Fragment
            // แก้ไขปัญหา URL ที่มีเครื่องหมาย # โดยการแปลงเป็น query ชั่วคราวถ้าจำเป็น
            const cleanUrl = authLink.replace('#', '&real_fragment=');
            const parsedUrl = new URL(cleanUrl);

            const loopbackPort = parsedUrl.searchParams.get('loopback_port') || '58600';
            const state = parsedUrl.searchParams.get('state') || 'N/A';
            const loginAttemptId = parsedUrl.searchParams.get('login_attempt_id') || 'N/A';
            const realFragment = parsedUrl.searchParams.get('real_fragment') || '';

            // ดึง HWID จาก fragment ถ้ามี
            let hwid = 'N/A';
            let proofTs = 'N/A';
            if (realFragment) {
                const fragmentParams = new URLSearchParams(realFragment);
                hwid = fragmentParams.get('hwid') || 'N/A';
                proofTs = fragmentParams.get('proofTs') || 'N/A';
            }

            const embed = new EmbedBuilder()
                .setTitle('🔍 Project Real Auth Token Inspector')
                .setColor(0x3b82f6)
                .addFields(
                    { name: '💻 HWID เครื่องเป้าหมาย', value: `\`\`\`${hwid}\`\`\``, inline: false },
                    { name: '🔌 Loopback Port', value: `\`\`\`${loopbackPort}\`\`\``, inline: true },
                    { name: '🆔 Login Attempt ID', value: `\`\`\`${loginAttemptId}\`\`\``, inline: true },
                    { name: '⏰ Proof Timestamp', value: `\`\`\`${proofTs}\`\`\``, inline: true },
                    { name: '🔗 State Parameter', value: `\`\`\`${state.substring(0, 30)}...\`\`\``, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Powered by JARVIS x ARI Protocol' });

            return interaction.editReply({ embeds: [embed] });

        } else if (err) {
            return interaction.editReply({ content: `❌ ลิงก์ไม่ถูกต้องหรือพารามิเตอร์พัง: ${err.message}` });
        }

        } catch (err) {
            return interaction.editReply({ content: `❌ เกิดข้อผิดพลาดในการแยกวิเคราะห์ลิงก์: ${err.message}` });
        }
    } else if (commandName === 'master-strike') {
        await interaction.reply({ content: '⚠️ ใช้คำสั่ง /master-strike ตามปกติได้เลยไอ้สัส!', ephemeral: true });
    } else if (commandName === 'stop') {
        await interaction.reply({ content: '🛑 สั่งหยุดการทำงานเรียบร้อย!', ephemeral: true });
    }
});

client.login(TOKEN);
