import { HarmDB, HarmManager } from "harm32-js";
import { currentClient_user, dp } from "../assets/ass-index.js";
import path from "path";
//
//!code
/////////////////////////
// ?< Fetch group info >
/////////////////////////
export async function fetchGroup(
  id,
  options = { waClient: currentClient_user.waClient }
) {
  if (!id.endsWith("g.us")) return null;
  return await options.waClient.groupMetadata(id);
}
////////////////////
//? <get admins>
///////////////////
export async function getAdmins(
  id,
  options = { waClient: currentClient_user.waClient, includeMe: false }
) {
  if (!id.endsWith("g.us")) return null;
  const botId = {
    id: options.waClient.user.id.split(":")[0] + "@s.whatsapp.net",
    lid: options.waClient.user.lid.split(":")[0] + "@lid",
  };
  const metadata = await options.waClient.groupMetadata(id);
  switch (options.includeMe) {
    case false:
      return metadata.participants
        .filter((p) => p.admin && p.id !== botId.id && p.id !== botId.lid)
        .map((p) => p.id);
    case true:
      return metadata.participants.filter((p) => p.admin).map((p) => p.id);
  }
}

////////////////////////////
//? <Get group participants>
///////////////////////////
export async function getParticipants(
  id,
  options = { waClient: currentClient_user.waClient, includeMe: false }
) {
  if (!id.endsWith("g.us")) return null;
  const botId = {
    id: options.waClient.user.id.split(":")[0] + "@s.whatsapp.net",
    lid: options.waClient.user.lid.split(":")[0] + "@lid",
  };

  const metadata = await options.waClient.groupMetadata(id);
  switch (options.includeMe) {
    case false:
      return metadata.participants
        .filter((p) => p.id !== botId.id && p.id !== botId.lid)
        .map((p) => p.id);
    case true:
      return metadata.participants.map((p) => p.id);
  }
}

//////////////////
//? <change subject>
export async function setName(
  id,
  name,
  options = { waClient: currentClient_user.waClient }
) {
  if (!id.endsWith("g.us")) return null;
  if (!name || name.length === 0) return null;
  try {
    await options.waClient.groupUpdateSubject(id, name);
    return true;
  } catch (error) {
    return null;
  }
}
//? <descreption update >
export async function setDescription(
  id,
  desc,
  options = { waClient: currentClient_user.waClient }
) {
  if (!id.endsWith("g.us")) return null;
  if (!desc || desc.length === 0) return null;
  try {
    await options.waClient.groupUpdateDescription(id, desc);
  } catch (error) {
    return null;
  }
}
//? <iamge update>
export async function setImage(
  id,
  image,
  options = { waClient: currentClient_user.waClient }
) {
  if (!id.endsWith("g.us")) return null;
  if (!image || image.length === 0) return null;
  try {
    if (image === "none")
      return await options.waClient.removeProfilePicture(id);

    return await options.waClient.updateProfilePicture(id, { url: image });
  } catch (error) {
    return null;
  }
}
//?open chat
export async function setChat(
  id,
  status,
  options = { waClient: currentClient_user.waClient }
) {
  if (!id.endsWith("@g.us")) return null;
  switch (status) {
    case "open":
      return options.waClient.groupSettingUpdate(id, "not_announcement");
    case "close":
      return options.waClient.groupSettingUpdate(id, "announcement");
  }
}
//?get group settings
export async function getSettings(
  id,
  options = { waClient: currentClient_user.waClient }
) {
  if (!id.endsWith("@g.us")) return null;
  const metadata = await fetchGroup(id, { waClient: options.waClient });
  return {
    adding: metadata.memberAddMode,
    joinApproval: metadata.joinApprovalMode,
    locked: metadata.announce,
    editing: !metadata.restrict,
  };
}
// ? <get requestJoinParticipants>
export async function requestJoin(
  id,
  options = { waClient: currentClient_user.waClient }
) {
  if (!id.endsWith("@g.us")) return null;
  const requests = await options.waClient.groupRequestParticipantsList(id);
  if (requests && requests.length > 0) return requests.map((p) => p.jid);
  return null;
}
//? <check if bot is admin in group>
export async function isBotAdmin(groupId, options = { waClient: currentClient_user.waClient }) {
  if (!groupId || !groupId.endsWith("@g.us")) return false;
  
  try {
    const metadata = await options.waClient.groupMetadata(groupId);
    const botId = {
      id: options.waClient.user.id.split(":")[0] + "@s.whatsapp.net",
      lid: options.waClient.user.lid.split(":")[0] + "@lid",
    };
    
    const participant = metadata.participants.find(p => 
      p.id === botId.id || p.id === botId.lid
    );
    
    if (!participant) return false;
    
    // Check if participant has admin role (admin or superadmin)
    return participant.admin === "admin" || participant.admin === "superadmin";
  } catch (error) {
    console.error("isBotAdmin error:", error);
    return false;
  }
}

//? <get admin status for multiple groups>
export async function getGroupsAdminStatus(groups, options = { waClient: currentClient_user.waClient }) {
  const results = {};
  const botId = {
    id: options.waClient.user.id.split(":")[0] + "@s.whatsapp.net",
    lid: options.waClient.user.lid.split(":")[0] + "@lid",
  };
  
  for (const group of groups) {
    const groupId = group.id;
    if (!groupId || !groupId.endsWith("@g.us")) {
      results[groupId] = false;
      continue;
    }
    
    try {
      const participant = group.participants?.find(p => 
        p.id === botId.id || p.id === botId.lid
      );
      
      results[groupId] = participant?.admin === "admin" || participant?.admin === "superadmin" || false;
    } catch {
      results[groupId] = false;
    }
  }
  
  return results;
}