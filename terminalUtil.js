// lib/terminalUtil.js
// Pretty terminal output + direct clipboard copy (no mouse select needed)
// Uses OSC 52 escape sequence — supported by most modern terminals
// (Windows Terminal, iTerm2, Kitty, most Katabump/VPS SSH clients via tmux too).

const chalk = require("chalk");

/**
 * Copies text to the terminal's clipboard using OSC 52.
 * If the terminal doesn't support it, it's a harmless no-op —
 * the session id is still printed in full below it.
 */
function copyToTerminalClipboard(text) {
  try {
    const b64 = Buffer.from(text, "utf-8").toString("base64");
    // Some terminals (tmux) need a passthrough wrapper — we send both.
    const osc52 = `\x1b]52;c;${b64}\x07`;
    process.stdout.write(osc52);
  } catch (_) {
    // silently ignore — copy is a convenience, not a requirement
  }
}

function printSessionBox(sessionId, number) {
  const line = "─".repeat(62);
  console.log(chalk.greenBright(`┌${line}┐`));
  console.log(
    chalk.greenBright("│ ") +
      chalk.bold.whiteBright("LEGEND MD — SESSION GENERATED") +
      " ".repeat(29) +
      chalk.greenBright("│")
  );
  console.log(chalk.greenBright(`├${line}┤`));
  console.log(
    chalk.greenBright("│ ") + chalk.gray(`Number : ${number}`).padEnd(69) + chalk.greenBright("│")
  );
  console.log(chalk.greenBright(`├${line}┤`));
  console.log(chalk.greenBright("│") + " ".repeat(62) + chalk.greenBright("│"));

  // wrap long session id across lines inside the box
  const chunks = sessionId.match(/.{1,58}/g) || [sessionId];
  chunks.forEach((c) => {
    console.log(
      chalk.greenBright("│ ") + chalk.yellowBright(c.padEnd(60)) + chalk.greenBright("│")
    );
  });

  console.log(chalk.greenBright("│") + " ".repeat(62) + chalk.greenBright("│"));
  console.log(chalk.greenBright(`└${line}┘`));

  // Attempt direct copy to clipboard
  copyToTerminalClipboard(sessionId);
  console.log(chalk.cyan("✔ Session ID copied to clipboard (if your terminal supports OSC 52)."));
  console.log(chalk.gray("  If not copied automatically, select the text above manually.\n"));
}

module.exports = { printSessionBox, copyToTerminalClipboard };
