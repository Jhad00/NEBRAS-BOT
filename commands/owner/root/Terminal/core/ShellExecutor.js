// core shell execution engine
import { exec } from "child_process";
import { promisify } from "util";
import { getCwdForChat, setCwdForChat } from "./TerminalState.js";
import { shellQuote, safeTruncate } from "./Parser.js";

const execPromise = promisify(exec);

function splitCommandOutputAndPwd(stdoutRaw) {
  const stdout = String(stdoutRaw || "");
  const marker = "\n__PWD__=";
  const idx = stdout.lastIndexOf(marker);
  if (idx === -1) return { output: stdout, pwd: null };

  const output = stdout.slice(0, idx);
  const pwd = stdout.slice(idx + marker.length).split(/\r?\n/)[0]?.trim() || null;
  return { output, pwd };
}

export async function executeShellCommand(wa, msg, command, args) {
  const jid = msg.key.remoteJid;
  const chatCwdBefore = getCwdForChat(jid);
  const fullCommand = [command, ...args].join(" ").trim();

  if (!fullCommand) {
    return wa.sendMessage(jid, { text: `*📍 PWD:* \`${chatCwdBefore}\`\n\nNo command provided.` });
  }

  const shell = process.env.SHELL || "/bin/sh";
  const startText = `*📍:* \`${chatCwdBefore}\`\n*⌨️:* \`${fullCommand}\`\n*⏳:* \`Executing...\``;
  const sentMsg = await wa.sendMessage(jid, { text: startText });

  // wrapper to extract PWD after execution
  const wrapped = `cd ${shellQuote(chatCwdBefore)} && { ${fullCommand}; } ; printf "\\n__PWD__=%s\\n" "$PWD"`;

  try {
    const { stdout, stderr } = await execPromise(wrapped, {
      timeout: 60_000,
      maxBuffer: 10 * 1024 * 1024,
      cwd: process.cwd(),
      shell,
      env: process.env,
    });

    const { output, pwd } = splitCommandOutputAndPwd(stdout);
    const newCwd = pwd || chatCwdBefore;
    setCwdForChat(jid, newCwd);

    let result = `*📍:* \`${newCwd}\`\n*⌨️:* \`${fullCommand}\``;
    const cleanOut = output.trim();
    const cleanErr = stderr.trim();

    if (cleanOut) result += `\n*🟢 STDOUT:*\n\`\`\`\n${safeTruncate(cleanOut)}\n\`\`\``;
    if (cleanErr) result += `\n*🔴 STDERR:*\n\`\`\`\n${safeTruncate(cleanErr)}\n\`\`\``;

    return wa.sendMessage(jid, { text: result, edit: sentMsg.key });
  } catch (error) {
    const { output, pwd } = splitCommandOutputAndPwd(error?.stdout);
    const newCwd = pwd || chatCwdBefore;
    setCwdForChat(jid, newCwd);

    let errorMsg = `*📍:* \`${newCwd}\`\n*⌨️:* \`${fullCommand}\`\n*⚠️ Status:* \`Failed\``;

    if (error?.killed || error?.signal === "SIGTERM" || error?.code === "ETIMEDOUT") {
      errorMsg += ` (Timeout: 60s)`;
    } else if (error?.message) {
      errorMsg += `\n*⚠️ ERROR:* \`${error.message.split('\n')[0]}\``;
    }

    const cleanOut = (output || "").trim();
    const cleanErr = (error?.stderr || "").trim();

    if (cleanOut) errorMsg += `\n*🟢 STDOUT:*\n\`\`\`\n${safeTruncate(cleanOut)}\n\`\`\``;
    if (cleanErr) errorMsg += `\n*🔴 STDERR:*\n\`\`\`\n${safeTruncate(cleanErr)}\n\`\`\``;

    return wa.sendMessage(jid, { text: errorMsg, edit: sentMsg.key });
  }
}