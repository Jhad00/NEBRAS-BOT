import fs from "fs";
import path from "path";

export async function creeds_updates(waClient, saveCreds) {
  let credsSaved = false;
  
  waClient.ev.on('creds.update', async () => {
    await saveCreds();
    
    // remove placeholder file on first successful creds save
    if (!credsSaved && waClient.clientName) {
      credsSaved = true;
      const clientFolder = path.join(process.cwd(), "clients", waClient.clientName);
      const placeholderPath = path.join(clientFolder, ".gitkeep");
      
      try {
        if (fs.existsSync(placeholderPath)) {
          fs.unlinkSync(placeholderPath);
        }
      } catch (err) {
        // silent
      }
    }
  });
}
