import { phoneMeta } from "../../assets/ass-index.js";
//?delay(ms)
export const delay = (ms) => new Promise((res) => setTimeout(res, ms));
//?test & clean phone number
export function testPhone(rawNumber) {
  if (!rawNumber) return null;
  const cleanNumber = rawNumber.toString().trim().replace(/[^\d]/g, "");

  const codes = Object.keys(phoneMeta).sort((a, b) => b.length - a.length);
  let foundCode = null;

  for (const code of codes) {
    if (cleanNumber.startsWith(code)) {
      foundCode = code;
      break;
    }
  }

  if (!foundCode) {
    return {
      valid: false,
      cleaned: cleanNumber,
      countryCode: null,
      local: null,
    };
  }

  const local = cleanNumber.slice(foundCode.length);
  const validLength = phoneMeta[foundCode].includes(local.length);

  return {
    valid: validLength,
    cleaned: cleanNumber,
    countryCode: foundCode,
    local: local,
  };
}



//?gen random id
export async function randomId(
  params = {
    length: 3,
    number: null,
    charUpper: null,
    charLower: null,
  }
) {
  if (!params.number && !params.charLower && !params.charUpper) return null;
  if (params.length < 3) length = 3;
  if (params.length <= 0) return null;
  let chars = "";
  if (params.number) chars += "0123456789";
  if (params.charLower) chars += "abcdefghijklmnopqrstuvwxyz";
  if (params.charUpper) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (chars.length === 0) return null;
  let customId = "";
  for (let i = 0; i < params.length; i++)
    customId += chars[Math.floor(Math.random() * chars.length)];
  return customId;
}

export function filtring(array, elementsToRemove) {
  const removeSet = new Set(elementsToRemove);
  return array.filter(el => !removeSet.has(el));
}