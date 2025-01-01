const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { token, clientId, adminRoleId } = require('./config.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const pinnedMessages = new Map();

const commands = [
    new SlashCommandBuilder()
        .setName('고정공지')
        .setDescription('채널에 고정적으로 메시지를 공지합니다.')
        .addChannelOption(option =>
            option
                .setName('채널')
                .setDescription('채널을 입력하세요.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('타이틀')
                .setDescription('타이틀을 입력하세요.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('메시지')
                .setDescription('메시지를 입력하세요.')
                .setRequired(true)
        ).toJSON(),

    new SlashCommandBuilder()
        .setName('공지삭제')
        .setDescription('채널에 고정적으로 메시지를 삭제합니다.')
        .addChannelOption(option =>
            option
                .setName('채널')
                .setDescription('채널을 입력하세요.')
                .setRequired(true)
        ).toJSON(),
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
    } catch (error) {
        console.error('SlashCommand 등록 중 오류 발생:', error);
    }
})();

client.once('ready', () => {
    console.log(`${client.user.tag} 봇이 준비되었습니다!`);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    const member = interaction.member;
    if (!member.roles.cache.has(adminRoleId)) {
        return interaction.reply({ content: '이 명령어를 실행할 권한이 없습니다.', ephemeral: true });
    }

    if (commandName === '고정공지') {
        const targetChannel = options.getChannel('채널');
        const title = options.getString('타이틀');
        const messageContent = options.getString('메시지');
    
        if (!targetChannel.isTextBased()) {
            return interaction.reply({ content: '텍스트 채널만 선택할 수 있습니다.', ephemeral: true });
        }
    
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(messageContent)
            .setColor("#FF0000");
    
        const existingPinnedMessage = pinnedMessages.get(targetChannel.id);
        if (existingPinnedMessage) {
            try {
                await existingPinnedMessage.delete();
            } catch (error) {
                console.error('이전 고정 메시지 삭제 중 오류 발생:', error);
            }
        }
    
        try {
            const pinnedMessage = await targetChannel.send({ embeds: [embed] });
            pinnedMessages.set(targetChannel.id, pinnedMessage);
            await interaction.reply({ content: `#${targetChannel.name} 채널에 공지가 설정되었습니다.`, ephemeral: true });
        } catch (error) {
            console.error('고정 메시지 전송 중 오류 발생:', error);
            await interaction.reply({ content: '공지 설정 중 오류가 발생했습니다.', ephemeral: true });
        }
    }

    if (commandName === '공지삭제') {
        const targetChannel = options.getChannel('채널');

        if (!targetChannel.isTextBased()) {
            return interaction.reply({ content: '텍스트 채널만 선택할 수 있습니다.', ephemeral: true });
        }

        const existingPinnedMessage = pinnedMessages.get(targetChannel.id);
        if (!existingPinnedMessage) {
            return interaction.reply({ content: '해당 채널에 고정된 공지가 없습니다.', ephemeral: true });
        }

        try {
            await existingPinnedMessage.delete();
            pinnedMessages.delete(targetChannel.id);
            await interaction.reply({ content: `#${targetChannel.name} 채널의 고정 공지가 삭제되었습니다.`, ephemeral: true });
        } catch (error) {
            console.error('고정 메시지 삭제 중 오류 발생:', error);
            await interaction.reply({ content: '공지 삭제 중 오류가 발생했습니다.', ephemeral: true });
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const existingPinnedMessage = pinnedMessages.get(message.channel.id);
    if (existingPinnedMessage) {
        try {
            await existingPinnedMessage.delete();
        } catch (error) {
            console.error('이전 고정 메시지 삭제 중 오류 발생:', error);
        }

        try {
            const pinnedEmbed = existingPinnedMessage.embeds[0];
            const pinnedMessage = await message.channel.send({ embeds: [pinnedEmbed] });
            pinnedMessages.set(message.channel.id, pinnedMessage);
        } catch (error) {
            console.error('새 고정 메시지 전송 중 오류 발생:', error);
        }
    }
});

process.on('uncaughtException', function (err) {
    console.log(err + "\n오류가 발생하였지만 원활한 서비스를 위하여 무시합니다. (정상가동중)");
});

client.login(token);
