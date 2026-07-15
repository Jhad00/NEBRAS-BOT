import fs from "fs";
import path from "path";
import { params, activeClients, dp, pendingClients } from "./ass-index.js";
//
// FOR MANAGE CLIENTS
//
export const clientManager = {
  // GET ACTIVE CLIENTS
getActiveClients: async () => {
  const keys = Object.keys(activeClients || []);
  return keys; 
},


getAllClients: async () => {
  try {
    const names = await fs.promises.readdir(dp.clients);
    if (names.length === 0) return []; 
    const result = [];
    for (const name of names) {
      const dir = path.join(dp.clients, name);
      const stat = await fs.promises.stat(dir);
      if (
        stat.isDirectory() &&
        !(await validationManager.isEmptyClientFolder(dir))
      ) {
        result.push(name);
      }
    }
    return result; 
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
},
 //DELETE CLIENT 
  deleteClient: async (clientName) => {
    if (pendingClients[clientName]) {
      pendingClients[clientName].waClient?.ev?.removeAllListeners();
      delete pendingClients[clientName];
    }
    if (activeClients[clientName]) {
      activeClients[clientName].waClient?.ev?.removeAllListeners();
      delete activeClients[clientName];
    }
    const clientFolder = path.join(dp.clients, clientName);
    if (fs.existsSync(clientFolder)) {
      fs.rmSync(clientFolder, { recursive: true, force: true });
    }
    
    // delete client data folder in data/
    const clientDataFolder = path.resolve(process.cwd(), "data", clientName);
    if (fs.existsSync(clientDataFolder)) {
      fs.rmSync(clientDataFolder, { recursive: true, force: true });
    }
  },
};
//
// FOR CHECK DIFFIRENTS VALIDATION
//
export const validationManager = {
  // CHECK NAME VALID
  isClientAvailable: async (clientName) => {
    const regex = /^[a-zA-Z0-9-_]{3,20}$/;
    if (!regex.test(clientName.toLowerCase())) return false;
    const folderPath = path.join(dp.clients, clientName.toLowerCase());
    try {
      await fs.promises.access(folderPath, fs.constants.F_OK);
      const files = await fs.promises.readdir(folderPath);
      const isEmpty =
        files.length === 0 || (files.length === 1 && files[0] === ".DS_Store");
      if (!isEmpty) return false;
      return true;
    } catch (err) {
      if (err.code === "ENOENT") {
        return true;
      }
    }
  },
 

  // CHECK IS EMPTY CLIENT FOLDER
  isEmptyClientFolder: async (folderPath) => {
    try {
      const files = await fs.promises.readdir(folderPath);
      return ( files.length <= 5 );
    } catch (err) {
      if (err.code === "ENOENT") return true;
      throw err;
    }
  },
};
//
//
//

