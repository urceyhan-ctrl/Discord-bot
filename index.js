const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
  Partials,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const prefix = '.';
const dataDirectory = process.env.DATA_DIR || __dirname;
fs.mkdirSync(dataDirectory, { recursive: true });
const usersFile = path.join(dataDirectory, 'users.json');
const warningsFile = path.join(dataDirectory, 'warnings.json');

const OWNER_ID = '1362988417633484800';
const WELCOME_CHANNEL_ID = '1539768398395744347'; // Updated Welcome Channel ID[cite: 1]
const dmStates = new Map();

const adminOnlyCommands = new Set([
  'say',
  'dm',
  'role',
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
  'clearwarns',
  'clearall',
  'nick',
  'embed'
]);

function hasAdministratorRole(member) {
  return member.roles.cache.some((role) =>
    role.permissions.has(PermissionFlagsBits.Administrator),
  );
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
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.on('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity({
    name: '.help | Made by Onurum203',
    type: 3,
  });
});

client.on('guildMemberAdd', async (member) => {
  try {
    await member.send(`Hello <@${member.id}> welcome to ${member.guild.name}`);
  } catch (error) {
    // Silenced to prevent console spam if DMs are closed
  }

  try {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (channel) {
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Welcome!')
        .setDescription(`Hello <@${member.id}> welcome to ${member.guild.name} !`)
        .setImage(member.user.displayAvatarURL({ size: 1024 })) // Fixed image URL rendering for compatibility[cite: 1]
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Failed to send welcome message:", error);
  }
});

client.on('messageCreate', async (message) => {
  if (message.channel.type === 1 && !message.author.bot) {
    try {
      const owner = await client.users.fetch(OWNER_ID);
      if (message.author.id !== OWNER_ID) {
        owner.send(`[DM Log] From <@${message.author.id}> (${message.author.tag}): ${message.content}`);
      }
    } catch (err) {
      console.error(err);
    }

    if (message.author.id === OWNER_ID) {
      const content = message.content.trim();
      const state = dmStates.get(OWNER_ID);

      if (!state) {
        if (content.startsWith('.')) {
          const args = content.slice(1).split(' ');
          const cmd = args[0].toLowerCase();
          
          if (['ban', 'dm', 'mute', 'unmute', 'unban', 'kick'].includes(cmd)) {
            const guilds = client.guilds.cache.map(g => `- **${g.name}** (ID: \`${g.id}\`)`).join('\n');
            dmStates.set(OWNER_ID, { command: cmd, step: 'awaiting_guild' });
            return message.reply(`Select a server by typing its ID:\n${guilds}`);
          }
        }
      } else {
        if (state.step === 'awaiting_guild') {
          const guild = client.guilds.cache.get(content);
          if (!guild) return message.reply('Invalid Server ID. Please paste a valid Server ID from the list.');
          
          state.guildId = guild.id;

          if (['dm', 'mute', 'unmute'].includes(state.command)) {
            state.step = 'awaiting_channel';
            const channels = guild.channels.cache
              .filter(c => c.type === 0)
              .map(c => `- **#${c.name}** (ID: \`${c.id}\`)`)
              .slice(0, 30)
              .join('\n');
            return message.reply(`Server: **${guild.name}**. Now select a text channel by typing its ID:\n${channels || 'No text channels found.'}`);
          } else {
            state.step = 'awaiting_user';
            return message.reply(`Server: **${guild.name}**. Now type the User ID of the target member to ${state.command}:`);
          }
        } else if (state.step === 'awaiting_channel') {
          state.channelId = content;
          state.step = 'awaiting_user';
          return message.reply(`Now type the User ID of the target member:`);
        } else if (state.step === 'awaiting_user') {
          state.targetUserId = content;
          
          if (state.command === 'dm') {
            state.step = 'awaiting_message';
            return message.reply(`Type the message you want to send to this user:`);
          } else {
            await executeDmCommand(message, state);
            dmStates.delete(OWNER_ID);
          }
        } else if (state.step === 'awaiting_message') {
          state.messageContent = content;
          await executeDmCommand(message, state);
          dmStates.delete(OWNER_ID);
        }
        return;
      }
    }
  }

  if (!message.guild || message.author.bot) return;

  const trimmedContent = message.content.trim();
  if (trimmedContent.toLowerCase().startsWith('sa')) {
    return message.channel.send(`as Aleykümselam`).catch(() => {});
  }

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (!command) return;

  if (adminOnlyCommands.has(command) &&
      (!message.member || !hasAdministratorRole(message.member))) {
    return message.channel.send(`||Only members with a role that has the Administrator permission can use this command.||`).catch(() => {});
  }

  if (command === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📜 Bot Command Center')
      .setDescription('Here is a list of all available commands categorized by type:')
      .addFields(
        {
          name: '🛡️ Moderation & Management Commands',
          value: 
            '`.say <message>` - Makes the bot speak\n' +
            '`.embed <title> | <desc>` - Sends a custom embed\n' +
            '`.dm <@user|role|everyone> <text>` - DMs users\n' +
            '`.clearall` - Deletes and clones channel to clear all messages\n' +
            '`.nick @user <name>` - Changes a users nickname\n' +
            '`.role <@role> <@user>` - Adds a role to a user\n' +
            '`.mute @user <time>` - Mutes a user (e.g., 10s, 5m, 1h, 1d)\n' +
            '`.unmute @user` - Unmutes a user\n' +
            '`.kick @user [reason]` - Kicks a user\n' +
            '`.ban @user [reason]` - Bans a user\n' +
            '`.unban <ID>` - Unbans a user by ID\n' +
            '`.warn @user [reason]` - Warns a user\n' +
            '`.warnings [@user]` - Views warnings\n' +
            '`.clearwarns @user` - Clears warnings for a user\n' +
            '`.clear <1-100>` - Deletes messages\n' +
            '`.slowmode <seconds>` - Sets channel slowmode\n' +
            '`.lock` / `.unlock` - Locks/unlocks channel',
          inline: false,
        },
        {
          name: '🔍 Utility & Info',
          value: 
            '`.help` - Shows this help menu\n' +
            '`.ping` - Checks bot latency\n' +
            '`.avatar [@user]` - Shows user avatar\n' +
            '`.whois [@user]` - Detailed user profile info\n' +
            '`.serverinfo` - Shows server details',
          inline: false,
        },
        {
          name: '🎮 Fun Commands',
          value: 
            '`.ship @user1 @user2` - Calculate love compatibility\n' +
            '`.hack @user` - Fake hack someone\n' +
            '`.iq [@user]` - Checks your random IQ\n' +
            '`.rate <text>` - Rates anything from 0-100%\n' +
            '`.joke` - Tells a random joke\n' +
            '`.fact` - Tells a fun random fact\n' +
            '`.reverse <text>` - Reverses text\n' +
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

  if (command === 'clearall') {
    await message.delete().catch(() => {});
    const position = message.channel.position;
    const newChannel = await message.channel.clone();
    await message.channel.delete().catch(() => {});
    newChannel.setPosition(position);
    return newChannel.send(`☢️ **Channel Cleared!** All messages have been wiped.`);
  }

  if (command === 'embed') {
    await message.delete().catch(() => {});
    const contentArgs = args.join(' ').split('|').map(s => s.trim());
    if (contentArgs.length < 2) {
      return message.channel.send(`||Use \`.embed <Title> | <Description>\`||`).catch(() => {});
    }
    const customEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(contentArgs[0])
      .setDescription(contentArgs[1])
      .setTimestamp();
    return message.channel.send({ embeds: [customEmbed] });
  }

  if (command === 'nick') {
    await message.delete().catch(() => {});
    const targetMember = message.mentions.members.first();
    const newNick = args.slice(1).join(' ');

    if (!targetMember || !newNick) return message.channel.send(`||Use \`.nick @user <new nickname>\`||`).catch(() => {});
    
    try {
      await targetMember.setNickname(newNick);
      return message.channel.send(`✅ Changed nickname for ${targetMember.user.username} to **${newNick}**.`);
    } catch (error) {
      return message.channel.send(`❌ Failed to change nickname. My role might be too low.`);
    }
  }

  if (command === 'ship') {
    const user1 = message.mentions.users.first() || message.author;
    const user2 = message.mentions.users.last() || message.author;
    
    if (user1.id === user2.id) {
      return message.channel.send(`You can't ship someone with themselves! Mention two different users.`);
    }

    const rating = Math.floor(Math.random() * 101);
    let response = "";
    if (rating >= 90) response = "A match made in heaven! 💖";
    else if (rating >= 70) response = "There's definitely a spark! ✨";
    else if (rating >= 40) response = "There's some potential here. 🤔";
    else response = "Yikes, maybe just stay friends... 💔";

    const embed = new EmbedBuilder()
      .setColor('#FFC0CB')
      .setTitle(`💘 Matchmaking System`)
      .setDescription(`**${user1.username}** x **${user2.username}**\n\nLove Rating: **${rating}%**\n*${response}*`);
    
    return message.channel.send({ embeds: [embed] });
  }

  if (command === 'hack') {
    const target = message.mentions.users.first();
    if (!target) return message.channel.send(`Mention someone to hack! \`.hack @user\``);

    const msg = await message.channel.send(`💻 Initiating hack on ${target.username}...`);
    
    setTimeout(() => msg.edit(`[▖] Bypassing firewall...`), 1500);
    setTimeout(() => msg.edit(`[▘] Finding IP address: 192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}...`), 3000);
    setTimeout(() => msg.edit(`[▝] Stealing Discord Token...`), 4500);
    setTimeout(() => msg.edit(`[▗] Reporting account for being too awesome...`), 6000);
    setTimeout(() => msg.edit(`✅ **Successfully and totally legitimately hacked ${target.username}!** (Just kidding)`), 8000);
    return;
  }

  if (command === 'iq') {
    const target = message.mentions.users.first() || message.author;
    const iq = Math.floor(Math.random() * 200) + 1;
    return message.channel.send(`🧠 **${target.username}**'s IQ is **${iq}**.`);
  }

  if (command === 'rate') {
    const query = args.join(' ');
    if (!query) return message.channel.send(`What would you like me to rate? \`.rate <thing>\``);
    const rating = Math.floor(Math.random() * 101);
    return message.channel.send(`⭐ I rate **${query}** a **${rating}/100**!`);
  }

  if (command === 'joke') {
    const jokes = [
      "Why don't skeletons fight each other? They don't have the guts.",
      "What do you call a fake noodle? An impasta!",
      "Why did the scarecrow win an award? Because he was outstanding in his field!",
      "I told my wife she was drawing her eyebrows too high. She looked surprised."
    ];
    return message.channel.send(`😂 ${jokes[Math.floor(Math.random() * jokes.length)]}`);
  }

  if (command === 'fact') {
    const facts = [
      "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old!",
      "Bananas are curved because they grow towards the sun against gravity.",
      "A group of flamingos is called a 'flamboyance'.",
      "Sea otters hold hands while sleeping so they don't drift apart."
    ];
    return message.channel.send(`💡 **Did you know?** ${facts[Math.floor(Math.random() * facts.length)]}`);
  }

  if (command === 'reverse') {
    const text = args.join(' ');
    if (!text) return message.channel.send(`Provide text to reverse! \`.reverse <text>\``);
    return message.channel.send(`🔄 ${text.split('').reverse().join('')}`);
  }

  if (command === 'ping') {
    return message.channel.send(`||🏓 Pong! Latency: ${Date.now() - message.createdTimestamp}ms||`);
  }

  if (command === 'say') {
    const text = args.join(' ');
    if (!text) return message.channel.send(`||Use \`.say <message>\`||`);
    
    await message.delete().catch(() => {});
    return message.channel.send(text);
  }

  if (command === 'dm') {
    await message.delete().catch(() => {});
    const targetArg = args[0]?.toLowerCase();
    const text = args.slice(1).join(' ');

    if (!targetArg || !text) {
      return message.channel.send(`||Use \`.dm <@user|role|everyone|here> <text>\`||`).catch(() => {});
    }

    await message.guild.members.fetch();

    let targets = [];
    const targetRole = message.mentions.roles.first() || message.guild.roles.cache.get(targetArg.replace(/[^0-9]/g, ''));

    if (targetArg === '@everyone' || targetArg === 'everyone') {
      targets = Array.from(message.guild.members.cache.values()).filter(m => !m.user.bot);
    } else if (targetArg === '@here' || targetArg === 'here') {
      targets = Array.from(message.guild.members.cache.values()).filter(m => !m.user.bot && m.presence && m.presence.status !== 'offline');
    } else if (targetRole) {
      targets = Array.from(targetRole.members.values()).filter(m => !m.user.bot);
    } else {
      const targetUser = message.mentions.users.first() || client.users.cache.get(targetArg.replace(/[^0-9]/g, ''));
      if (targetUser) {
        const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
        if (member) targets.push(member);
      }
    }

    if (targets.length === 0) {
      return message.channel.send(`||❌ No valid targets found or unable to resolve mention/role/everyone/here.||`).catch(() => {});
    }

    let successCount = 0;
    let failCount = 0;

    for (const member of targets) {
      try {
        await member.send(`${text}\n-# Bot Made By Onurum203`);
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    return message.channel.send(`||✅ DM broadcast complete. Sent: ${successCount}, Failed/Closed DMs: ${failCount}||`).catch(() => {});
  }

  if (command === 'role') {
    await message.delete().catch(() => {});
    const targetRole = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]?.replace(/[^0-9]/g, ''));
    const targetMember = message.mentions.members.first() || message.guild.members.cache.get(args[1]?.replace(/[^0-9]/g, ''));

    if (!targetRole || !targetMember) {
      return message.channel.send(`||Use \`.role <ping role> <user>\`||`).catch(() => {});
    }

    if (message.guild.members.me.roles.highest.position <= targetRole.position) {
      return message.channel.send(`||❌ I cannot assign that role because it is higher than or equal to my highest role.||`).catch(() => {});
    }

    try {
      await targetMember.roles.add(targetRole, `Added via .role command by ${message.author.tag}`);
      return message.channel.send(`||✅ Successfully added ${targetRole.name} to ${targetMember.user.tag}.||`).catch(() => {});
    } catch (error) {
      return message.channel.send(`||❌ Failed to add role. Check bot permissions.||`).catch(() => {});
    }
  }

  if (command === 'mute') {
    await message.delete().catch(() => {});
    const targetMember = message.mentions.members.first();
    const durationStr = args.find(arg => /^\d+[smhd]$/i.test(arg));

    if (!targetMember || !durationStr) {
      return message.channel.send(`||Use \`.mute @user <time>\` (e.g. 10s, 5m, 1h, 10d)||`).catch(() => {});
    }

    if (!targetMember.moderatable) {
      return message.channel.send(`||❌ I cannot mute that member. Their role might be higher than mine.||`).catch(() => {});
    }

    const timeUnit = durationStr.slice(-1).toLowerCase();
    const timeVal = parseInt(durationStr.slice(0, -1));

    if (isNaN(timeVal)) return message.channel.send(`||❌ Invalid duration format. Use s, m, h, or d.||`).catch(() => {});

    let ms = 0;
    if (timeUnit === 's') ms = timeVal * 1000;
    else if (timeUnit === 'm') ms = timeVal * 60 * 1000;
    else if (timeUnit === 'h') ms = timeVal * 60 * 60 * 1000;
    else if (timeUnit === 'd') ms = timeVal * 24 * 60 * 60 * 1000;

    if (ms > 2419200000) return message.channel.send(`||❌ Timeout duration cannot exceed 28 days.||`).catch(() => {});

    try {
      await targetMember.timeout(ms, 'Muted via bot command');
      return message.channel.send(`||✅ ${targetMember.user.tag} has been muted for ${durationStr}.||`).catch(() => {});
    } catch (error) {
      return message.channel.send(`||❌ I could not mute that member.||`).catch(() => {});
    }
  }

  if (command === 'unmute') {
    await message.delete().catch(() => {});
    const targetMember = message.mentions.members.first();

    if (!targetMember) return message.channel.send(`||Use \`.unmute @user\`||`).catch(() => {});

    try {
      await targetMember.timeout(null, 'Unmuted via bot command');
      return message.channel.send(`||✅ ${targetMember.user.tag} has been unmuted.||`).catch(() => {});
    } catch (error) {
      return message.channel.send(`||❌ I could not unmute that member.||`).catch(() => {});
    }
  }

  if (command === 'kick') {
    await message.delete().catch(() => {});
    const targetMember = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!targetMember) return message.channel.send(`||Use \`.kick @user [reason]\`||`).catch(() => {});
    if (!targetMember.kickable) return message.channel.send(`||❌ I cannot kick that member.||`).catch(() => {});

    try {
      await targetMember.kick(reason);
      return message.channel.send(`||✅ ${targetMember.user.tag} was kicked. Reason: ${reason}||`).catch(() => {});
    } catch (error) {
      return message.channel.send(`||❌ I could not kick that member.||`).catch(() => {});
    }
  }

  if (command === 'ban') {
    await message.delete().catch(() => {});
    const targetMember = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!targetMember) return message.channel.send(`||Use \`.ban @user [reason]\`||`).catch(() => {});
    if (!targetMember.bannable) return message.channel.send(`||❌ I cannot ban that member.||`).catch(() => {});

    try {
      await targetMember.ban({ reason });
      return message.channel.send(`||✅ ${targetMember.user.tag} was banned. Reason: ${reason}||`).catch(() => {});
    } catch (error) {
      return message.channel.send(`||❌ I could not ban that member.||`).catch(() => {});
    }
  }

  if (command === 'unban') {
    await message.delete().catch(() => {});
    const targetId = args[0];

    if (!targetId) return message.channel.send(`||Use \`.unban <User ID>\`||`).catch(() => {});

    try {
      await message.guild.members.unban(targetId);
      return message.channel.send(`||✅ Successfully unbanned user ID: ${targetId}||`).catch(() => {});
    } catch (error) {
      return message.channel.send(`||❌ I could not unban that member. Ensure the ID is correct and they are banned.||`).catch(() => {});
    }
  }

  if (command === 'warn') {
    await message.delete().catch(() => {});
    const targetMember = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!targetMember) return message.channel.send(`||Use \`.warn @user [reason]\`||`).catch(() => {});

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

  if (command === 'clearwarns') {
    await message.delete().catch(() => {});
    const targetMember = message.mentions.members.first();
    if (!targetMember) return message.channel.send(`||Use \`.clearwarns @user\`||`).catch(() => {});

    const warnings = loadWarnings();
    if (!warnings[targetMember.id] || warnings[targetMember.id].length === 0) {
      return message.channel.send(`||${targetMember.user.tag} has no warnings to clear.||`);
    }

    delete warnings[targetMember.id];
    saveWarnings(warnings);
    return message.channel.send(`||✅ Successfully cleared all warnings for ${targetMember.user.tag}.||`);
  }

  if (command === 'avatar') {
    const targetUser = message.mentions.users.first() || message.author;
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`${targetUser.tag}'s Avatar`)
      .setImage(targetUser.displayAvatarURL({ size: 1024 }));

    return message.channel.send({ embeds: [embed] }).catch(() => {});
  }

  if (command === 'whois') {
    const targetMember = message.mentions.members.first() || message.member;
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`User Info: ${targetMember.user.tag}`)
      .setThumbnail(targetMember.user.displayAvatarURL({ size: 1024 }))
      .addFields(
        { name: 'ID', value: `\`${targetMember.id}\``, inline: true },
        { name: 'Joined Server', value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:D>`, inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(targetMember.user.createdTimestamp / 1000)}:D>`, inline: true },
        { name: 'Roles', value: targetMember.roles.cache.size > 1 ? targetMember.roles.cache.filter(r => r.id !== message.guild.id).map(r => `<@&${r.id}>`).join(', ') : 'None', inline: false }
      );
    return message.channel.send({ embeds: [embed] });
  }

  if (command === 'serverinfo') {
    const { guild } = message;
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 1024 }))
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
    if (!args.length) return message.channel.send(`||Use \`.8ball <question>\`||`).catch(() => {});

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
      return message.channel.send(`||Use \`.choose option 1 | option 2\`||`).catch(() => {});
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
      return message.channel.send(`||Use \`.rps rock\`, \`.rps paper\`, or \`.rps scissors\`||`).catch(() => {});
    }

    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    const playerWins =
      (playerChoice === 'rock' && botChoice === 'scissors') ||
      (playerChoice === 'paper' && botChoice === 'rock') ||
      (playerChoice === 'scissors' && botChoice === 'paper');
    const result = playerChoice === botChoice ? 'It is a tie!' : playerWins ? 'You win!' : 'I win!';

    return message.channel.send(`||You chose ${playerChoice}; I chose ${botChoice}. ${result}||`).catch(() => {});
  }

  if (command === 'clear') {
    const amount = Number.parseInt(args[0], 10);

    if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
      return message.channel.send(`||Use \`.clear <1-100>\`||`).catch(() => {});
    }

    if (typeof message.channel.bulkDelete !== 'function') {
      return message.channel.send(`||This command can only be used in a text channel.||`).catch(() => {});
    }

    try {
      await message.delete().catch(() => {});
      const deleted = await message.channel.bulkDelete(amount, true);
      const confirmation = await message.channel.send(`||Deleted ${deleted.size} messages.||`);
      setTimeout(() => confirmation.delete().catch(() => {}), 3000);
      return;
    } catch (error) {
      return message.channel.send(`||I could not delete those messages.||`).catch(() => {});
    }
  }

  if (command === 'slowmode') {
    const seconds = Number.parseInt(args[0], 10);

    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 21600) {
      return message.channel.send(`||Use \`.slowmode <0-21600>\`||`).catch(() => {});
    }

    if (typeof message.channel.setRateLimitPerUser !== 'function') {
      return message.channel.send(`||This command can only be used in a text channel.||`).catch(() => {});
    }

    try {
      await message.channel.setRateLimitPerUser(seconds, `Set by ${message.author.tag}`);
      return message.channel.send(
        seconds === 0 ? `||Slowmode is off.||` : `||Slowmode set to ${seconds} seconds.||`,
      ).catch(() => {});
    } catch (error) {
      return message.channel.send(`||I could not change slowmode in this channel.||`).catch(() => {});
    }
  }

  if (command === 'lock' || command === 'unlock') {
    if (!message.channel.permissionOverwrites) {
      return message.channel.send(`||This command can only be used in a guild channel.||`).catch(() => {});
    }

    const isLocking = command === 'lock';
    try {
      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { SendMessages: isLocking ? false : null },
        `${isLocking ? 'Locked' : 'Unlocked'} by ${message.author.tag}`,
      );
      return message.channel.send(
        isLocking ? `||This channel is now locked.||` : `||This channel is now unlocked.||`,
      ).catch(() => {});
    } catch (error) {
      return message.channel.send(`||I could not update this channel.||`).catch(() => {});
    }
  }
});

async function executeDmCommand(message, state) {
  const guild = client.guilds.cache.get(state.guildId);
  if (!guild) return message.reply('Error: Guild not found.');

  const owner = await client.users.fetch(OWNER_ID);
  let logText = `[Action Log] Command: .${state.command} | Server: ${guild.name} | Target: ${state.targetUserId}`;

  try {
    if (state.command === 'ban') {
      await guild.members.ban(state.targetUserId, { reason: 'Executed via owner DM command' });
      logText += ` | Status: Success (Banned)`;
    } else if (state.command === 'kick') {
      const member = await guild.members.fetch(state.targetUserId);
      await member.kick('Executed via owner DM command');
      logText += ` | Status: Success (Kicked)`;
    } else if (state.command === 'unban') {
      await guild.members.unban(state.targetUserId);
      logText += ` | Status: Success (Unbanned)`;
    } else if (state.command === 'mute') {
      const member = await guild.members.fetch(state.targetUserId);
      await member.timeout(60 * 60 * 1000, 'Executed via owner DM command');
      logText += ` | Status: Success (Muted for 1h)`;
    } else if (state.command === 'unmute') {
      const member = await guild.members.fetch(state.targetUserId);
      await member.timeout(null, 'Unmuted via owner DM command');
      logText += ` | Status: Success (Unmuted)`;
    } else if (state.command === 'dm') {
      let targetChannel;
      if (state.channelId) {
        targetChannel = guild.channels.cache.get(state.channelId);
      }
      if (!targetChannel) {
        targetChannel = guild.channels.cache.find(c => c.name.toLowerCase().includes('announcement') && c.type === 0) || guild.channels.cache.find(c => c.type === 0);
      }
      if (targetChannel) {
        await targetChannel.send(`<@${state.targetUserId}> ${state.messageContent}\n-# Bot Made By Onurum203`);
        logText += ` | Status: Success (In #${targetChannel.name})`;
      } else {
        const user = await client.users.fetch(state.targetUserId);
        await user.send(`${state.messageContent}\n-# Bot Made By Onurum203`);
        logText += ` | Status: Success (Direct DM)`;
      }
    }
  } catch (err) {
    logText += ` | Status: Failed (${err.message})`;
  }

  await message.reply(logText);
  try {
    await owner.send(logText);
  } catch {}
}

client.login(process.env.DISCORD_TOKEN);