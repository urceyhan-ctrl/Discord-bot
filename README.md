# AMERIKANLAR

AMERIKANLAR is a Discord bot with dot commands for moderation and fun.

## Features

- `.help` — shows available commands
- `.ping` — checks the bot latency
- `.say <message>` — makes the bot send a message
- `.dm @user <message>` — sends a direct message to a user
- `.kick @user [reason]` — kicks a user from the server
- `.ban @user [reason]` — bans a user from the server
- `.hello` — says hello
- `.coinflip` — flips a coin
- `.roll` — rolls a random number between 1 and 6
- `.mood` — gives a random mood

## Setup

1. Create a bot in the Discord Developer Portal.
2. Copy the bot token.
3. Rename `.env.example` to `.env`.
4. Put your token in `.env`.
5. Run:

```bash
npm install
npm start
```

## Keep the bot running automatically (Windows)

To start the bot automatically whenever you sign in to Windows and restart it
five seconds after a crash, run this once from the project folder:

```powershell
npm.cmd run autostart:install
```

To remove that startup task later:

```powershell
npm.cmd run autostart:remove
```

For local development, `npm.cmd run dev` now restarts the bot whenever you save
`index.js`.

## Invite the bot

Generate an invite link in the Developer Portal with the following permissions:

- Kick Members
- Ban Members
- Read Messages / View Channels
- Send Messages
- Manage Messages
- Embed Links
- Read Message History

## Notes

This bot uses dot-prefixed commands such as `.ban`, `.kick`, `.dm`, and `.help`.
