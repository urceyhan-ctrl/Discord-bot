const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const OWNER_ID = '1362988417633484800';
const OWNER_USERNAME = 'onurum203';
const DATA_DIR = process.env.DATA_DIR || __dirname;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID || '1539768398395744347';
const PREFIX = '.';
const COLOR = '#5865F2';
const RED = '#ED4245';
const GREEN = '#57F287';
const GOLD = '#FEE75C';

fs.mkdirSync(DATA_DIR, { recursive: true });
const files = {
  warnings: path.join(DATA_DIR, 'warnings.json'),
  autorole: path.join(DATA_DIR, 'autorole.json'),
  memberstats: path.join(DATA_DIR, 'memberstats.json'),
  antinuke: path.join(DATA_DIR, 'antinuke.json'),
};

function loadJSON(file) {
  try {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`Could not read ${file}:`, error);
    return {};
  }
}
function saveJSON(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}
function isOwner(user) {
  return Boolean(user && (user.id === OWNER_ID || user.username?.toLowerCase() === OWNER_USERNAME));
}
function isAdmin(member, user) {
  return isOwner(user) || Boolean(member?.permissions?.has(PermissionFlagsBits.Administrator));
}
function embed(title, description, color = COLOR) {
  const e = new EmbedBuilder().setColor(color).setTitle(String(title)).setTimestamp();
  if (description) e.setDescription(String(description));
  return e;
}
function safeText(value, max = 1000) {
  return String(value ?? '').slice(0, max).replace(/`/g, 'ˋ');
}
function guildLabel(guild) {
  return guild ? `${guild.name} (${guild.id})` : 'Direct Messages';
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

async function sendOwnerLog(title, fields = [], color = COLOR) {
  const logEmbed = new EmbedBuilder().setColor(color).setTitle(`[SYSTEM LOG] ${title}`).addFields(fields).setTimestamp();
  try {
    const owner = await client.users.fetch(OWNER_ID);
    await owner.send({ embeds: [logEmbed] });
  } catch (error) {
    console.error('Owner DM log failed:', error.message);
  }
}
function logField(name, value, inline = false) {
  return { name, value: safeText(value, 1024) || 'None', inline };
}

function serverInviteLabel(guild) {
  const vanity = guild.vanityURLCode;
  const slug = vanity || guild.name.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80) || guild.id;
  return `discord.gg/${slug}`;
}
async function updateMemberStats(guild) {
  const stats = loadJSON(files.memberstats);
  const channelId = stats[guild.id];
  if (!channelId) return;
  const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
  if (!channel) return;
  const name = `🔗 ${serverInviteLabel(guild)} | 👤 ${guild.memberCount}`.slice(0, 100);
  if (channel.name !== name) await channel.setName(name).catch(() => {});
}

const adminNames = ['say', 'embed', 'embedsay', 'dm', 'clearall', 'nuke', 'channeldelete', 'nick', 'role', 'removerole', 'dltroles', 'mute', 'unmute', 'kick', 'ban', 'unban', 'warn', 'warnings', 'clearwarns', 'clear', 'slowmode', 'lock', 'unlock', 'autorole', 'memberstats', 'antinuke'];
const utilityNames = ['dashboard', 'ping', 'avatar', 'whois', 'userinfo', 'serverinfo', 'serverbanner', 'membercount', 'banner', 'calculator', 'password', 'ascii', 'poll'];
const funNames = ['ship', 'hack', 'iq', 'rate', 'joke', 'fact', 'catfact', 'reverse', 'hello', 'coinflip', 'roll', 'mood', '8ball', 'choose', 'rps', 'hug', 'slap'];

const commands = [
  new SlashCommandBuilder().setName('commands').setDescription('Open the interactive command menu'),
  new SlashCommandBuilder().setName('dashboard').setDescription('View your permissions and bot dashboard'),
  new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
  new SlashCommandBuilder().setName('autorole').setDescription('Set the role assigned to new members').addRoleOption(o => o.setName('role').setDescription('Role to assign').setRequired(true)),
  new SlashCommandBuilder().setName('memberstats').setDescription('Create or update the live member-count voice channel'),
  new SlashCommandBuilder().setName('antinuke').setDescription('Enable or disable anti-nuke protection').addBooleanOption(o => o.setName('status').setDescription('Enable or disable').setRequired(true)),
  new SlashCommandBuilder().setName('say').setDescription('Send a message').addStringOption(o => o.setName('text').setDescription('Message').setRequired(true)),
  new SlashCommandBuilder().setName('embed').setDescription('Send an embed').addStringOption(o => o.setName('title').setDescription('Title').setRequired(true)).addStringOption(o => o.setName('description').setDescription('Description').setRequired(true)),
  new SlashCommandBuilder().setName('embedsay').setDescription('Send an authored embed').addStringOption(o => o.setName('title').setDescription('Title').setRequired(true)).addStringOption(o => o.setName('message').setDescription('Message').setRequired(true)),
  new SlashCommandBuilder().setName('dm').setDescription('Send an embed DM to a user or role').addStringOption(o => o.setName('message').setDescription('Message').setRequired(true)).addUserOption(o => o.setName('user').setDescription('User')).addRoleOption(o => o.setName('role').setDescription('Role')),
  new SlashCommandBuilder().setName('clearall').setDescription('Clone the current channel and remove the old one'),
  new SlashCommandBuilder().setName('nuke').setDescription('Clone and reset the current channel'),
  new SlashCommandBuilder().setName('channeldelete').setDescription('Delete the current channel'),
  new SlashCommandBuilder().setName('nick').setDescription('Change a nickname').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)).addStringOption(o => o.setName('nickname').setDescription('New nickname').setRequired(true)),
  new SlashCommandBuilder().setName('role').setDescription('Give a role').addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)).addUserOption(o => o.setName('target').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('removerole').setDescription('Remove a role').addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)).addUserOption(o => o.setName('target').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('dltroles').setDescription('Delete removable roles in this server').addBooleanOption(o => o.setName('confirm').setDescription('Must be true to confirm role deletion').setRequired(true)),
  new SlashCommandBuilder().setName('mute').setDescription('Timeout a user').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)).addStringOption(o => o.setName('duration').setDescription('Examples: 30s, 10m, 1h, 1d').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason')),
  new SlashCommandBuilder().setName('unmute').setDescription('Remove a timeout').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('kick').setDescription('Kick a user').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason')),
  new SlashCommandBuilder().setName('ban').setDescription('Ban a user').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason')),
  new SlashCommandBuilder().setName('unban').setDescription('Unban by user ID').addStringOption(o => o.setName('userid').setDescription('User ID').setRequired(true)),
  new SlashCommandBuilder().setName('warn').setDescription('Warn a user').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),
  new SlashCommandBuilder().setName('warnings').setDescription('View warnings').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('clearwarns').setDescription('Clear warnings').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('clear').setDescription('Delete up to 100 messages').addIntegerOption(o => o.setName('amount').setDescription('1-100').setMinValue(1).setMaxValue(100).setRequired(true)),
  new SlashCommandBuilder().setName('slowmode').setDescription('Set channel slowmode').addIntegerOption(o => o.setName('seconds').setDescription('0-21600').setMinValue(0).setMaxValue(21600).setRequired(true)),
  new SlashCommandBuilder().setName('lock').setDescription('Lock the current channel'),
  new SlashCommandBuilder().setName('unlock').setDescription('Unlock the current channel'),
  new SlashCommandBuilder().setName('avatar').setDescription('Show an avatar').addUserOption(o => o.setName('target').setDescription('User')),
  new SlashCommandBuilder().setName('whois').setDescription('Show user information').addUserOption(o => o.setName('target').setDescription('User')),
  new SlashCommandBuilder().setName('userinfo').setDescription('Alias for whois').addUserOption(o => o.setName('target').setDescription('User')),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Show server information'),
  new SlashCommandBuilder().setName('serverbanner').setDescription('Show the server banner'),
  new SlashCommandBuilder().setName('membercount').setDescription('Show member count'),
  new SlashCommandBuilder().setName('banner').setDescription('Show a user banner').addUserOption(o => o.setName('target').setDescription('User')),
  new SlashCommandBuilder().setName('ship').setDescription('Calculate compatibility').addUserOption(o => o.setName('user1').setDescription('First user').setRequired(true)).addUserOption(o => o.setName('user2').setDescription('Second user').setRequired(true)),
  new SlashCommandBuilder().setName('hack').setDescription('Run a harmless fake hack').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('iq').setDescription('Generate a random IQ').addUserOption(o => o.setName('target').setDescription('User')),
  new SlashCommandBuilder().setName('rate').setDescription('Rate something').addStringOption(o => o.setName('thing').setDescription('Thing').setRequired(true)),
  new SlashCommandBuilder().setName('joke').setDescription('Tell a joke'),
  new SlashCommandBuilder().setName('fact').setDescription('Tell a fact'),
  new SlashCommandBuilder().setName('catfact').setDescription('Tell a cat fact'),
  new SlashCommandBuilder().setName('reverse').setDescription('Reverse text').addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)),
  new SlashCommandBuilder().setName('hello').setDescription('Say hello'),
  new SlashCommandBuilder().setName('coinflip').setDescription('Flip a coin'),
  new SlashCommandBuilder().setName('roll').setDescription('Roll a die'),
  new SlashCommandBuilder().setName('mood').setDescription('Get a random mood'),
  new SlashCommandBuilder().setName('8ball').setDescription('Ask the magic 8-ball').addStringOption(o => o.setName('question').setDescription('Question').setRequired(true)),
  new SlashCommandBuilder().setName('choose').setDescription('Choose between options').addStringOption(o => o.setName('options').setDescription('Options separated by |').setRequired(true)),
  new SlashCommandBuilder().setName('rps').setDescription('Play rock paper scissors').addStringOption(o => o.setName('choice').setDescription('rock, paper, or scissors').setRequired(true)),
  new SlashCommandBuilder().setName('hug').setDescription('Hug a user').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('slap').setDescription('Slap a user').addUserOption(o => o.setName('target').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('calculator').setDescription('Calculate basic arithmetic').addStringOption(o => o.setName('expression').setDescription('Example: 5 * (2 + 3)').setRequired(true)),
  new SlashCommandBuilder().setName('poll').setDescription('Create a yes/no poll').addStringOption(o => o.setName('question').setDescription('Question').setRequired(true)),
  new SlashCommandBuilder().setName('password').setDescription('Generate a password').addIntegerOption(o => o.setName('length').setDescription('8-64 characters').setMinValue(8).setMaxValue(64)),
  new SlashCommandBuilder().setName('ascii').setDescription('Format text as ASCII').addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)),
].map(c => c.toJSON());

const commandMap = new Map(commands.map(c => [c.name, c]));
function commandList(names) {
  return names.map(name => `\`/${name}\` — ${commandMap.get(name)?.description || ''}`).join('\n').slice(0, 3900) || 'No commands in this category.';
}
function commandMenu() {
  const select = new StringSelectMenuBuilder().setCustomId('commands-category').setPlaceholder('Choose a command category').addOptions(
    new StringSelectMenuOptionBuilder().setLabel('All Commands').setDescription('Show every available command').setValue('all').setEmoji('📚'),
    new StringSelectMenuOptionBuilder().setLabel('Admin & Moderation').setDescription('Server management commands').setValue('admin').setEmoji('🛡️'),
    new StringSelectMenuOptionBuilder().setLabel('Utilities & Server').setDescription('Information and setup commands').setValue('utility').setEmoji('⚙️'),
    new StringSelectMenuOptionBuilder().setLabel('Fun & Games').setDescription('Fun commands').setValue('fun').setEmoji('🎮'),
  );
  return new ActionRowBuilder().addComponents(select);
}
function commandsEmbed(category = 'all') {
  const groups = category === 'admin' ? [['🛡️ Admin & Moderation', adminNames]] : category === 'utility' ? [['⚙️ Utilities & Server', utilityNames]] : category === 'fun' ? [['🎮 Fun & Games', funNames]] : [['🛡️ Admin & Moderation', adminNames], ['⚙️ Utilities & Server', utilityNames], ['🎮 Fun & Games', funNames]];
  const e = embed('📚 Bot Commands', 'Use the menu below to switch categories. Admin commands are available to server administrators and the official owner account.');
  for (const [name, names] of groups) e.addFields({ name, value: commandList(names) });
  return e.setFooter({ text: 'AMERIKANLAR Bot • Owner: onurum203' });
}

function requireGuild(interaction) {
  if (!interaction.guild) {
    interaction.reply({ embeds: [embed('Server only', 'This command must be used in a server.', RED)], ephemeral: true });
    return false;
  }
  return true;
}
function requireAdmin(interaction) {
  if (!isAdmin(interaction.member, interaction.user)) {
    interaction.reply({ embeds: [embed('Permission denied', 'Administrator permission or the official owner account is required.', RED)], ephemeral: true });
    return false;
  }
  return true;
}
function parseDuration(input) {
  const match = /^([1-9]\d*)(s|m|h|d)$/i.exec(String(input).trim());
  if (!match) return null;
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const ms = Number(match[1]) * units[match[2].toLowerCase()];
  return ms > 0 && ms <= 28 * 86400000 ? ms : null;
}
function calculate(expression) {
  const cleaned = String(expression).replace(/\s+/g, '');
  if (!/^[0-9()+*/.%\-]+$/.test(cleaned) || /\/\//.test(cleaned)) throw new Error('Invalid expression');
  const tokens = cleaned.match(/\d+(?:\.\d+)?|[()+*/.%\-]/g) || [];
  const values = [], ops = [];
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 };
  const apply = () => { const b = values.pop(); const a = values.pop(); const op = ops.pop(); if (a === undefined || b === undefined) throw new Error('Invalid expression'); if (op === '+') values.push(a + b); if (op === '-') values.push(a - b); if (op === '*') values.push(a * b); if (op === '/') values.push(a / b); if (op === '%') values.push(a % b); };
  for (const token of tokens) {
    if (/^\d/.test(token)) values.push(Number(token));
    else if (token === '(') ops.push(token);
    else if (token === ')') { while (ops.length && ops.at(-1) !== '(') apply(); if (ops.pop() !== '(') throw new Error('Invalid expression'); }
    else { while (ops.length && ops.at(-1) !== '(' && precedence[ops.at(-1)] >= precedence[token]) apply(); ops.push(token); }
  }
  while (ops.length) { if (ops.at(-1) === '(') throw new Error('Invalid expression'); apply(); }
  if (values.length !== 1 || !Number.isFinite(values[0])) throw new Error('Invalid expression');
  return values[0];
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity('/commands | Onurum203', { type: 3 });
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`Registered ${commands.length} slash commands.`);
    await sendOwnerLog('Commands Registered', [logField('Commands', commands.length), logField('Bot', `${client.user.tag} (${client.user.id})`)], GREEN);
  } catch (error) {
    console.error('Command registration failed:', error);
    await sendOwnerLog('Command Registration Failed', [logField('Error', error.stack || error.message)], RED);
  }
});

client.on('guildCreate', async guild => {
  await sendOwnerLog('Bot Added to Server', [logField('Server', guildLabel(guild)), logField('Owner ID', guild.ownerId), logField('Members', guild.memberCount)], GREEN);
  try {
    const owner = await guild.fetchOwner();
    await owner.send({ embeds: [embed('👋 Thanks for adding me!', 'Use `/commands` to open the interactive command menu. Server administrators can use the admin commands.', COLOR).addFields({ name: 'Quick start', value: '`/commands`\n`/memberstats`\n`/antinuke status:true`\n`/autorole role:@Role`' })] });
  } catch (error) {
    console.error('Welcome DM failed:', error.message);
  }
});

client.on('guildMemberAdd', async member => {
  await updateMemberStats(member.guild);
  const autoroles = loadJSON(files.autorole);
  const role = autoroles[member.guild.id] && member.guild.roles.cache.get(autoroles[member.guild.id]);
  if (role) {
    await member.roles.add(role, 'Configured autorole').catch(() => {});
    await sendOwnerLog('Auto-role Assigned', [logField('User', `${member.user.tag} (${member.id})`), logField('Role', `${role.name} (${role.id})`), logField('Server', guildLabel(member.guild))], GREEN);
  }
  const welcome = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (welcome?.isTextBased()) await welcome.send({ embeds: [embed('Welcome!', `Welcome <@${member.id}> to **${member.guild.name}**!`, COLOR).setThumbnail(member.user.displayAvatarURL({ size: 256 }))] }).catch(() => {});
});
client.on('guildMemberRemove', member => updateMemberStats(member.guild));

client.on('channelDelete', async channel => {
  if (!channel.guild) return;
  const enabled = loadJSON(files.antinuke)[channel.guild.id];
  if (!enabled) return;
  try {
    const logs = await channel.guild.fetchAuditLogs({ limit: 5, type: 12 });
    const entry = logs.entries.find(e => Date.now() - e.createdTimestamp < 15000);
    const executor = entry?.executor;
    if (!executor || executor.id === client.user.id || executor.id === OWNER_ID || executor.id === channel.guild.ownerId) return;
    const member = await channel.guild.members.fetch(executor.id).catch(() => null);
    if (member?.bannable) await member.ban({ reason: 'Anti-nuke: unauthorized channel deletion' }).catch(() => {});
    await sendOwnerLog('Anti-Nuke Triggered', [logField('Deleted Channel', `${channel.name} (${channel.id})`), logField('Executor', `${executor.tag || executor.username} (${executor.id})`), logField('Server', guildLabel(channel.guild))], RED);
  } catch (error) {
    console.error('Anti-nuke error:', error);
    await sendOwnerLog('Anti-Nuke Error', [logField('Error', error.stack || error.message), logField('Server', guildLabel(channel.guild))], RED);
  }
});

async function handleInteraction(interaction) {
  if (interaction.isStringSelectMenu() && interaction.customId === 'commands-category') {
    const category = interaction.values[0];
    return interaction.update({ embeds: [commandsEmbed(category)], components: [commandMenu()] });
  }
  if (!interaction.isChatInputCommand()) return;
  const { commandName, options, guild, channel, user } = interaction;
  await sendOwnerLog('Command Used', [logField('Command', `/${commandName}`), logField('User', `${user.tag} (${user.id})`), logField('Server', guildLabel(guild)), logField('Channel', channel ? `${channel.name || 'DM'} (${channel.id})` : 'DM')]);

  if (commandName === 'commands') return interaction.reply({ embeds: [commandsEmbed()], components: [commandMenu()], ephemeral: true });
  if (commandName === 'dashboard') return interaction.reply({ embeds: [embed('👑 Owner Dashboard', `Official owner bypass: **${isOwner(user) ? 'ACTIVE' : 'inactive'}**`).addFields(logField('User', `${user.tag} (${user.id})`), logField('Server', guildLabel(guild)), logField('Access', isOwner(user) ? 'All bot commands without Discord Administrator permission' : 'Normal user permissions'))], ephemeral: true });
  if (commandName === 'ping') return interaction.reply({ embeds: [embed('🏓 Pong!', `API latency: **${client.ws.ping}ms**\nResponse time: **${Date.now() - interaction.createdTimestamp}ms**`)], ephemeral: true });

  if (['autorole', 'memberstats', 'antinuke'].includes(commandName)) {
    if (!requireGuild(interaction) || !requireAdmin(interaction)) return;
    if (commandName === 'autorole') {
      const role = options.getRole('role'); const data = loadJSON(files.autorole); data[guild.id] = role.id; saveJSON(files.autorole, data);
      return interaction.reply({ embeds: [embed('✅ Autorole Updated', `New members will receive ${role}.`)], ephemeral: true });
    }
    if (commandName === 'memberstats') {
      await interaction.deferReply({ ephemeral: true });
      const data = loadJSON(files.memberstats); let statsChannel = data[guild.id] && guild.channels.cache.get(data[guild.id]);
      try {
        if (!statsChannel) statsChannel = await guild.channels.create({ name: `🔗 ${serverInviteLabel(guild)} | 👤 ${guild.memberCount}`.slice(0, 100), type: ChannelType.GuildVoice, permissionOverwrites: [{ id: guild.id, deny: [PermissionFlagsBits.Connect] }] });
        data[guild.id] = statsChannel.id; saveJSON(files.memberstats, data); await updateMemberStats(guild);
        return interaction.editReply({ embeds: [embed('📊 Member Stats Ready', `Live member count channel: <#${statsChannel.id}>`, GREEN)] });
      } catch (error) { await sendOwnerLog('Member Stats Setup Failed', [logField('Error', error.stack || error.message), logField('Server', guildLabel(guild))], RED); return interaction.editReply({ embeds: [embed('Setup failed', 'I need Manage Channels permission and a usable category/channel limit.', RED)] }); }
    }
    const status = options.getBoolean('status'); const data = loadJSON(files.antinuke); data[guild.id] = status; saveJSON(files.antinuke, data);
    return interaction.reply({ embeds: [embed('🛡️ Anti-Nuke Updated', `Protection is now **${status ? 'enabled' : 'disabled'}**.`, status ? GREEN : GOLD)], ephemeral: true });
  }

  if (adminNames.includes(commandName)) {
    if (!requireGuild(interaction) || !requireAdmin(interaction)) return;
    try {
      if (commandName === 'say') { await interaction.reply({ embeds: [embed('✅ Sent', 'Message sent.', GREEN)], ephemeral: true }); return channel.send({ content: options.getString('text') }); }
      if (commandName === 'embed' || commandName === 'embedsay') { await interaction.reply({ embeds: [embed('✅ Sent', 'Embed sent.', GREEN)], ephemeral: true }); return channel.send({ embeds: [embed(options.getString('title'), options.getString(commandName === 'embed' ? 'description' : 'message')).setFooter({ text: `By ${user.tag}` })] }); }
      if (commandName === 'dm') {
        const target = options.getUser('user'); const role = options.getRole('role'); const message = options.getString('message');
        if (!target && !role) return interaction.reply({ embeds: [embed('Missing target', 'Choose a user or role.', RED)], ephemeral: true });
        await interaction.deferReply({ ephemeral: true }); let recipients = target ? [target] : [...(await guild.members.fetch()).filter(m => role && m.roles.cache.has(role.id) && !m.user.bot).values()].map(m => m.user); let sent = 0; let failed = 0;
        for (const recipient of recipients) { try { await recipient.send({ embeds: [embed(`Message from ${guild.name}`, message).addFields(logField('Recipient User ID', recipient.id))] }); sent++; await sendOwnerLog('DM Sent', [logField('Recipient', `${recipient.tag} (${recipient.id})`), logField('Server', guildLabel(guild)), logField('Message', message)]); } catch { failed++; } }
        return interaction.editReply({ embeds: [embed('📨 DM Complete', `Sent: **${sent}**\nFailed: **${failed}**`, sent ? GREEN : RED)] });
      }
      if (commandName === 'clearall' || commandName === 'nuke') { await interaction.reply({ embeds: [embed('Channel reset', 'Cloning and deleting the old channel.', GOLD)], ephemeral: true }); const position = channel.position; const clone = await channel.clone(); await channel.delete(); await clone.setPosition(position); return clone.send({ embeds: [embed('☢️ Channel Reset', 'This channel was reset by an authorized administrator.', GOLD)] }); }
      if (commandName === 'channeldelete') { await interaction.reply({ embeds: [embed('Deleting channel', 'The channel will now be deleted.', GOLD)], ephemeral: true }); return channel.delete(); }
      if (commandName === 'nick') { const target = await guild.members.fetch(options.getUser('target').id); await target.setNickname(options.getString('nickname')); return interaction.reply({ embeds: [embed('✅ Nickname changed', `${target.user.tag} is now **${target.displayName}**.`, GREEN)], ephemeral: true }); }
      if (commandName === 'dltroles') {
        if (!options.getBoolean('confirm')) return interaction.reply({ embeds: [embed('Confirmation required', 'Run `/dltroles confirm:true` if you really want to delete removable roles.', RED)], ephemeral: true });
        const botMember = guild.members.me || await guild.members.fetchMe();
        const highest = botMember.roles.highest;
        const removable = [...guild.roles.cache.values()].filter(role => role.id !== guild.id && !role.managed && role.position < highest.position);
        let deleted = 0;
        let failed = 0;
        for (const role of removable) {
          try { await role.delete('Administrator requested /dltroles'); deleted++; } catch { failed++; }
        }
        await sendOwnerLog('Roles Deleted', [logField('Server', guildLabel(guild)), logField('Requested By', `${user.tag} (${user.id})`), logField('Deleted', deleted), logField('Failed or Protected', failed)], deleted ? GOLD : RED);
        return interaction.reply({ embeds: [embed('🗑️ Role deletion complete', `Deleted: **${deleted}**\nFailed: **${failed}**\n\nProtected roles such as @everyone, managed integration roles, and roles at or above my highest role were not deleted.`, deleted ? GREEN : GOLD)], ephemeral: true });
      }
      if (commandName === 'role' || commandName === 'removerole') { const target = await guild.members.fetch(options.getUser('target').id); const role = options.getRole('role'); if (role.managed || role.position >= guild.members.me.roles.highest.position) return interaction.reply({ embeds: [embed('Role unavailable', 'My highest role must be above the selected role.', RED)], ephemeral: true }); await target.roles[commandName === 'role' ? 'add' : 'remove'](role); return interaction.reply({ embeds: [embed('✅ Role updated', `${role.name} was ${commandName === 'role' ? 'given to' : 'removed from'} ${target.user.tag}.`, GREEN)], ephemeral: true }); }
      if (commandName === 'mute' || commandName === 'unmute') { const target = await guild.members.fetch(options.getUser('target').id); if (commandName === 'mute') { const duration = parseDuration(options.getString('duration')); if (!duration) return interaction.reply({ embeds: [embed('Invalid duration', 'Use 1s-28d, for example `10m`.', RED)], ephemeral: true }); await target.timeout(duration, options.getString('reason') || 'No reason provided'); } else await target.timeout(null); return interaction.reply({ embeds: [embed('✅ Timeout updated', `${target.user.tag} was ${commandName === 'mute' ? 'timed out' : 'unmuted'}.`, GREEN)], ephemeral: true }); }
      if (['kick', 'ban'].includes(commandName)) { const target = await guild.members.fetch(options.getUser('target').id); const reason = options.getString('reason') || 'No reason provided'; await target[commandName]({ reason }); return interaction.reply({ embeds: [embed('✅ Moderation complete', `${target.user.tag} was ${commandName === 'kick' ? 'kicked' : 'banned'}.\\nReason: ${reason}`, GREEN)], ephemeral: true }); }
      if (commandName === 'unban') { await guild.members.unban(options.getString('userid')); return interaction.reply({ embeds: [embed('✅ User unbanned', `User ID \`${options.getString('userid')}\` was unbanned.`, GREEN)], ephemeral: true }); }
      if (['warn', 'warnings', 'clearwarns'].includes(commandName)) { const target = options.getUser('target'); const data = loadJSON(files.warnings); data[guild.id] ||= {}; data[guild.id][target.id] ||= []; if (commandName === 'warn') { data[guild.id][target.id].push({ reason: options.getString('reason'), date: new Date().toISOString() }); saveJSON(files.warnings, data); return interaction.reply({ embeds: [embed('⚠️ Warning added', `${target.tag} was warned.`, GOLD)], ephemeral: true }); } if (commandName === 'clearwarns') { delete data[guild.id][target.id]; saveJSON(files.warnings, data); return interaction.reply({ embeds: [embed('✅ Warnings cleared', `All warnings for ${target.tag} were cleared.`, GREEN)], ephemeral: true }); } const list = data[guild.id][target.id]; return interaction.reply({ embeds: [embed(`Warnings for ${target.tag}`, list.length ? list.map((w, i) => `**${i + 1}.** ${safeText(w.reason)} — <t:${Math.floor(new Date(w.date).getTime() / 1000)}:R>`).join('\n') : 'No warnings.', list.length ? GOLD : GREEN)], ephemeral: true }); }
      if (commandName === 'clear') { const amount = options.getInteger('amount'); const deleted = await channel.bulkDelete(amount, true); return interaction.reply({ embeds: [embed('🧹 Messages cleared', `Deleted **${deleted.size}** messages.`, GREEN)], ephemeral: true }); }
      if (commandName === 'slowmode') { await channel.setRateLimitPerUser(options.getInteger('seconds')); return interaction.reply({ embeds: [embed('✅ Slowmode updated', `${options.getInteger('seconds')} seconds.`, GREEN)], ephemeral: true }); }
      if (commandName === 'lock' || commandName === 'unlock') { await channel.permissionOverwrites.edit(guild.id, { SendMessages: commandName === 'lock' ? false : null }); return interaction.reply({ embeds: [embed(commandName === 'lock' ? '🔒 Channel locked' : '🔓 Channel unlocked', 'Channel permissions updated.', GREEN)], ephemeral: true }); }
    } catch (error) { await sendOwnerLog('Admin Command Error', [logField('Command', `/${commandName}`), logField('Error', error.stack || error.message), logField('Server', guildLabel(guild))], RED); if (!interaction.replied && !interaction.deferred) return interaction.reply({ embeds: [embed('Command failed', 'Discord rejected the action. Check the bot role hierarchy and permissions.', RED)], ephemeral: true }); return interaction.followUp({ embeds: [embed('Command failed', 'Discord rejected the action. Check the bot role hierarchy and permissions.', RED)], ephemeral: true }).catch(() => {}); }
  }

  if (commandName === 'avatar') { const target = options.getUser('target') || user; return interaction.reply({ embeds: [embed(`${target.tag}'s Avatar`, '').setImage(target.displayAvatarURL({ size: 1024 }))], ephemeral: true }); }
  if (commandName === 'banner') { const target = options.getUser('target') || user; const fetched = await client.users.fetch(target.id, { force: true }); const e = embed(`${target.tag}'s Banner`, fetched.banner ? '' : 'This user has no banner.'); if (fetched.banner) e.setImage(fetched.bannerURL({ size: 1024 })); return interaction.reply({ embeds: [e], ephemeral: true }); }
  if (commandName === 'whois' || commandName === 'userinfo') { if (!requireGuild(interaction)) return; const target = options.getUser('target') || user; const m = await guild.members.fetch(target.id).catch(() => null); if (!m) return interaction.reply({ embeds: [embed('User not found', 'That user is not in this server.', RED)], ephemeral: true }); return interaction.reply({ embeds: [embed(`User Info: ${target.tag}`, '').setThumbnail(target.displayAvatarURL({ size: 256 })).addFields(logField('User ID', target.id, true), logField('Joined', m.joinedTimestamp ? `<t:${Math.floor(m.joinedTimestamp / 1000)}:D>` : 'Unknown', true), logField('Roles', m.roles.cache.filter(r => r.id !== guild.id).map(r => r.name).join(', ') || 'None'))], ephemeral: true }); }
  if (commandName === 'serverinfo') { if (!requireGuild(interaction)) return; const e = embed(guild.name, '').addFields(logField('Owner', `<@${guild.ownerId}>`, true), logField('Members', guild.memberCount, true), logField('Created', `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, true));
    const icon = guild.iconURL({ size: 256 });
    if (icon) e.setThumbnail(icon);
    return interaction.reply({ embeds: [e], ephemeral: true }); }
  if (commandName === 'serverbanner') { if (!requireGuild(interaction)) return; const e = embed(`${guild.name} Banner`, guild.bannerURL() ? '' : 'This server has no banner.'); if (guild.bannerURL()) e.setImage(guild.bannerURL({ size: 1024 })); return interaction.reply({ embeds: [e], ephemeral: true }); }
  if (commandName === 'membercount') { if (!requireGuild(interaction)) return; return interaction.reply({ embeds: [embed('📊 Member Count', `**${guild.name}** has **${guild.memberCount}** members.`)], ephemeral: true }); }
  if (commandName === 'calculator') { try { return interaction.reply({ embeds: [embed('🧮 Calculator', `\`${safeText(options.getString('expression'))}\` = **${calculate(options.getString('expression'))}**`)], ephemeral: true }); } catch { return interaction.reply({ embeds: [embed('Invalid expression', 'Only basic arithmetic is supported.', RED)], ephemeral: true }); } }
  if (commandName === 'password') { const len = options.getInteger('length') || 12; const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'; const value = Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); return interaction.reply({ embeds: [embed('🔑 Password Generated', `\`${value}\``, GREEN)], ephemeral: true }); }
  if (commandName === 'ascii') return interaction.reply({ embeds: [embed('ASCII', `\`\`\`text\n[ ${safeText(options.getString('text'), 700).toUpperCase()} ]\n\`\`\``)], ephemeral: true });
  if (commandName === 'poll') { const msg = await channel.send({ embeds: [embed('📊 Poll', options.getString('question')).setFooter({ text: `Created by ${user.tag}` })] }); await msg.react('👍'); await msg.react('👎'); return interaction.reply({ embeds: [embed('✅ Poll created', 'The poll is live.', GREEN)], ephemeral: true }); }
  if (commandName === 'ship') { const a = options.getUser('user1'); const b = options.getUser('user2'); if (a.id === b.id) return interaction.reply({ embeds: [embed('Choose two users', 'The users must be different.', RED)], ephemeral: true }); const rating = Math.floor(Math.random() * 101); return interaction.reply({ embeds: [embed('💘 Compatibility', `${a} × ${b}\n\nLove rating: **${rating}%**`)] }); }
  if (commandName === 'hack') { const target = options.getUser('target'); await interaction.reply({ embeds: [embed('💻 Fake Hack', `Starting a harmless fake hack on ${target.username}...`)], ephemeral: true }); setTimeout(() => interaction.editReply({ embeds: [embed('✅ Just kidding', `${target.username} was not hacked.`)] }).catch(() => {}), 1800); return; }
  if (commandName === 'iq') { const target = options.getUser('target') || user; return interaction.reply({ embeds: [embed('🧠 IQ Test', `${target.username}'s random IQ is **${Math.floor(Math.random() * 200) + 1}**.`)], ephemeral: true }); }
  if (commandName === 'rate') return interaction.reply({ embeds: [embed('⭐ Rating', `I rate **${safeText(options.getString('thing'))}** **${Math.floor(Math.random() * 101)}/100**.`)], ephemeral: true });
  const texts = { joke: ['Why did the scarecrow win an award? Because he was outstanding in his field.', 'What do you call a fake noodle? An impasta!'], fact: ['Honey never spoils.', 'A group of flamingos is called a flamboyance.'], catfact: ['Cats sleep for much of their lives.', 'A cat’s meow is usually directed at humans.'] };
  if (texts[commandName]) return interaction.reply({ embeds: [embed(commandName === 'joke' ? '😂 Joke' : commandName === 'fact' ? '💡 Fact' : '🐱 Cat Fact', texts[commandName][Math.floor(Math.random() * texts[commandName].length)])], ephemeral: true });
  if (commandName === 'reverse') return interaction.reply({ embeds: [embed('🔄 Reverse', options.getString('text').split('').reverse().join(''))], ephemeral: true });
  if (commandName === 'hello') return interaction.reply({ embeds: [embed('👋 Hello', `Hello, ${user}!`)], ephemeral: true });
  if (commandName === 'coinflip') return interaction.reply({ embeds: [embed('🪙 Coin Flip', Math.random() < 0.5 ? 'Heads' : 'Tails')], ephemeral: true });
  if (commandName === 'roll') return interaction.reply({ embeds: [embed('🎲 Dice Roll', `You rolled **${Math.floor(Math.random() * 6) + 1}**.`)], ephemeral: true });
  if (commandName === 'mood') return interaction.reply({ embeds: [embed('✨ Mood', ['Happy', 'Excited', 'Chill', 'Curious', 'Epic', 'Goofy'][Math.floor(Math.random() * 6)])], ephemeral: true });
  if (commandName === '8ball') return interaction.reply({ embeds: [embed('🎱 Magic 8-Ball', ['Yes.', 'No.', 'Maybe.', 'Definitely.', 'Ask again later.'][Math.floor(Math.random() * 5)])], ephemeral: true });
  if (commandName === 'choose') { const values = options.getString('options').split('|').map(x => x.trim()).filter(Boolean); if (values.length < 2) return interaction.reply({ embeds: [embed('Not enough options', 'Separate at least two options with `|`.', RED)], ephemeral: true }); return interaction.reply({ embeds: [embed('🎯 Choice', `I choose **${values[Math.floor(Math.random() * values.length)]}**.`)], ephemeral: true }); }
  if (commandName === 'rps') { const choices = ['rock', 'paper', 'scissors']; const chosen = options.getString('choice').toLowerCase(); if (!choices.includes(chosen)) return interaction.reply({ embeds: [embed('Invalid choice', 'Use rock, paper, or scissors.', RED)], ephemeral: true }); const botChoice = choices[Math.floor(Math.random() * 3)]; return interaction.reply({ embeds: [embed('✊ Rock Paper Scissors', `You: **${chosen}**\nBot: **${botChoice}**`)], ephemeral: true }); }
  if (commandName === 'hug' || commandName === 'slap') return interaction.reply({ embeds: [embed(commandName === 'hug' ? '🫂 Hug' : '✋ Slap', `${user} ${commandName === 'hug' ? 'hugged' : 'slapped'} ${options.getUser('target')}!`)] });
}

client.on('interactionCreate', async interaction => {
  try { await handleInteraction(interaction); }
  catch (error) {
    console.error('Interaction error:', error);
    await sendOwnerLog('Interaction Error', [logField('Interaction', interaction.isChatInputCommand() ? `/${interaction.commandName}` : interaction.customId || 'unknown'), logField('User', `${interaction.user?.tag || 'unknown'} (${interaction.user?.id || 'unknown'})`), logField('Server', guildLabel(interaction.guild)), logField('Error', error.stack || error.message)], RED);
    const response = { embeds: [embed('Something went wrong', 'The error was logged. Please try the command again.', RED)], ephemeral: true };
    if (interaction.deferred) await interaction.editReply(response).catch(() => {}); else if (!interaction.replied) await interaction.reply(response).catch(() => {});
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (/^s+\s*a+[\s!.,]*$/i.test(message.content.trim())) return message.reply({ embeds: [embed('Aleykümselam!', 'Welcome back.') ] });
  if (!message.content.startsWith(PREFIX)) return;
  if (!isOwner(message.author)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/); const command = args.shift()?.toLowerCase();
  await sendOwnerLog('Owner Prefix Command Used', [logField('Command', message.content), logField('User', `${message.author.tag} (${message.author.id})`), logField('Server', guildLabel(message.guild)), logField('Channel', message.channel?.name || 'DM')]);
  try {
    if (command === 'say') { await message.delete().catch(() => {}); return message.channel.send({ embeds: [embed('Owner Message', args.join(' '))] }); }
    if (command === 'dm') { const id = args.shift()?.replace(/\D/g, ''); const text = args.join(' '); if (!id || !text) return message.reply({ embeds: [embed('Usage', '`.dm USER_ID message`', RED)] }); const target = await client.users.fetch(id); await target.send({ embeds: [embed('Message from bot owner', text).addFields(logField('Recipient User ID', target.id))] }); return message.reply({ embeds: [embed('✅ DM sent', `Sent to ${target.tag} (${target.id}).`, GREEN)] }); }
  } catch (error) { await sendOwnerLog('Prefix Command Error', [logField('Error', error.stack || error.message)], RED); }
});

process.on('unhandledRejection', error => { console.error('Unhandled rejection:', error); sendOwnerLog('Unhandled Rejection', [logField('Error', error?.stack || error?.message || error)], RED); });
process.on('uncaughtException', error => { console.error('Uncaught exception:', error); sendOwnerLog('Uncaught Exception', [logField('Error', error.stack || error.message)], RED); });

if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is missing from .env');
client.login(process.env.DISCORD_TOKEN);

module.exports = { isOwner, isAdmin, calculate, parseDuration };

// Required Discord Developer Portal intents: Server Members Intent and Message Content Intent.
// Required bot permissions for moderation/setup: Manage Channels, Manage Roles, Manage Messages,
// Moderate Members, Kick Members, Ban Members, View Audit Log, Send Messages, Embed Links, Add Reactions.
// Prefix commands are intentionally ignored for every user except OWNER_ID / OWNER_USERNAME.
