const defaults = {
  profiles: {
    female: { id: "female", name: "小鹿", avatar: "鹿", image: "", gender: "女", role: "member", theme: "rose", background: "paper", birthday: "" },
    male: { id: "male", name: "大树", avatar: "树", image: "", gender: "男", role: "member", theme: "rose", background: "paper", birthday: "" },
    admin: { id: "admin", name: "我们", avatar: "♡", image: "", gender: "管理员", role: "admin", theme: "rose", background: "paper", birthday: "" },
  },
  dailies: [],
  messages: [],
  wishes: [],
};

let state = null;
let activeProfileId = "female";
const sessionKey = "encounter-space-session";
const loginView = document.querySelector("#loginView");
const spaceView = document.querySelector("#spaceView");
const loginForm = document.querySelector("#loginForm");
const passwordInput = document.querySelector("#passwordInput");
const formError = document.querySelector("#formError");
const togglePassword = document.querySelector("#togglePassword");
const identityName = document.querySelector("#identityName");
const identityAvatar = document.querySelector("#identityAvatar");
const identityGreeting = document.querySelector("#identityGreeting");
const identityNote = document.querySelector("#identityNote");
const logoutButton = document.querySelector("#logoutButton");
const themeSettingsButton = document.querySelector("#themeSettingsButton");
const moodOptions = document.querySelectorAll(".mood-option");
const moodResult = document.querySelector("#moodResult");
const noteForm = document.querySelector("#noteForm");
const noteInput = document.querySelector("#noteInput");
const messageList = document.querySelector("#messageList");
const wishForm = document.querySelector("#wishForm");
const wishInput = document.querySelector("#wishInput");
const wishList = document.querySelector("#wishList");
const wishCount = document.querySelector("#wishCount");
const dailyForm = document.querySelector("#dailyForm");
const dailyInput = document.querySelector("#dailyInput");
const dailyImage = document.querySelector("#dailyImage");
const dailyImageLabel = document.querySelector("#dailyImageLabel");
const timelineList = document.querySelector("#timelineList");
const profileDialog = document.querySelector("#profileDialog");
const profileForm = document.querySelector("#profileForm");
const profileId = document.querySelector("#profileId");
const profileName = document.querySelector("#profileName");
const profileAvatar = document.querySelector("#profileAvatar");
const profileImage = document.querySelector("#profileImage");
const profilePermission = document.querySelector("#profilePermission");
const birthdayDialog = document.querySelector("#birthdayDialog");
const birthdayForm = document.querySelector("#birthdayForm");
const birthdayId = document.querySelector("#birthdayId");
const birthdayInput = document.querySelector("#birthdayInput");
const themeDialog = document.querySelector("#themeDialog");
const themeForm = document.querySelector("#themeForm");
const themeIdentity = document.querySelector("#themeIdentity");
const themePermission = document.querySelector("#themePermission");

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

async function request(path, options = {}) {
  const response = await fetch(path, { headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "请求失败，请稍后再试");
  return payload;
}

function mergeState(next) {
  state = next;
  renderState();
}

function activeIdentity() {
  return state?.user?.id || "female";
}

function canEdit(id) {
  return activeIdentity() === "admin" || activeIdentity() === id;
}

function renderState() {
  if (!state) return;
  const current = state.profiles[activeIdentity()] || defaults.profiles[activeIdentity()];
  const theme = current.theme || "rose";
  const background = current.background || "paper";
  document.body.className = `theme-${theme} background-${background}`;
  identityName.textContent = current.name;
  identityGreeting.textContent = current.greeting || defaults.profiles[activeIdentity()].greeting;
  identityNote.textContent = activeIdentity() === "admin" ? "你以网站管理员身份进入了空间" : `你以${current.name}的身份进入了空间`;
  setAvatar(identityAvatar, current);
  renderProfiles();
  renderBirthdays();
  renderMessages();
  renderWishes();
  renderDailies();
  applyThemeDialogPermissions();
  refreshIcons();
}

function setAvatar(element, profile) {
  element.textContent = "";
  if (profile.image) {
    const image = document.createElement("img");
    image.src = profile.image;
    image.alt = `${profile.name}的头像`;
    element.appendChild(image);
  } else {
    element.textContent = profile.avatar || profile.name.slice(0, 1);
  }
}

function createAvatar(profile, className = "") {
  const element = document.createElement("span");
  element.className = `person-avatar ${className}`;
  setAvatar(element, profile);
  return element;
}

function renderProfiles() {
  ["female", "male"].forEach((id) => {
    const profile = state.profiles[id] || defaults.profiles[id];
    const avatar = document.querySelector(`[data-profile-avatar="${id}"]`);
    const name = document.querySelector(`[data-profile-name="${id}"]`);
    const edit = document.querySelector(`[data-edit-profile="${id}"]`);
    if (avatar) setAvatar(avatar, profile);
    if (name) name.textContent = profile.name;
    if (edit) {
      edit.hidden = !canEdit(id);
      edit.setAttribute("aria-label", `编辑${profile.name}资料`);
    }
  });
}

function formatTime(value) {
  if (!value) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function profileFor(id) {
  return state.profiles[id] || defaults.profiles[id];
}

function renderMessages() {
  messageList.replaceChildren();
  const messages = state.messages || [];
  if (!messages.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "还没有留言，把第一句话留在这里吧。";
    messageList.appendChild(empty);
    return;
  }
  messages.forEach((message) => {
    const author = profileFor(message.author);
    const item = document.createElement("article");
    item.className = `message-bubble ${message.author === activeIdentity() ? "mine" : "theirs"}`;
    const avatar = createAvatar(author, message.author === "female" ? "avatar-coral" : "avatar-sage");
    const body = document.createElement("div");
    body.className = "message-body";
    const meta = document.createElement("div");
    meta.className = "message-meta";
    meta.innerHTML = `<strong></strong><span>${formatTime(message.createdAt)}</span>`;
    meta.querySelector("strong").textContent = author.name;
    const content = document.createElement("p");
    content.textContent = message.content;
    body.append(meta, content);
    item.append(message.author === activeIdentity() ? body : avatar, message.author === activeIdentity() ? avatar : body);
    if (activeIdentity() === "admin") {
      const remove = document.createElement("button");
      remove.className = "content-delete";
      remove.type = "button";
      remove.dataset.deleteMessage = message.id;
      remove.title = "管理员删除留言";
      remove.setAttribute("aria-label", "删除留言");
      remove.innerHTML = '<i data-lucide="trash-2"></i>';
      item.appendChild(remove);
    }
    messageList.appendChild(item);
  });
}

function renderDailies() {
  timelineList.querySelectorAll(".remote-daily").forEach((item) => item.remove());
  (state.dailies || []).slice().reverse().forEach((daily) => {
    const author = profileFor(daily.author);
    const item = document.createElement("article");
    item.className = "timeline-item remote-daily";
    const marker = document.createElement("div");
    marker.className = `timeline-marker ${daily.author === "male" ? "marker-green" : ""}`;
    marker.appendChild(createAvatar(author, daily.author === "male" ? "avatar-sage" : "avatar-coral"));
    const content = document.createElement("div");
    content.className = "timeline-content";
    content.innerHTML = `<div class="timeline-meta"><span>${formatTime(daily.createdAt)}</span><span class="tag">${escapeHtml(author.name)}的日常</span></div><h3></h3><p>记录给${activeIdentity() === daily.author ? "我们的空间" : "你"}的今天。</p>`;
    content.querySelector("h3").textContent = daily.content || "分享了一张图片";
    if (daily.image) {
      const image = document.createElement("img");
      image.className = "daily-image";
      image.src = daily.image;
      image.alt = `${author.name}分享的日常图片`;
      content.appendChild(image);
    }
    item.append(marker, content);
    if (activeIdentity() === "admin") {
      const remove = document.createElement("button");
      remove.className = "content-delete daily-delete";
      remove.type = "button";
      remove.dataset.deleteDaily = daily.id;
      remove.title = "管理员删除日常";
      remove.setAttribute("aria-label", "删除日常");
      remove.innerHTML = '<i data-lucide="trash-2"></i>';
      item.appendChild(remove);
    }
    timelineList.prepend(item);
  });
}

function daysUntilBirthday(date) {
  if (!date) return null;
  const today = new Date();
  const birthday = new Date(`${today.getFullYear()}-${date.slice(5)}`);
  birthday.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  if (birthday < today) birthday.setFullYear(today.getFullYear() + 1);
  return Math.round((birthday - today) / 86400000);
}

function renderBirthdays() {
  const list = document.querySelector("#birthdayList");
  list.replaceChildren();
  ["female", "male"].forEach((id) => {
    const profile = profileFor(id);
    const row = document.createElement("div");
    row.className = "birthday-row";
    const info = document.createElement("div");
    info.className = "birthday-person";
    const avatar = createAvatar(profile, id === "female" ? "avatar-coral" : "avatar-sage");
    const copy = document.createElement("div");
    copy.innerHTML = `<strong></strong><span></span>`;
    copy.querySelector("strong").textContent = profile.name;
    const days = daysUntilBirthday(profile.birthday);
    copy.querySelector("span").textContent = profile.birthday ? (days === 0 ? "今天生日" : `还有 ${days} 天`) : "还没有设置生日";
    info.append(avatar, copy);
    row.append(info);
    if (canEdit(id)) {
      const button = document.createElement("button");
      button.className = "edit-icon birthday-edit";
      button.type = "button";
      button.dataset.editBirthday = id;
      button.title = "设置生日";
      button.setAttribute("aria-label", `设置${profile.name}生日`);
      button.innerHTML = '<i data-lucide="calendar-pen"></i>';
      row.appendChild(button);
    }
    list.appendChild(row);
  });
  const reminders = ["female", "male"].map((id) => daysUntilBirthday(profileFor(id).birthday)).filter((days) => days !== null && days <= 7);
  document.querySelector("#birthdayResult").textContent = reminders.length ? "生日快到了，别忘了准备惊喜。" : "设置生日后，这里会提醒你们。";
}

function renderWishes() {
  wishList.replaceChildren();
  const wishes = state.wishes || [];
  const completed = wishes.filter((wish) => wish.completed).length;
  wishCount.textContent = `${completed} / ${wishes.length}`;
  if (!wishes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "把想一起完成的事写下来。";
    wishList.appendChild(empty);
    return;
  }
  wishes.forEach((wish) => {
    const row = document.createElement("div");
    row.className = `wish-item ${wish.completed ? "completed" : ""}`;
    row.innerHTML = `<button class="wish-check" type="button" data-wish-toggle="${wish.id}" aria-label="标记心愿完成"><i data-lucide="check"></i></button><span class="wish-text"></span><button class="wish-delete" type="button" data-wish-delete="${wish.id}" aria-label="删除心愿"><i data-lucide="x"></i></button>`;
    row.querySelector(".wish-text").textContent = wish.content;
    wishList.appendChild(row);
  });
}

function openProfileEditor(id) {
  if (!canEdit(id)) return;
  const profile = profileFor(id);
  profileId.value = id;
  profileName.value = profile.name;
  profileAvatar.value = profile.avatar || "";
  profileImage.value = "";
  profilePermission.textContent = activeIdentity() === "admin" ? "管理员可以编辑双方资料。" : "你只能编辑自己的资料。";
  profileDialog.showModal();
}

function applyThemeDialogPermissions() {
  [...themeIdentity.options].forEach((option) => {
    option.disabled = activeIdentity() !== "admin" && option.value !== activeIdentity();
  });
  if (!canEdit(themeIdentity.value)) themeIdentity.value = activeIdentity();
  const profile = profileFor(themeIdentity.value);
  const selectedTheme = themeForm.querySelector(`input[name="theme"][value="${profile.theme || "rose"}"]`);
  const selectedBackground = themeForm.querySelector(`input[name="background"][value="${profile.background || "paper"}"]`);
  if (selectedTheme) selectedTheme.checked = true;
  if (selectedBackground) selectedBackground.checked = true;
  themePermission.textContent = activeIdentity() === "admin" ? "管理员可以为三个身份分别设置主题。" : "这里只能设置当前身份的主题。";
}

async function completeRequest(requestPromise, successMessage = "") {
  try {
    const next = await requestPromise;
    if (next.profiles) mergeState(next);
    return next;
  } catch (error) {
    alert(error.message);
    throw error;
  }
}

async function showSpace(nextState) {
  mergeState(nextState);
  loginView.hidden = true;
  spaceView.hidden = false;
  passwordInput.value = "";
  formError.textContent = "";
  window.localStorage.setItem(sessionKey, "server-session");
}

async function loadSession() {
  try {
    const next = await request("/api/state");
    await showSpace(next);
  } catch (_) {
    window.localStorage.removeItem(sessionKey);
  }
}

async function leaveSpace() {
  try { await request("/api/logout", { method: "POST", body: "{}" }); } catch (_) { /* session may already be gone */ }
  state = null;
  document.body.className = "";
  spaceView.hidden = true;
  loginView.hidden = false;
  passwordInput.focus();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await showSpace(await request("/api/login", { method: "POST", body: JSON.stringify({ password: passwordInput.value }) }));
  } catch (error) {
    formError.textContent = error.message;
    loginForm.classList.remove("shake");
    void loginForm.offsetWidth;
    loginForm.classList.add("shake");
    passwordInput.select();
  }
});

togglePassword.addEventListener("click", () => {
  const shouldShow = passwordInput.type === "password";
  passwordInput.type = shouldShow ? "text" : "password";
  togglePassword.setAttribute("aria-label", shouldShow ? "隐藏密码" : "显示密码");
  togglePassword.setAttribute("title", shouldShow ? "隐藏密码" : "显示密码");
  togglePassword.innerHTML = `<i data-lucide="${shouldShow ? "eye-off" : "eye"}"></i>`;
  refreshIcons();
});

logoutButton.addEventListener("click", leaveSpace);
moodOptions.forEach((option) => option.addEventListener("click", () => {
  moodOptions.forEach((item) => item.classList.remove("selected"));
  option.classList.add("selected");
  moodResult.textContent = `已把“${option.dataset.mood}”告诉对方`;
}));

document.addEventListener("click", async (event) => {
  const profileButton = event.target.closest("[data-edit-profile]");
  if (profileButton) openProfileEditor(profileButton.dataset.editProfile);
  const birthdayButton = event.target.closest("[data-edit-birthday]");
  if (birthdayButton) {
    const id = birthdayButton.dataset.editBirthday;
    birthdayId.value = id;
    birthdayInput.value = profileFor(id).birthday || "";
    birthdayDialog.showModal();
  }
  const toggle = event.target.closest("[data-wish-toggle]");
  if (toggle) await completeRequest(request(`/api/wishes/${toggle.dataset.wishToggle}`, { method: "PATCH", body: JSON.stringify({ completed: !toggle.closest(".wish-item").classList.contains("completed") }) }));
  const remove = event.target.closest("[data-wish-delete]");
  if (remove) await completeRequest(request(`/api/wishes/${remove.dataset.wishDelete}`, { method: "DELETE", body: "{}" }));
  const deleteMessage = event.target.closest("[data-delete-message]");
  if (deleteMessage && activeIdentity() === "admin" && window.confirm("确定删除这条留言吗？")) {
    await completeRequest(request(`/api/messages/${deleteMessage.dataset.deleteMessage}`, { method: "DELETE", body: "{}" }));
  }
  const deleteDaily = event.target.closest("[data-delete-daily]");
  if (deleteDaily && activeIdentity() === "admin" && window.confirm("确定删除这条日常吗？")) {
    await completeRequest(request(`/api/dailies/${deleteDaily.dataset.deleteDaily}`, { method: "DELETE", body: "{}" }));
  }
});

noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = noteInput.value.trim();
  if (!content) return noteInput.focus();
  const next = await completeRequest(request("/api/messages", { method: "POST", body: JSON.stringify({ content }) }));
  noteInput.value = "";
  const status = document.querySelector("#messageStatus");
  status.innerHTML = `<i data-lucide="${next.mailed ? "mail-check" : "mail"}"></i> ${next.mailed ? "已发送邮件提醒" : "留言已保存"}`;
  refreshIcons();
});

wishForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = wishInput.value.trim();
  if (!content) return wishInput.focus();
  await completeRequest(request("/api/wishes", { method: "POST", body: JSON.stringify({ content }) }));
  wishInput.value = "";
});

dailyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = dailyInput.value.trim();
  const image = dailyImage.files[0] ? await readFile(dailyImage.files[0]) : "";
  if (!content && !image) return dailyInput.focus();
  await completeRequest(request("/api/dailies", { method: "POST", body: JSON.stringify({ content, image }) }));
  dailyInput.value = "";
  dailyImage.value = "";
  dailyImageLabel.textContent = "添加图片";
});

dailyImage.addEventListener("change", () => {
  dailyImageLabel.textContent = dailyImage.files[0]?.name || "添加图片";
});

themeSettingsButton.addEventListener("click", () => {
  applyThemeDialogPermissions();
  themeDialog.showModal();
});
themeIdentity.addEventListener("change", applyThemeDialogPermissions);
themeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const theme = themeForm.querySelector('input[name="theme"]:checked')?.value || "rose";
  const background = themeForm.querySelector('input[name="background"]:checked')?.value || "paper";
  await completeRequest(request(`/api/preferences/${themeIdentity.value}`, { method: "PATCH", body: JSON.stringify({ theme, background }) }));
  themeDialog.close();
});
document.querySelector("#cancelTheme").addEventListener("click", () => themeDialog.close());
document.querySelector("#cancelProfile").addEventListener("click", () => profileDialog.close());
document.querySelector("#cancelBirthday").addEventListener("click", () => birthdayDialog.close());

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const image = profileImage.files[0] ? await readFile(profileImage.files[0]) : undefined;
  await completeRequest(request(`/api/profiles/${profileId.value}`, { method: "PATCH", body: JSON.stringify({ name: profileName.value, avatar: profileAvatar.value, image }) }));
  profileDialog.close();
});
birthdayForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await completeRequest(request(`/api/birthdays/${birthdayId.value}`, { method: "PATCH", body: JSON.stringify({ birthday: birthdayInput.value }) }));
  birthdayDialog.close();
});

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

loadSession();
refreshIcons();