import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath =  path.resolve("config.js");
const configModule = await import(configPath);

export const config = configModule.default;
export const fp = {
  config: configPath,
};
export const dp = {
  clients: path.resolve(config.client_dirname),
  commands: path.resolve(config.commands_dirname),
  local_base: path.resolve(__dirname, "../resources/data"),
};
