export const definer = (items = [], { separator = "\n" } = {}) => {
  return items
    .map(({ name = "", value = "" }) => `${name} : ${value}`)
    .join(separator);
};
