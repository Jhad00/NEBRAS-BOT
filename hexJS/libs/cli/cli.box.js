import boxen from "boxen";

export const box = (text, options = {}) => {
  const {
    padding = { top: 0.5, bottom: 0.5, left: 1, right: 1 },
    margin = 0,
    borderStyle = "single",
    borderColor = "white",
    backgroundColor = undefined, 
    align = "left",
  } = options;

  return boxen(text, {
    padding,
    margin,
    borderStyle,
    borderColor,
    backgroundColor, 
    textAlignment: align,
  });
};
