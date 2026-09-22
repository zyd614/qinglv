const identityMap = {
  "moon-0820": {
    name: "小鹿",
    avatar: "鹿",
    greeting: "今天也要好好生活，然后见面。",
    note: "你以小鹿的身份进入了空间",
  },
  "forest-1124": {
    name: "大树",
    avatar: "树",
    greeting: "今天也记得，把想念放进日常里。",
    note: "你以大树的身份进入了空间",
  },
  "together-520": {
    name: "我们",
    avatar: "♡",
    greeting: "欢迎回到只属于我们的地方。",
    note: "你以共同空间的身份进入了空间",
  },
};

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
const moodOptions = document.querySelectorAll(".mood-option");
const moodResult = document.querySelector("#moodResult");
const noteForm = document.querySelector("#noteForm");
const noteInput = document.querySelector("#noteInput");
const timelineList = document.querySelector("#timelineList");

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function getIdentity(password) {
  return identityMap[password.trim().toLowerCase()];
}

function showSpace(password) {
  const identity = getIdentity(password);

  if (!identity) {
    return;
  }

  identityName.textContent = identity.name;
  identityAvatar.textContent = identity.avatar;
  identityGreeting.textContent = identity.greeting;
  identityNote.textContent = identity.note;
  loginView.hidden = true;
  spaceView.hidden = false;
  passwordInput.value = "";
  formError.textContent = "";
  window.localStorage.setItem(sessionKey, password.trim().toLowerCase());
  refreshIcons();
}

function leaveSpace() {
  window.localStorage.removeItem(sessionKey);
  spaceView.hidden = true;
  loginView.hidden = false;
  passwordInput.focus();
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = passwordInput.value;

  if (!getIdentity(password)) {
    formError.textContent = "密码不正确，请再试一次。";
    loginForm.classList.remove("shake");
    void loginForm.offsetWidth;
    loginForm.classList.add("shake");
    passwordInput.select();
    return;
  }

  showSpace(password);
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

moodOptions.forEach((option) => {
  option.addEventListener("click", () => {
    moodOptions.forEach((item) => item.classList.remove("selected"));
    option.classList.add("selected");
    moodResult.textContent = `已把“${option.dataset.mood}”告诉对方`;
  });
});

noteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const content = noteInput.value.trim();

  if (!content) {
    noteInput.focus();
    return;
  }

  const item = document.createElement("article");
  item.className = "timeline-item";
  item.innerHTML = `
    <div class="timeline-marker marker-green"><i data-lucide="message-circle-heart"></i></div>
    <div class="timeline-content">
      <div class="timeline-meta"><span>刚刚</span><span class="tag tag-green">留言</span></div>
      <h3>${escapeHtml(content)}</h3>
      <p>这句话已经留在我们的日常里。</p>
    </div>
  `;
  timelineList.prepend(item);
  noteInput.value = "";
  refreshIcons();
});

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

const existingSession = window.localStorage.getItem(sessionKey);
if (existingSession && getIdentity(existingSession)) {
  showSpace(existingSession);
} else {
  window.localStorage.removeItem(sessionKey);
}

refreshIcons();
