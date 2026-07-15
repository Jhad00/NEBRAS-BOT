import * as hex from "./hexJS.js";
import { env0 } from "./env/env.index.js";
import { startMenu } from "./interface/interface-index.js";

export { hex };

export async function runHexJS() {
  await env0();
  await startMenu();
}