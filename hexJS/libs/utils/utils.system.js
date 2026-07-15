import si from "systeminformation";

export async function system() {
  const os = await si.osInfo();
  const cpu = await si.cpu();
  const disk = await si.diskLayout();
  const mem = await si.mem();
  const uptime = si.time();
  const users = await si.users();

  return {
    os,
    cpu,
    disk,
    ram: `${(mem.total / 1024 / 1024 / 1024).toFixed(2)} GB`,
    uptime,
    users,
    processor: `${cpu.manufacturer} ${cpu.brand}`,
  };
}
