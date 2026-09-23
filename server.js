require('dotenv').config();
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { URL } = require("node:url");

let nodemailer;
try { nodemailer = require("nodemailer"); } catch (_) { nodemailer = null; }

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "space.json");
const PUBLIC_FILES = new Set(["index.html", "styles.css", "app.js"]);
const sessions = new Map();

const identities = {
  female: { id: "female", name: "小鹿", avatar: "鹿", gender: "女", role: "member", greeting: "今天也要好好生活，然后见面。" },
  male: { id: "male", name: "大树", avatar: "树", gender: "男", role: "member", greeting: "今天也记得，把想念放进日常里。" },
  admin: { id: "admin", name: "我们", avatar: "♡", gender: "管理员", role: "admin", greeting: "欢迎回到只属于我们的地方。" },
};

const defaultData = {
  profiles: {
    female: { ...identities.female, image: "", birthday: "", theme: "rose", background: "paper" },
    male: { ...identities.male, image: "", birthday: "", theme: "rose", background: "paper" },
    admin: { ...identities.admin, image: "", birthday: "", theme: "rose", background: "paper" },
  },
  dailies: [],
  messages: [],
  wishes: [],
};

function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) writeData(defaultData);
}

function readData() {
  ensureData();
  try {
    return { ...defaultData, ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) };
  } catch (_) {
    return structuredClone(defaultData);
  }
}

function writeData(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporary = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(temporary, DATA_FILE);
}

function publicUser(identity) {
  const profile = readData().profiles[identity.id] || identities[identity.id];
  return { id: profile.id, name: profile.name, avatar: profile.avatar, image: profile.image || "", role: profile.role, gender: profile.gender };
}

function getPassword(id) {
  const defaults = { female: "moon-0820", male: "forest-1124", admin: "together-520" };
  return process.env[`${id.toUpperCase()}_PASSWORD`] || defaults[id];
}

function authenticate(password) {
  const clean = String(password || "").trim();
  return Object.keys(identities).find((id) => clean === getPassword(id)) || null;
}

function cookieValue(request, name) {
  const cookie = request.headers.cookie || "";
  const found = cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : "";
}

function currentIdentity(request) {
  const token = cookieValue(request, "encounter_session");
  const id = sessions.get(token);
  return id ? identities[id] : null;
}

function sendJson(response, status, payload, extraHeaders = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders });
  response.end(JSON.stringify(payload));
}

function sendError(response, status, message) { sendJson(response, status, { error: message }); }

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 12 * 1024 * 1024) reject(new Error("request too large"));
    });
    request.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (_) { reject(new Error("invalid json")); }
    });
    request.on("error", reject);
  });
}

function safeText(value, max) { return String(value || "").trim().slice(0, max); }
function canEdit(user, id) { return user.role === "admin" || user.id === id; }

function stateFor(user) {
  const data = readData();
  return { user: publicUser(user), profiles: data.profiles, dailies: data.dailies, messages: data.messages, wishes: data.wishes };
}

async function sendMessageEmail(message, sender, data) {
  if (sender.id === "admin") return false;
  const recipient = sender.id === "female" ? process.env.MALE_EMAIL : process.env.FEMALE_EMAIL;
  if (!recipient || !nodemailer || !process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return false;
  const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465), secure: String(process.env.SMTP_SECURE || "true") === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  await transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to: recipient, subject: `相遇：${sender.name}给你留言`, text: `${sender.name}给你留了一句话：\n\n${message.content}\n\n打开情侣空间查看：${process.env.SITE_URL || ""}` });
  return true;
}

function serveStatic(request, response, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  if (!PUBLIC_FILES.has(requested)) return sendError(response, 404, "not found");
  const filePath = path.join(ROOT, requested);
  const types = { "index.html": "text/html; charset=utf-8", "styles.css": "text/css; charset=utf-8", "app.js": "application/javascript; charset=utf-8" };
  response.writeHead(200, { "Content-Type": types[requested], "Cache-Control": "no-cache" });
  fs.createReadStream(filePath).pipe(response);
}

async function handleApi(request, response, url) {
  const user = currentIdentity(request);
  if (url.pathname === "/api/login" && request.method === "POST") {
    const body = await readBody(request);
    const id = authenticate(body.password);
    if (!id) return sendError(response, 401, "密码不正确，请再试一次。");
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, id);
    return sendJson(response, 200, stateFor(identities[id]), { "Set-Cookie": `encounter_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000` });
  }
  if (url.pathname === "/api/logout" && request.method === "POST") {
    const token = cookieValue(request, "encounter_session");
    sessions.delete(token);
    return sendJson(response, 200, { ok: true }, { "Set-Cookie": "encounter_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" });
  }
  if (!user) return sendError(response, 401, "请先登录");
  if (url.pathname === "/api/state" && request.method === "GET") return sendJson(response, 200, stateFor(user));

  const data = readData();
  if (url.pathname.startsWith("/api/profiles/") && request.method === "PATCH") {
    const id = url.pathname.split("/").pop();
    if (!data.profiles[id] || !canEdit(user, id)) return sendError(response, 403, "没有修改这个身份的权限");
    const body = await readBody(request);
    const profile = data.profiles[id];
    profile.name = safeText(body.name, 20) || profile.name;
    profile.avatar = safeText(body.avatar, 2) || profile.avatar;
    if (typeof body.image === "string" && body.image.length < 5 * 1024 * 1024) profile.image = body.image;
    writeData(data);
    return sendJson(response, 200, stateFor(user));
  }
  if (url.pathname.startsWith("/api/preferences/") && request.method === "PATCH") {
    const id = url.pathname.split("/").pop();
    if (!data.profiles[id] || !canEdit(user, id)) return sendError(response, 403, "没有修改这个身份主题的权限");
    const body = await readBody(request);
    if (["rose", "lilac", "sage", "sunset"].includes(body.theme)) data.profiles[id].theme = body.theme;
    if (["paper", "lines", "blush"].includes(body.background)) data.profiles[id].background = body.background;
    writeData(data);
    return sendJson(response, 200, stateFor(user));
  }
  if (url.pathname.startsWith("/api/birthdays/") && request.method === "PATCH") {
    const id = url.pathname.split("/").pop();
    if (!data.profiles[id] || !canEdit(user, id)) return sendError(response, 403, "没有修改这个生日的权限");
    const body = await readBody(request);
    data.profiles[id].birthday = /^\d{4}-\d{2}-\d{2}$/.test(body.birthday || "") ? body.birthday : "";
    writeData(data);
    return sendJson(response, 200, stateFor(user));
  }
  if (url.pathname === "/api/dailies" && request.method === "POST") {
    const body = await readBody(request);
    const content = safeText(body.content, 300);
    if (!content && !body.image) return sendError(response, 400, "请写点内容或添加图片");
    const daily = { id: crypto.randomUUID(), author: user.id, content, image: typeof body.image === "string" && body.image.length < 6 * 1024 * 1024 ? body.image : "", createdAt: new Date().toISOString() };
    data.dailies.unshift(daily);
    data.dailies = data.dailies.slice(0, 100);
    writeData(data);
    return sendJson(response, 201, stateFor(user));
  }
  if (url.pathname === "/api/messages" && request.method === "POST") {
    const content = safeText((await readBody(request)).content, 160);
    if (!content) return sendError(response, 400, "留言不能为空");
    const message = { id: crypto.randomUUID(), author: user.id, content, createdAt: new Date().toISOString() };
    data.messages.unshift(message);
    data.messages = data.messages.slice(0, 200);
    writeData(data);
    let mailed = false;
    try { mailed = await sendMessageEmail(message, publicUser(user), data); } catch (error) { console.error("mail error", error.message); }
    return sendJson(response, 201, { ...stateFor(user), mailed });
  }
  if (url.pathname.startsWith("/api/messages/") && request.method === "DELETE") {
    if (user.role !== "admin") return sendError(response, 403, "只有管理员可以删除留言");
    const id = url.pathname.split("/").pop();
    data.messages = data.messages.filter((message) => message.id !== id);
    writeData(data);
    return sendJson(response, 200, stateFor(user));
  }
  if (url.pathname.startsWith("/api/dailies/") && request.method === "DELETE") {
    if (user.role !== "admin") return sendError(response, 403, "只有管理员可以删除日常");
    const id = url.pathname.split("/").pop();
    data.dailies = data.dailies.filter((daily) => daily.id !== id);
    writeData(data);
    return sendJson(response, 200, stateFor(user));
  }  if (url.pathname === "/api/wishes" && request.method === "POST") {
    const content = safeText((await readBody(request)).content, 100);
    if (!content) return sendError(response, 400, "心愿不能为空");
    data.wishes.unshift({ id: crypto.randomUUID(), content, completed: false, author: user.id, createdAt: new Date().toISOString() });
    writeData(data);
    return sendJson(response, 201, stateFor(user));
  }
  if (url.pathname.startsWith("/api/wishes/") && request.method === "PATCH") {
    const item = data.wishes.find((wish) => wish.id === url.pathname.split("/").pop());
    if (!item) return sendError(response, 404, "心愿不存在");
    item.completed = Boolean((await readBody(request)).completed);
    writeData(data);
    return sendJson(response, 200, stateFor(user));
  }
  if (url.pathname.startsWith("/api/wishes/") && request.method === "DELETE") {
    data.wishes = data.wishes.filter((wish) => wish.id !== url.pathname.split("/").pop());
    writeData(data);
    return sendJson(response, 200, stateFor(user));
  }
  return sendError(response, 404, "not found");
}

ensureData();
http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) await handleApi(request, response, url);
    else serveStatic(request, response, url.pathname);
  } catch (error) {
    console.error(error);
    sendError(response, 500, "服务器暂时不可用");
  }
}).listen(PORT, () => console.log(`Couple space running at http://localhost:${PORT}`));