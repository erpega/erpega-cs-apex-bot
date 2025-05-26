const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require("discord.js"); const express = require("express"); const app = express();

app.get("/", (req, res) => { res.send("Bot is alive!"); });

app.listen(3000, () => { console.log("Web server started"); });

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions ], partials: [Partials.Message, Partials.Channel, Partials.Reaction] });

const TOKEN = process.env.TOKEN; const lobbies = new Map(); // textChannel.id -> lobbyData

client.once("ready", () => { console.log(`Bot is ready: ${client.user.tag}`); });

client.on("messageCreate", async (msg) => { if (msg.content === "!create-lobby-message") { const sent = await msg.channel.send( "Выберите игру, чтобы создать лобби:\n" + "🔫 — CS:GO (5 игроков)\n" + "⚔️ — Apex Legends (3 игрока)\n" + "🔮 — Dota 2 (5 игроков)" ); await sent.react("🔫"); await sent.react("⚔️"); await sent.react("🔮"); }

if (msg.content.startsWith("!kick")) { const creatorId = lobbies.get(msg.channel.id)?.owner; if (!creatorId || msg.author.id !== creatorId) return msg.reply("Ты не создатель этого лобби.");

const member = msg.mentions.members.first();
if (!member) return msg.reply("Укажи пользователя для кика.");

if (member.voice.channel) await member.voice.disconnect().catch(() => {});
await msg.channel.send(`${member.user.tag} был кикнут создателем.`);

}

if (msg.content === "!close") { const lobby = lobbies.get(msg.channel.id); if (!lobby) return msg.reply("Это не лобби."); if (msg.author.id !== lobby.owner) return msg.reply("Только создатель может закрыть лобби.");

const voice = await msg.guild.channels.fetch(lobby.voiceChannel).catch(() => {});
const text = await msg.guild.channels.fetch(lobby.textChannel).catch(() => {});

if (voice) await voice.delete().catch(() => {});
if (text) await text.delete().catch(() => {});

lobbies.delete(msg.channel.id);

} });

client.on("messageReactionAdd", async (reaction, user) => { if (user.bot) return;

const { message } = reaction; if (!message.guild || !["🔫", "⚔️", "🔮"].includes(reaction.emoji.name)) return;

const member = await message.guild.members.fetch(user.id);

const existingLobby = [...lobbies.values()].find(lobby => lobby.owner === user.id); if (existingLobby) { return member.send("У тебя уже есть активное лобби. Используй !close, чтобы его закрыть.").catch(() => {}); }

let game = ""; let limit = 0;

if (reaction.emoji.name === "🔫") { game = "CS:GO"; limit = 5; } else if (reaction.emoji.name === "⚔️") { game = "Apex Legends"; limit = 3; } else if (reaction.emoji.name === "🔮") { game = "Dota 2"; limit = 5; }

const category = message.channel.parent;

const voice = await message.guild.channels.create({ name: ${game} Lobby - ${user.username}, type: 2, parent: category ?? undefined, userLimit: limit, permissionOverwrites: [ { id: message.guild.id, allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel] } ] });

const text = await message.guild.channels.create({ name: ${game.toLowerCase()}-${user.username}, type: 0, parent: category ?? undefined, permissionOverwrites: [ { id: message.guild.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] } ] });

await text.send(**${user.username}** создал лобби на ${limit} игроков (${game})!\n + Используй \!kick @user` или `!close` для управления.`);

lobbies.set(text.id, { voiceChannel: voice.id, textChannel: text.id, owner: user.id, limit: limit });

const interval = setInterval(async () => { const vChan = await message.guild.channels.fetch(voice.id).catch(() => null); const tChan = await message.guild.channels.fetch(text.id).catch(() => null); if (!vChan || !tChan) return clearInterval(interval); if (vChan.members.size === 0) { await vChan.delete().catch(() => {}); await tChan.delete().catch(() => {}); lobbies.delete(text.id); clearInterval(interval); } }, 15000); });

client.login(TOKEN);

  
