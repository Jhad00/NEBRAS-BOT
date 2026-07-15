import chalk from "chalk";

const colorsHex = {
  red: "#CC5555",
  redLight: "#E68A8A",
  redDark: "#992222",

  orange: "#f35709ff",
  orangeLight: "#FFB399",
  orangeDark: "#ff8000ff",

  yellow: "#FFFF99",
  yellowLight: "#FFFFCC",
  gold: "#FFD966",

  green: "#66CC66",
  greenLight: "#9eff9eff",
  greenDark: "#339933",

  blue: "#6699CC",
  blueLight: "#99CCFF",
  blueDark: "#336699",

  purple: "#9966CC",
  purpleLight: "#B399E6",
  purpleDark: "#663399",

  cyan: "#66CCCC",
  teal: "#66CC99",

  pink: "#FF99CC",
  pinkLight: "#FFCCE5",
  pinkDark: "#CC3399",

  brown: "#996633",
  brownLight: "#CC9966",
  brownDark: "#663300",

  lime: "#99CC33",
  limeLight: "#CCFF66",
  limeDark: "#669900",

  magenta: "#CC3399",
  magentaLight: "#E699CC",
  magentaDark: "#992266",

  gray: "#AAAAAA",
  grayLight: "#CCCCCC",
  grayDark: "#666666",

  black: "#000000",
  white: "#FFFFFF",
};


function createColor(hex) {
  const fn = (text) => chalk.hex(hex)(text);

  fn.bold = (text) => chalk.hex(hex).bold(text);
  fn.italic = (text) => chalk.hex(hex).italic(text);
  fn.boldItalic = (text) => chalk.hex(hex).bold.italic(text);

  fn.bg = (bgHex) => {
    const bgFn = (text) => chalk.hex(hex).bgHex(bgHex)(text);
    bgFn.bold = (text) => chalk.hex(hex).bgHex(bgHex).bold(text);
    bgFn.italic = (text) => chalk.hex(hex).bgHex(bgHex).italic(text);
    bgFn.boldItalic = (text) => chalk.hex(hex).bgHex(bgHex).bold.italic(text);
    return bgFn;
  };

  return fn;
}

export const color = {};
for (const [name, hex] of Object.entries(colorsHex)) {
  color[name] = createColor(hex);
}
