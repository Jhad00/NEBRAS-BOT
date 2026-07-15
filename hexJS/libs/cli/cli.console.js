export const cli = {
  nl: (n = 1) => {
    for (let i = 0; i < n; i++) console.log();
  },
  clear: () => process.stdout.write("\x1B[3J\x1B[H\x1B[2J"),
};
