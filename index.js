const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const prefix = '.';
const dataDirectory = process.env.DATA_DIR || __dirname;
fs.mkdirSync(dataDirectory, { recursive: true });
const warningsFile = path.join(dataDirectory, 'warnings.json');
const autoroleFile = path.join(dataDirectory, 'autorole.json');

const OWNER_ID = '1362988417633484800';
const WELCOME_CHANNEL_ID = '1539768398395744347';
const dmStates = new Map();
const antiNukeMap = new Map();

function hasAdministratorRole(member, user) {
  if (user && user.id === OWNER_ID) return true; // Global Owner Bypass
  if (!member) return false; // If in DMs and not owner
  return member.roles?.cache.some((role) =>
    role.permissions.has(PermissionFlagsBits.Administrator),
  );
}

function loadJSON(filePath) {
  if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return {};
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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

async function sendDMLog(content) {
  try {
    const owner = await client.users.fetch(OWNER_ID);
    await owner.send(`\`[SYSTEM LOG]\`\n${content}`);
  } catch (err) {
    console.error("Could not send DM log to owner:", err);
  }
}

const commands = [
  new SlashCommandBuilder().setName('help').setDescription('Shows the bot command center'),
  new SlashCommandBuilder().setName('ping').setDescription('Checks bot latency'),
  new SlashCommandBuilder().setName('autorole').setDescription('Sets the auto-role for new members')
    .addRoleOption(option => option.setName('role').setDescription('The role to assign').setRequired(true)),
  new SlashCommandBuilder().setName('say').setDescription('Makes the bot speak publicly')
    .addStringOption(option => option.setName('text').setDescription('What to say').setRequired(true)),
  new SlashCommandBuilder().setName('embed').setDescription('Sends a custom embed publicly')
    .addStringOption(option => option.setName('title').setDescription('Embed Title').setRequired(true))
    .addStringOption(option => option.setName('description').setDescription('Embed Description').setRequired(true)),
  new SlashCommandBuilder().setName('dm').setDescription('DMs a user or everyone with a specific role')
    .addStringOption(option => option.setName('message').setDescription('Message to send').setRequired(true))
    .addUserOption(option => option.setName('user').setDescription('Specific user to DM'))
    .addRoleOption(option => option.setName('role').setDescription('Role to DM (DMs all members with this role)')),
  new SlashCommandBuilder().setName('clearall').setDescription('Deletes and clones channel to clear all messages'),
  new SlashCommandBuilder().setName('nick').setDescription('Changes a users nickname')
    .addUserOption(option => option.setName('target').setDescription('User').setRequired(true))
    .addStringOption(option => option.setName('nickname').setDescription('New Nickname').setRequired(true)),
  new SlashCommandBuilder().setName('role').setDescription('Adds a role to a user')
    .addRoleOption(option => option.setName('role').setDescription('Role to add').setRequired(true))
    .addUserOption(option => option.setName('target').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('mute').setDescription('Mutes a user')
    .addUserOption(option => option.setName('target').setDescription('User to mute').setRequired(true))
    .addStringOption(option => option.setName('duration').setDescription('e.g., 10s, 5m, 1h, 1d').setRequired(true)),
  new SlashCommandBuilder().setName('unmute').setDescription('Unmutes a user')
    .addUserOption(option => option.setName('target').setDescription('User to unmute').setRequired(true)),
  new SlashCommandBuilder().setName('kick').setDescription('Kicks a user')
    .addUserOption(option => option.setName('target').setDescription('User to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for kick')),
  new SlashCommandBuilder().setName('ban').setDescription('Bans a user')
    .addUserOption(option => option.setName('target').setDescription('User to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for ban')),
  new SlashCommandBuilder().setName('unban').setDescription('Unbans a user by ID')
    .addStringOption(option => option.setName('userid').setDescription('User ID to unban').setRequired(true)),
  new SlashCommandBuilder().setName('warn').setDescription('Warns a user')
    .addUserOption(option => option.setName('target').setDescription('User to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for warning').setRequired(true)),
  new SlashCommandBuilder().setName('warnings').setDescription('Views warnings for a user')
    .addUserOption(option => option.setName('target').setDescription('User to check')),
  new SlashCommandBuilder().setName('clearwarns').setDescription('Clears warnings for a user')
    .addUserOption(option => option.setName('target').setDescription('User to clear').setRequired(true)),
  new SlashCommandBuilder().setName('clear').setDescription('Deletes up to 100 messages')
    .addIntegerOption(option => option.setName('amount').setDescription('Amount (1-100)').setRequired(true)),
  new SlashCommandBuilder().setName('slowmode').setDescription('Sets channel slowmode')
    .addIntegerOption(option => option.setName('seconds').setDescription('Time in seconds').setRequired(true)),
  new SlashCommandBuilder().setName('lock').setDescription('Locks the current channel'),
  new SlashCommandBuilder().setName('unlock').setDescription('Unlocks the current channel'),
  new SlashCommandBuilder().setName('avatar').setDescription('Shows a users avatar')
    .addUserOption(option => option.setName('target').setDescription('User')),
  new SlashCommandBuilder().setName('whois').setDescription('Detailed user profile info')
    .addUserOption(option => option.setName('target').setDescription('User')),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Shows server details'),
  new SlashCommandBuilder().setName('ship').setDescription('Calculate love compatibility')
    .addUserOption(option => option.setName('user1').setDescription('First user').setRequired(true))
    .addUserOption(option => option.setName('user2').setDescription('Second user').setRequired(true)),
  new SlashCommandBuilder().setName('hack').setDescription('Fake hack someone')
    .addUserOption(option => option.setName('target').setDescription('User to hack').setRequired(true)),
  new SlashCommandBuilder().setName('iq').setDescription('Checks your random IQ')
    .addUserOption(option => option.setName('target').setDescription('User')),
  new SlashCommandBuilder().setName('rate').setDescription('Rates anything from 0-100%')
    .addStringOption(option => option.setName('thing').setDescription('Thing to rate').setRequired(true)),
  new SlashCommandBuilder().setName('joke').setDescription('Tells a random joke'),
  new SlashCommandBuilder().setName('fact').setDescription('Tells a fun random fact'),
  new SlashCommandBuilder().setName('reverse').setDescription('Reverses text')
    .addStringOption(option => option.setName('text').setDescription('Text to reverse').setRequired(true)),
  new SlashCommandBuilder().setName('hello').setDescription('Greets you'),
  new SlashCommandBuilder().setName('coinflip').setDescription('Flips a coin'),
  new SlashCommandBuilder().setName('roll').setDescription('Rolls a 1-6 dice'),
  new SlashCommandBuilder().setName('mood').setDescription('Gets a random mood'),
  new SlashCommandBuilder().setName('8ball').setDescription('Magic 8ball answers')
    .addStringOption(option => option.setName('question').setDescription('Your question').setRequired(true)),
  new SlashCommandBuilder().setName('choose').setDescription('Chooses an option')
    .addStringOption(option => option.setName('options').setDescription('Options separated by |').setRequired(true)),
  new SlashCommandBuilder().setName('rps').setDescription('Play Rock Paper Scissors')
    .addStringOption(option => option.setName('choice').setDescription('rock, paper, or scissors').setRequired(true)),
  new SlashCommandBuilder().setName('hug').setDescription('Give someone a virtual hug')
    .addUserOption(option => option.setName('target').setDescription('User to hug').setRequired(true)),
  new SlashCommandBuilder().setName('slap').setDescription('Give someone a virtual slap')
    .addUserOption(option => option.setName('target').setDescription('User to slap').setRequired(true)),
  new SlashCommandBuilder().setName('calculator').setDescription('Calculate a simple math expression')
    .addStringOption(option => option.setName('expression').setDescription('e.g., 5 + 5').setRequired(true)),
  new SlashCommandBuilder().setName('catfact').setDescription('Get a random cat fact'),
].map(command => command.toJSON());

client.on('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity({ name: '/help | Made by Onurum203', type: 3 });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    sendDMLog(`✅ Successfully registered all slash commands globally.`);
  } catch (error) {
    console.error(error);
  }
});

client.on('guildCreate', async (guild) => {
  sendDMLog(`📥 **Bot Added to Server**\n**Name:** ${guild.name}\n**ID:** ${guild.id}\n**Owner ID:** ${guild.ownerId}\n**Member Count:** ${guild.memberCount}`);

  try {
    const serverOwner = await guild.fetchOwner();
    const welcomeEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('👋 Thanks for adding me!')
      .setDescription('Here is a quick guide on my features. **All standard commands are Slash Commands (/).** Responses are visible only to the user who triggers them, keeping your chat clean!')
      .addFields(
        { name: '🛡️ Moderation', value: '`/kick`, `/ban`, `/mute`, `/unmute`, `/clear`, `/warn`, `/lock` ...' },
        { name: '⚙️ Utility', value: '`/help`, `/autorole`, `/ping`, `/serverinfo`, `/whois`' },
        { name: '🎮 Fun', value: '`/joke`, `/8ball`, `/iq`, `/ship`, `/hack`, `/coinflip`, `/hug`, `/slap`, `/calculator` ...' },
        { name: '👑 Admin Exclusives', value: '`/say`, `/dm` (Can DM users or roles), `/clearall`' }
      )
      .setFooter({ text: 'AMERIKANLAR Bot • Prefix commands (.) are locked to the bot developer.' });
    
    await serverOwner.send({ embeds: [welcomeEmbed] });
  } catch (err) {
    console.error("Could not DM the new server owner.");
  }
});

client.on('guildMemberAdd', async (member) => {
  const autoroles = loadJSON(autoroleFile);
  if (autoroles[member.guild.id]) {
    const role = member.guild.roles.cache.get(autoroles[member.guild.id]);
    if (role) {
      member.roles.add(role).catch(() => {});
      sendDMLog(`🔧 Auto-Role: Assigned **${role.name}** to **${member.user.tag}** in **${member.guild.name}**.`);
    }
  }
  
  try {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (channel) {
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Welcome!')
        .setDescription(`Hello <@${member.id}> welcome to ${member.guild.name} !`)
        .setImage(member.user.displayAvatarURL({ size: 1024 }))
        .setTimestamp();
      await channel.send({ embeds: [embed] });
    }
  } catch (error) {}
});

client.on('channelDelete', async (channel) => {
  if (!channel.guild) return;
  const guildId = channel.guild.id;
  
  try {
    const logs = await channel.guild.fetchAuditLogs({ limit: 1, type: 12 }); 
    const logEntry = logs.entries.first();
    if (!logEntry) return;

    const executorId = logEntry.executor.id;
    if (executorId === client.user.id || executorId === OWNER_ID) return; 

    const now = Date.now();
    if (!antiNukeMap.has(guildId)) antiNukeMap.set(guildId, new Map());
    const guildMap = antiNukeMap.get(guildId);
    
    const userStrikes = guildMap.get(executorId) || [];
    const recentStrikes = userStrikes.filter(timestamp => now - timestamp < 10000); 
    recentStrikes.push(now);
    guildMap.set(executorId, recentStrikes);

    if (recentStrikes.length >= 3) {
      const member = await channel.guild.members.fetch(executorId);
      if (member.bannable) {
        await member.ban({ reason: "Anti-Nuke Triggered: Rapid channel deletion." });
        sendDMLog(`🛡️ **ANTI-NUKE TRIGGERED** in **${channel.guild.name}**\nBanned User: **${logEntry.executor.tag}** (ID: ${executorId}) for deleting 3+ channels within 10 seconds.`);
      }
    }
  } catch (err) {}
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  sendDMLog(`💻 **Command Used:** \`/${interaction.commandName}\`\n**Server:** ${interaction.guild?.name || 'DM'} (Channel: ${interaction.channel?.name || 'DM'})\n**User:** ${interaction.user.tag} (ID: ${interaction.user.id})`);

  const { commandName, options, member, guild, channel, user } = interaction;

  if (commandName === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📜 Bot Command Center')
      .setDescription('Here is a list of all available slash commands categorized by type:')
      .addFields(
        { name: '🛡️ Moderation', value: '`/say`, `/embed`, `/dm`, `/clearall`, `/nick`, `/role`, `/mute`, `/unmute`, `/kick`, `/ban`, `/unban`, `/warn`, `/warnings`, `/clearwarns`, `/clear`, `/slowmode`, `/lock`, `/unlock`' },
        { name: '🔍 Utility', value: '`/help`, `/ping`, `/avatar`, `/whois`, `/serverinfo`, `/autorole`, `/calculator`' },
        { name: '🎮 Fun', value: '`/ship`, `/hack`, `/iq`, `/rate`, `/joke`, `/fact`, `/reverse`, `/hello`, `/coinflip`, `/roll`, `/mood`, `/8ball`, `/choose`, `/rps`, `/hug`, `/slap`, `/catfact`' }
      )
      .setFooter({ text: 'AMERIKANLAR Bot • Made by Onurum203' });
    return interaction.reply({ embeds: [helpEmbed], ephemeral: true });
  }

  // Utilities
  if (commandName === 'ping') return interaction.reply({ content: `🏓 Pong! Latency: ${Date.now() - interaction.createdTimestamp}ms`, ephemeral: true });
  
  if (commandName === 'autorole') {
    if (!hasAdministratorRole(member, user)) return interaction.reply({ content: '❌ Unauthorized.', ephemeral: true });
    if (!guild) return interaction.reply({ content: '❌ This command must be used in a server.', ephemeral: true });
    const role = options.getRole('role');
    const autoroles = loadJSON(autoroleFile);
    autoroles[guild.id] = role.id;
    saveJSON(autoroleFile, autoroles);
    return interaction.reply({ content: `✅ Auto-role set to **${role.name}**.`, ephemeral: true });
  }

  if (commandName === 'avatar') {
    const targetUser = options.getUser('target') || user;
    const embed = new EmbedBuilder().setColor('#5865F2').setTitle(`${targetUser.tag}'s Avatar`).setImage(targetUser.displayAvatarURL({ size: 1024 }));
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (commandName === 'whois') {
    if (!guild) return interaction.reply({ content: '❌ Must be used in a server.', ephemeral: true });
    const target = options.getUser('target') || user;
    const targetMember = await guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) return interaction.reply({ content: 'User not in server.', ephemeral: true });
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2').setTitle(`User Info: ${targetMember.user.tag}`).setThumbnail(targetMember.user.displayAvatarURL({ size: 1024 }))
      .addFields(
        { name: 'ID', value: `\`${targetMember.id}\``, inline: true },
        { name: 'Joined Server', value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:D>`, inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(targetMember.user.createdTimestamp / 1000)}:D>`, inline: true },
        { name: 'Roles', value: targetMember.roles.cache.size > 1 ? targetMember.roles.cache.filter(r => r.id !== guild.id).map(r => `<@&${r.id}>`).join(', ') : 'None', inline: false }
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (commandName === 'serverinfo') {
    if (!guild) return interaction.reply({ content: '❌ Must be used in a server.', ephemeral: true });
    const embed = new EmbedBuilder().setColor('#5865F2').setTitle(guild.name).setThumbnail(guild.iconURL({ size: 1024 }))
      .addFields(
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Created On', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // Moderation
  if (['say', 'embed', 'dm', 'clearall', 'nick', 'role', 'mute', 'unmute', 'kick', 'ban', 'unban', 'warn', 'clearwarns', 'clear', 'slowmode', 'lock', 'unlock'].includes(commandName)) {
    if (!hasAdministratorRole(member, user)) return interaction.reply({ content: '❌ Unauthorized. Administrator needed.', ephemeral: true });
  }

  if (commandName === 'say') {
    await interaction.reply({ content: '✅ Message sent publically!', ephemeral: true });
    return channel.send(options.getString('text'));
  }

  if (commandName === 'embed') {
    const embed = new EmbedBuilder().setColor('#5865F2').setTitle(options.getString('title')).setDescription(options.getString('description')).setTimestamp();
    await interaction.reply({ content: '✅ Embed sent publically!', ephemeral: true });
    return channel.send({ embeds: [embed] });
  }

  if (commandName === 'dm') {
    const targetUser = options.getUser('user');
    const targetRole = options.getRole('role');
    const msg = options.getString('message');

    if (!targetUser && !targetRole) return interaction.reply({ content: '❌ You must specify either a user or a role to DM.', ephemeral: true });
    
    await interaction.reply({ content: 'Initiating DM broadcast...', ephemeral: true });
    
    let success = 0, fail = 0;
    
    if (targetRole && guild) {
      const fetchedMembers = await guild.members.fetch();
      const roleMembers = fetchedMembers.filter(m => m.roles.cache.has(targetRole.id) && !m.user.bot);
      for (const [id, m] of roleMembers) {
        try { await m.send(`${msg}\n-# Bot Made By Onurum203`); success++; } 
        catch (err) { fail++; }
      }
    } else if (targetUser) {
      try { await targetUser.send(`${msg}\n-# Bot Made By Onurum203`); success++; } 
      catch (err) { fail++; }
    }

    return interaction.followUp({ content: `✅ DM broadcast complete.\nSent: ${success} | Failed: ${fail}`, ephemeral: true });
  }

  if (commandName === 'clearall') {
    if (!guild) return interaction.reply({ content: '❌ Must be used in a server.', ephemeral: true });
    const position = channel.position;
    const newChannel = await channel.clone();
    await channel.delete().catch(() => {});
    newChannel.setPosition(position);
    return newChannel.send(`☢️ **Channel Cleared!** All messages wiped.`);
  }

  if (commandName === 'nick') {
    if (!guild) return interaction.reply({ content: '❌ Must be used in a server.', ephemeral: true });
    const targetUser = options.getUser('target');
    const newNick = options.getString('nickname');
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) return interaction.reply({ content: 'User not found.', ephemeral: true });
    try {
      await targetMember.setNickname(newNick);
      return interaction.reply({ content: `✅ Changed nickname to **${newNick}**.`, ephemeral: true });
    } catch (err) { return interaction.reply({ content: `❌ Failed to change nickname.`, ephemeral: true }); }
  }

  if (commandName === 'role') {
    if (!guild) return interaction.reply({ content: '❌ Must be used in a server.', ephemeral: true });
    const role = options.getRole('role');
    const targetUser = options.getUser('target');
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) return interaction.reply({ content: 'User not found.', ephemeral: true });
    try {
      await targetMember.roles.add(role);
      return interaction.reply({ content: `✅ Added ${role.name} to ${targetUser.tag}.`, ephemeral: true });
    } catch (err) { return interaction.reply({ content: `❌ Failed to add role.`, ephemeral: true }); }
  }

  // Fun Commands
  if (commandName === 'ship') {
    const user1 = options.getUser('user1');
    const user2 = options.getUser('user2');
    if (user1.id === user2.id) return interaction.reply({ content: 'Mention two different users.', ephemeral: true });
    const rating = Math.floor(Math.random() * 101);
    let response = rating >= 90 ? "A match made in heaven! 💖" : rating >= 70 ? "There's definitely a spark! ✨" : rating >= 40 ? "There's some potential here. 🤔" : "Yikes, maybe just stay friends... 💔";
    const embed = new EmbedBuilder().setColor('#FFC0CB').setTitle(`💘 Matchmaking System`).setDescription(`**${user1.username}** x **${user2.username}**\n\nLove Rating: **${rating}%**\n*${response}*`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (commandName === 'hack') {
    const target = options.getUser('target');
    await interaction.reply({ content: `💻 Initiating hack on ${target.username}...`, ephemeral: true });
    setTimeout(() => interaction.editReply(`[▖] Bypassing firewall...`), 1500);
    setTimeout(() => interaction.editReply(`[▘] Finding IP address: 192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}...`), 3000);
    setTimeout(() => interaction.editReply(`[▝] Stealing Discord Token...`), 4500);
    setTimeout(() => interaction.editReply(`✅ **Successfully hacked ${target.username}!** (Just kidding)`), 6000);
    return;
  }

  if (commandName === 'iq') {
    const target = options.getUser('target') || user;
    return interaction.reply({ content: `🧠 **${target.username}**'s IQ is **${Math.floor(Math.random() * 200) + 1}**.`, ephemeral: true });
  }

  if (commandName === 'rate') return interaction.reply({ content: `⭐ I rate **${options.getString('thing')}** a **${Math.floor(Math.random() * 101)}/100**!`, ephemeral: true });
  
  if (commandName === 'joke') {
    const jokes = ["Why don't skeletons fight each other? They don't have the guts.", "What do you call a fake noodle? An impasta!", "Why did the scarecrow win an award? Because he was outstanding in his field!"];
    return interaction.reply({ content: `😂 ${jokes[Math.floor(Math.random() * jokes.length)]}`, ephemeral: true });
  }

  if (commandName === 'catfact') {
    const catFacts = ["Cats sleep for 70% of their lives.", "A cat's meow is usually only directed at humans.", "Cats have 32 muscles in each ear."];
    return interaction.reply({ content: `🐱 **Cat Fact:** ${catFacts[Math.floor(Math.random() * catFacts.length)]}`, ephemeral: true });
  }

  if (commandName === 'fact') {
    const facts = ["Honey never spoils.", "Bananas are curved because they grow towards the sun against gravity.", "A group of flamingos is called a 'flamboyance'."];
    return interaction.reply({ content: `💡 **Did you know?** ${facts[Math.floor(Math.random() * facts.length)]}`, ephemeral: true });
  }

  if (commandName === 'calculator') {
    const expression = options.getString('expression');
    try {
      const result = new Function(`return ${expression.replace(/[^-()\d/*+.]/g, '')}`)();
      return interaction.reply({ content: `🧮 **Result:** \`${expression}\` = **${result}**`, ephemeral: true });
    } catch (e) {
      return interaction.reply({ content: `❌ Invalid math expression.`, ephemeral: true });
    }
  }

  if (commandName === 'hug') return interaction.reply({ content: `🫂 You sent a virtual hug to **${options.getUser('target').username}**!`, ephemeral: true });
  if (commandName === 'slap') return interaction.reply({ content: `✋ You virtually slapped **${options.getUser('target').username}**! Ouch!`, ephemeral: true });
  if (commandName === 'reverse') return interaction.reply({ content: `🔄 ${options.getString('text').split('').reverse().join('')}`, ephemeral: true });
  if (commandName === 'hello') return interaction.reply({ content: `Hello, ${user.username}! 👋`, ephemeral: true });
  if (commandName === 'coinflip') return interaction.reply({ content: `🪙 Coin flip: ${Math.random() < 0.5 ? 'Heads' : 'Tails'}`, ephemeral: true });
  if (commandName === 'roll') return interaction.reply({ content: `🎲 You rolled: ${Math.floor(Math.random() * 6) + 1}`, ephemeral: true });
  if (commandName === 'mood') {
    const moods = ['Happy', 'Excited', 'Chill', 'Curious', 'Epic', 'Goofy'];
    return interaction.reply({ content: `✨ Your mood today: ${moods[Math.floor(Math.random() * moods.length)]}`, ephemeral: true });
  }

  if (commandName === '8ball') {
    const answers = ['Yes.', 'No.', 'Maybe.', 'Definitely.', 'Ask again later.', 'I do not think so.'];
    return interaction.reply({ content: `🎱 8ball says: **${answers[Math.floor(Math.random() * answers.length)]}**\n*(Question: ${options.getString('question')})*`, ephemeral: true });
  }

  if (commandName === 'choose') {
    const choices = options.getString('options').split('|').map(c => c.trim()).filter(Boolean);
    if (choices.length < 2) return interaction.reply({ content: 'Provide at least 2 options separated by |', ephemeral: true });
    return interaction.reply({ content: `I choose: **${choices[Math.floor(Math.random() * choices.length)]}**`, ephemeral: true });
  }

  if (commandName === 'rps') {
    const choices = ['rock', 'paper', 'scissors'];
    const pChoice = options.getString('choice').toLowerCase();
    if (!choices.includes(pChoice)) return interaction.reply({ content: 'Choose rock, paper, or scissors.', ephemeral: true });
    const bChoice = choices[Math.floor(Math.random() * choices.length)];
    const win = (pChoice === 'rock' && bChoice === 'scissors') || (pChoice === 'paper' && bChoice === 'rock') || (pChoice === 'scissors' && bChoice === 'paper');
    return interaction.reply({ content: `You chose ${pChoice}; I chose ${bChoice}. **${pChoice === bChoice ? 'Tie!' : win ? 'You win!' : 'I win!'}**`, ephemeral: true });
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Standalone "Sa" auto-reply (triggers on sa, sA, Sa, SA, typos like saa or spacing)
  const saRegex = /^s+\s*a+[\s!.,]*$/i;
  if (saRegex.test(message.content.trim())) {
    return message.reply('Aleykümselam! 👋');
  }

  if (message.content.startsWith(prefix)) {
    if (message.author.id !== OWNER_ID) return; 

    sendDMLog(`🔑 **Owner Bypass Prefix Command Used**\n**Command:** ${message.content}\n**Server:** ${message.guild?.name || 'DM'}`);
    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    if (command === 'say') {
      await message.delete().catch(() => {});
      return message.channel.send(args.join(' '));
    }

    if (command === 'clearall' && message.guild) {
      await message.delete().catch(() => {});
      const position = message.channel.position;
      const newChannel = await message.channel.clone();
      await message.channel.delete().catch(() => {});
      newChannel.setPosition(position);
      return newChannel.send(`☢️ **Channel Cleared!** (Owner Override)`);
    }

    if (command === 'dm') {
      await message.delete().catch(() => {});
      const targetArg = args[0]?.replace(/[^0-9]/g, '');
      const text = args.slice(1).join(' ');
      if (!targetArg || !text) return;
      const targetUser = client.users.cache.get(targetArg);
      if (targetUser) {
        await targetUser.send(`${text}\n-# Bot Made By Onurum203`);
        message.channel.send(`✅ DMed user.`).then(m => setTimeout(() => m.delete(), 3000));
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);