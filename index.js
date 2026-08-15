const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const prefix = '.';
const dataDirectory = process.env.DATA_DIR || __dirname;
fs.mkdirSync(dataDirectory, { recursive: true });
const usersFile = path.join(dataDirectory, 'users.json');
const warningsFile = path.join(dataDirectory, 'warnings.json');

const adminOnlyCommands = new Set([
  'say',
  'dm',
  'mute',
  'unmute',
  'kick',
  'ban',
  'unban',
  'clear',
  'slowmode',
  'lock',
  'unlock',
  'warn',
  'warnings',
]);

const greetingTriggers = new Set([
  'sa',
  'selamun aleykum',
  'selamin aleykum',
  'selaymin aleykum',
]);

function hasAdministratorRole(member) {
  return member.roles.cache.some((role) =>
    role.permissions.has(PermissionFlagsBits.Administrator),
  );
}

function normalizeGreeting(content) {
  return content
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[!?.,]+$/g, '')
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');
}

function loadWarnings() {
  if (fs.existsSync(warningsFile)) {
    return JSON.parse(fs.readFileSync(warningsFile, 'utf8'));
  }
  return {};
}

function saveWarnings(warnings) {
  fs.writeFileSync(warningsFile, JSON.stringify(warnings, null, 2));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMembers,
  ],
});

client.on('clientReady', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity({
    name: '/Amerikanlar Made by Onurum203',
    type: 3,
  });
});

client.on('guildMemberAdd', async (member) => {
  try {
    await member.send(`Merhaba! ${member.user} AMERIKAN'a hoş geldin.`);
  } catch (error) {
    console.error(`Could not send welcome DM to ${member.user.tag}`);
  }
});

client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;

  if (greetingTriggers.has(normalizeGreeting(message.content))) {
    return message.channel.send('As').catch(() => {});
  }

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (!command) return;

  if (adminOnlyCommands.has(command) &&
      (!message.member || !hasAdministratorRole(message.member))) {
    return message.channel.send(
      '||Only members with a role that has the Administrator permission can use this command.||',
    ).catch(() => {});
  }

  if (command === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📜 Bot Command Center')
      .setDescription('Here is a list of all available commands categorized by type:')
      .addFields(
        {
          name: '🛡️ Moderation Commands (Admin)',
          value: 
            '`.say <message>` - Makes the bot send a message\n' +
            '`.dm @user <text>` - DMs a specific user\n' +
            '`.mute @user <time>` - Mutes a user (e.g., 10s, 5m, 1h, 1d)\n' +
            '`.unmute @user` - Unmutes a user\n' +
            '`.kick @user [reason]` - Kicks a user\n' +
            '`.ban @user [reason]` - Bans a user\n' +
            '`.unban <ID>` - Unbans a user by ID\n' +
            '`.warn @user [reason]` - Warns a user\n' +
            '`.warnings [@user]` - Views warnings\n' +
            '`.clear <1-100>` - Deletes messages\n' +
            '`.slowmode <seconds>` - Sets channel slowmode\n' +
            '`.lock` / `unlock` - Locks/unlocks channel',
          inline: false,
        },
        {
          name: '🔍 Utility & Info',
          value: 
            '`.help` - Shows this help menu\n' +
            '`.ping` - Checks bot latency\n' +
            '`.avatar [@user]` - Shows user avatar\n' +
            '`.serverinfo` - Shows server details',
          inline: false,
        },
        {
          name: '🎮 Fun Commands',
          value: 
            '`.hello` - Greets you\n' +
            '`.coinflip` - Flips a coin\n' +
            '`.roll` - Rolls a 1-6 dice\n' +
            '`.mood` - Gets a random mood\n' +
            '`.8ball <question>` - Magic 8ball answers\n' +
            '`.choose opt 1 | opt 2` - Chooses an option\n' +
            '`.rps <rock|paper|scissors>` - Play RPS',
          inline: false,
        }
      )
      .setFooter({ text: 'AMERIKANLAR Bot • Prefix: .' });

    await message.delete().catch(() => {});
    return message.channel.send({ content: `||Command list below:||`, embeds: [helpEmbed] }).catch(() => {});
  }

  if (command === 'ping') {
    return message.channel.send(`||🏓 Pong! Latency: ${Date.now() - message.createdTimestamp}ms||`);
  }

  if (command === 'say') {
    const text = args.join(' ');
    if (!text) return message.channel.send('||Use `.say <message>`||');
    
    await message.delete().catch(() => {});
    return message.channel.send(text);
  }

  if (command === 'dm') {
    await message.delete().catch(() => {});
    const targetUser = message.mentions.users.first();
    const text = args.slice(1).join(' ');

    if (!targetUser || !text) {
      return message.channel.send('||Use `.dm @user <text>`||').catch(() => {});
    }

    try {
      await targetUser.send(text);
      return message.channel.send(`||DM sent to ${targetUser.tag}||`).catch(() => {});
    } catch (error) {
      return message.channel.send('||I could not DM that user. They might have DMs closed.||').catch(() => {});
    }
  }

  if (command === 'mute') {
    await message.delete().catch(() => {});
    const targetMember = message.mentions.members.first();
    const durationStr = args.find(arg => /^\d+[smhd]$/i.test(arg));

    if (!targetMember || !durationStr) {
      return message.channel.send('||Use `.mute @user <time>` (e.g. 10s, 5m, 1h, 10d)||').catch(() => {});
    }

    if (!targetMember.moderatable) {
      return message.channel.send('||❌ I cannot mute that member. Their role might be higher than mine.||').catch(() => {});
    }

    const timeUnit = durationStr.slice(-1).toLowerCase();
    const timeVal = parseInt(durationStr.slice(0, -1));

    if (isNaN(timeVal)) return message.channel.send('||❌ Invalid duration format. Use s, m, h, or d.||').catch(() => {});

    let ms = 0;
    if (timeUnit === 's') ms = timeVal * 1000;
    else if (timeUnit === 'm') ms = timeVal * 60 * 1000;
    else if (timeUnit === 'h') ms = timeVal * 60 * 60 * 1000;
    else if (timeUnit === 'd') ms = timeVal * 24 * 60 * 60 * 1000;

    if (ms > 2419200000) return message.channel.send('||❌ Timeout duration cannot exceed 28 days.||').catch(() => {});

    try {
      await targetMember.timeout(ms, 'Muted via bot command');
      return message.channel.send(`||✅ ${targetMember.user.tag} has been muted for ${durationStr}.||`).catch(() => {});
    } catch (error) {
      return message.channel.send('||❌ I could not mute that member.||').catch(() => {});
    }
  }

  if (command === 'unmute') {
    await message.delete().catch(() => {});
    const targetMember = message.mentions.members.first();

    if (!targetMember) return message.channel.send('||Use `.unmute @user`||').catch(() => {});

    try {
      await targetMember.timeout(null, 'Unmuted via bot command');
      return message.channel.send(`||✅ ${targetMember.user.tag} has been unmuted.||`).catch(() => {});
    } catch (error) {
      return message.channel.send('||❌ I could not unmute that member.||').catch(() => {});
    }
  }

  if (command === 'kick') {
    await message.delete().catch(() => {});
    const targetMember = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!targetMember) return message.channel.send('||Use `.kick @user [reason]`||').catch(() => {});
    if (!targetMember.kickable) return message.channel.send('||❌ I cannot kick that member.||').catch(() => {});

    try {
      await targetMember.kick(reason);
      return message.channel.send(`||✅ ${targetMember.user.tag} was kicked. Reason: ${reason}||`).catch(() => {});
    } catch (error) {
      return message.channel.send('||❌ I could not kick that member.||').catch(() => {});
    }
  }

  if (command === 'ban') {
    await message.delete().catch(() => {});
    const targetMember = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!targetMember) return message.channel.send('||Use `.ban @user [reason]`||').catch(() => {});
    if (!targetMember.bannable) return message.channel.send('||❌ I cannot ban that member.||').catch(() => {});

    try {
      await targetMember.ban({ reason });
      return message.channel.send(`||✅ ${targetMember.user.tag} was banned. Reason: ${reason}||`).catch(() => {});
    } catch (error) {
      return message.channel.send('||❌ I could not ban that member.||').catch(() => {});
    }
  }

  if (command === 'unban') {
    await message.delete().catch(() => {});
    const targetId = args[0];

    if (!targetId) return message.channel.send('||Use `.unban <User ID>`||').catch(() => {});

    try {
      await message.guild.members.unban(targetId);
      return message.channel.send(`||✅ Successfully unbanned user ID: ${targetId}||`).catch(() => {});
    } catch (error) {
      return message.channel.send('||❌ I could not unban that member. Ensure the ID is correct and they are banned.||').catch(() => {});
    }
  }

  if (command === 'warn') {
    await message.delete().catch(() => {});
    const targetMember = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!targetMember) return message.channel.send('||Use `.warn @user [reason]`||').catch(() => {});

    const warnings = loadWarnings();
    if (!warnings[targetMember.id]) {
      warnings[targetMember.id] = [];
    }

    warnings[targetMember.id].push({
      reason,
      moderator: message.author.tag,
      date: new Date().toISOString(),
    });
    saveWarnings(warnings);

    return message.channel.send(`||⚠️ ${targetMember.user.tag} has been warned. Total warnings: ${warnings[targetMember.id].length}. Reason: ${reason}||`).catch(() => {});
  }

  if (command === 'warnings') {
    await message.delete().catch(() => {});
    const targetMember = message.mentions.members.first() || message.member;

    const warnings = loadWarnings();
    const userWarnings = warnings[targetMember.id] || [];

    if (userWarnings.length === 0) {
      return message.channel.send(`||✨ ${targetMember.user.tag} has no warnings.||`).catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle(`Warnings for ${targetMember.user.tag}`)
      .setDescription(userWarnings.map((w, index) => `**${index + 1}.** ${w.reason} *(by ${w.moderator})*`).join('\n'));

    return message.channel.send({ embeds: [embed] }).catch(() => {});
  }

  if (command === 'avatar') {
    const targetUser = message.mentions.users.first() || message.author;
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`${targetUser.tag}'s Avatar`)
      .setImage(targetUser.displayAvatarURL({ dynamic: true, size: 1024 }));

    return message.channel.send({ embeds: [embed] }).catch(() => {});
  }

  if (command === 'serverinfo') {
    const { guild } = message;
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Created On', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
      );

    return message.channel.send({ embeds: [embed] }).catch(() => {});
  }

  if (command === 'hello') {
    return message.channel.send(`||Hello, ${message.author.username}! 👋||`);
  }

  if (command === 'coinflip') {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    return message.channel.send(`||🪙 Coin flip: ${result}||`);
  }

  if (command === 'roll') {
    const roll = Math.floor(Math.random() * 6) + 1;
    return message.channel.send(`||🎲 You rolled: ${roll}||`);
  }

  if (command === 'mood') {
    const moods = ['Happy', 'Excited', 'Chill', 'Curious', 'Epic', 'Goofy'];
    const mood = moods[Math.floor(Math.random() * moods.length)];
    return message.channel.send(`||✨ Your mood today: ${mood}||`);
  }

  if (command === '8ball') {
    if (!args.length) return message.channel.send('||Use `.8ball <question>`||').catch(() => {});

    const answers = [
      'Yes.',
      'No.',
      'Maybe.',
      'Definitely.',
      'Ask again later.',
      'I do not think so.',
    ];
    const answer = answers[Math.floor(Math.random() * answers.length)];
    return message.channel.send(`||8ball says: ${answer}||`).catch(() => {});
  }

  if (command === 'choose') {
    const choices = args.join(' ')
      .split('|')
      .map((choice) => choice.trim())
      .filter(Boolean);

    if (choices.length < 2) {
      return message.channel.send('||Use `.choose option 1 | option 2`||').catch(() => {});
    }

    const choice = choices[Math.floor(Math.random() * choices.length)];
    return message.channel.send({
      content: `||I choose: ${choice}||`,
      allowedMentions: { parse: [] },
    }).catch(() => {});
  }

  if (command === 'rps') {
    const choices = ['rock', 'paper', 'scissors'];
    const playerChoice = args[0]?.toLowerCase();

    if (!choices.includes(playerChoice)) {
      return message.channel.send('||Use `.rps rock`, `.rps paper`, or `.rps scissors`||').catch(() => {});
    }

    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    const playerWins =
      (playerChoice === 'rock' && botChoice === 'scissors') ||
      (playerChoice === 'paper' && botChoice === 'rock') ||
      (playerChoice === 'scissors' && botChoice === 'paper');
    const result = playerChoice === botChoice ? 'It is a tie!' : playerWins ? 'You win!' : 'I win!';

    return message.channel.send(
      `||You chose ${playerChoice}; I chose ${botChoice}. ${result}||`,
    ).catch(() => {});
  }

  if (command === 'clear') {
    const amount = Number.parseInt(args[0], 10);

    if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
      return message.channel.send('||Use `.clear <1-100>`||').catch(() => {});
    }

    if (typeof message.channel.bulkDelete !== 'function') {
      return message.channel.send('||This command can only be used in a text channel.||').catch(() => {});
    }

    try {
      await message.delete().catch(() => {});
      const deleted = await message.channel.bulkDelete(amount, true);
      const confirmation = await message.channel.send(`||Deleted ${deleted.size} messages.||`);
      setTimeout(() => confirmation.delete().catch(() => {}), 3000);
      return;
    } catch (error) {
      return message.channel.send('||I could not delete those messages.||').catch(() => {});
    }
  }

  if (command === 'slowmode') {
    const seconds = Number.parseInt(args[0], 10);

    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 21600) {
      return message.channel.send('||Use `.slowmode <0-21600>`||').catch(() => {});
    }

    if (typeof message.channel.setRateLimitPerUser !== 'function') {
      return message.channel.send('||This command can only be used in a text channel.||').catch(() => {});
    }

    try {
      await message.channel.setRateLimitPerUser(seconds, `Set by ${message.author.tag}`);
      return message.channel.send(
        seconds === 0 ? '||Slowmode is off.||' : `||Slowmode set to ${seconds} seconds.||`,
      ).catch(() => {});
    } catch (error) {
      return message.channel.send('||I could not change slowmode in this channel.||').catch(() => {});
    }
  }

  if (command === 'lock' || command === 'unlock') {
    if (!message.channel.permissionOverwrites) {
      return message.channel.send('||This command can only be used in a guild channel.||').catch(() => {});
    }

    const isLocking = command === 'lock';
    try {
      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { SendMessages: isLocking ? false : null },
        `${isLocking ? 'Locked' : 'Unlocked'} by ${message.author.tag}`,
      );
      return message.channel.send(
        isLocking ? '||This channel is now locked.||' : '||This channel is now unlocked.||',
      ).catch(() => {});
    } catch (error) {
      return message.channel.send('||I could not update this channel.||').catch(() => {});
    }
  }
});

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('Missing DISCORD_TOKEN environment variable.');
  process.exit(1);
}

function shutdown(signal) {
  console.log(`Received ${signal}; shutting down.`);
  client.destroy();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

client.login(token);