import { exec } from "../../wa-helpers/heplers.index.js";
import {
  commandsMap,
  currentClient_user,
  activeClients,
  commandsList,
  fakeQuoted,
  bot_version,
  getGlobalSettings,
  getDevLids,
} from "../../assets/ass-index.js";
import { wa_helpers } from "../../wa-helpers/heplers.index.js";
import { color } from "bumbum-cli";

// in-memory cache: pn jid -> lid jid, resolved once per runtime
const lidCache = new Map();

async function getLidFor(waClient, pnJid) {
  if (!pnJid) return null;
  if (pnJid.endsWith("@lid")) return pnJid;
  if (lidCache.has(pnJid)) return lidCache.get(pnJid);

  // resolve lid straight from signal repo, no pre-check call anymore
  const lid = await waClient.signalRepository.lidMapping.getLIDForPN(pnJid);
  if (lid) lidCache.set(pnJid, lid);
  return lid || null;
}

export async function messages_update(waClient) {
  waClient.ev.on("messages.upsert", async (m) => {

    const msg = m.messages[0];
    if (!msg?.message) return;
    // extract text from message or interactive button response
    let text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
      msg.message?.templateButtonReplyMessage?.selectedId ||
      msg.message?.buttonsResponseMessage?.selectedButtonId ||
      "";

    // if interactive button (new native flow), parse the ID from JSON
    if (msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
      try {
        const parsed = JSON.parse(text);
        text = parsed.id || "";
      } catch (e) { text = ""; }
    }

    if (!text?.trim()) return;

    let wa = { ...waClient, ...wa_helpers };

    // freeze react to this exact msg at trigger time — if a new message
    // arrives while the command is still running, react() won't drift to it
    const capturedMsg = msg;
    wa.react = (emojie) => wa_helpers.react(emojie, waClient, capturedMsg);

    const originalSendMessage = wa.sendMessage.bind(waClient);
    wa.sendMessage = async (jid, content, options = {}) => {
      const isGroup = jid?.endsWith("@g.us");

      // resolve target quote: fallback to fakeQuoted if none provided
      let targetQuote = options.quoted || fakeQuoted;

      if (targetQuote && targetQuote.key) {
        // clone to avoid mutating global fakeQuoted or original msg
        targetQuote = {
          ...targetQuote,
          key: {
            ...targetQuote.key,
            remoteJid: jid // force exact chat jid to prevent silent drops
          }
        };

        // DMs strictly reject quotes with participant field -> strip it
        if (!isGroup && targetQuote.key.participant !== undefined) {
          delete targetQuote.key.participant;
        }

        options.quoted = targetQuote;
      }

      return originalSendMessage(jid, content, options);
    };

    const botId = {
      id: waClient.user.id.split(":")[0] + "@s.whatsapp.net",
      lid: waClient.user.lid.split(":")[0] + "@lid",
    };

    // Prioritize botId.id for 'fromMe' to allow fast-path evaluation
    const resolvedSender = msg.key.fromMe ? (botId.id || botId.lid) : (msg.key.participant || msg.key.remoteJid);
    const sender = { participant: resolvedSender };

    currentClient_user.clientName = waClient.clientName;
    currentClient_user.waClient = wa;
    currentClient_user.msg = msg;

    let cmdsToRun = new Set();
    let commandArgs = [];

    // trigger on reply to bot
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
    if (quotedMsg && (quotedMsg.participant === botId.id || quotedMsg.participant === botId.lid)) {
      const repliedMsgId = quotedMsg.stanzaId || "";
      
      for (const [name, cmd] of commandsMap.entries()) {
        if (cmd.replyToBot) {
          const prefixRequired = cmd.replyToBot.idPrefix;
          // pass if no prefix required, or if id matches requested prefix
          if (!prefixRequired || repliedMsgId.startsWith(prefixRequired)) {
             cmdsToRun.add(cmd);
          }
        }
      }
    }

    // standard trigger (with or without prefix)
    // detect and strip prefix, normalize command args
    let searchPrefix = await exec.hasPrefix(text);
    let rawArgs = text.slice(searchPrefix ? searchPrefix.length : 0).trim().split(/ +/);
    msg.prefix = searchPrefix || "";
    
    const cmdName = rawArgs.shift()?.toLowerCase();
    
    if (cmdName) {
      const explicitCmd = commandsMap.get(cmdName);
      if (explicitCmd) {
        if (searchPrefix || explicitCmd.noPrefix) {
          cmdsToRun.add(explicitCmd);
          commandArgs = rawArgs;
        }
      }
    }

    // Trigger command natively if the bot is mentioned, but prevent self-reply loops
    const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const isBotMentioned = mentionedJids.includes(botId.id) || mentionedJids.includes(botId.lid);
    const isFromMe = msg.key.fromMe;
    
    if (isBotMentioned && !isFromMe && cmdsToRun.size === 0) {
      for (const [name, cmd] of commandsMap.entries()) {
        if (cmd.mentionBot) {
          cmdsToRun.add(cmd);
        }
      }
    }

    if (cmdsToRun.size === 0) return;

    // evaluate identity conditionally to prevent whatsapp api rate limits
    let isOwner = false;
    let isEliteUser = false;
    try {
      // owner identity comes only from lid_owners.json now, config numbers are startup-only
      const devLids = getDevLids();
      const senderLid = await getLidFor(waClient, resolvedSender);
      isOwner = (!!senderLid && devLids.includes(senderLid));
      
      // bot always treats itself as elite using its own lid, fromMe is proof enough, no lookup needed
      isEliteUser = (isOwner || msg.key.fromMe) ? true : await wa_helpers.isElite(sender.participant);
    } catch (e) {
      console.log(color.red(`\nIdentity resolution failed: ${e}`));
    }

    // execute pipeline
    for (const command of cmdsToRun) {
      let hasAccess = false;
      if (command.tier === "owner") {
        // bot itself bypasses owner-tier only on commands explicitly flagged with selfOverride
        hasAccess = isOwner || (msg.key.fromMe && command.selfOverride === true);
      } else if (command.tier === "elites") {
        hasAccess = isOwner || isEliteUser;
      } else {
        // everyone tier fallback with global toggle check per client
        const clientSettings = getGlobalSettings(waClient.clientName);
        // bot itself always passes here regardless of the open/closed toggle
        hasAccess = clientSettings.everyoneTierOpen ? true : (isOwner || msg.key.fromMe);
      }

      if (!hasAccess) continue;

      try {
        // assign exact args if called explicitly, else pass raw text args
        const isExplicitCall = (command.cmd.toLowerCase() === cmdName || (command.aliases && command.aliases.includes(cmdName)));
        const argsToPass = isExplicitCall ? commandArgs : text.trim().split(/ +/);
        
        await command.do(wa, msg, argsToPass, botId, sender);
      } catch (error) {
        console.log(color.red(`\nError on command: ${command.cmd}\n error: ${error}`));
      }
    }
  });
}
