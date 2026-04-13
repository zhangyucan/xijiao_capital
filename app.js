const STORAGE_KEY = "xijiao-capital-ledger-v1";
const SESSION_KEY = "xijiao-capital-session";

const seedAccounts = [
  {
    username: "孙钰杰",
    password: "sun2025",
    displayName: "孙钰杰",
    records: parseSeedRecords(`【SUN YUJIE】2025-4-8
[收到] RMB 40000.00 in 中国银行
(执行) 换汇、跨境转账
[汇率] RMB/HKD = 0.9458
===================
余额 HKD 42292.23 in 汇丰银行

【SUN YUJIE】2025-4-9
[活期] HKD 42292.23 in 汇丰银行
(执行) 存入众安银行活期
(执行) 存入众安银行钱袋
[利率] 年化0.61%，随存随取，月底结息
[优惠] 连续9日每日步数10000以上年化+0.8%
===================
余额 HKD 0.00 in 汇丰银行
余额 HKD 42292.23 in 众安银行

【SUN YUJIE】2025-4-9
(执行) 买入1800股 地平线机器人-W(09660)
[价格] 5.40 HKD/股，共计9720.00 HKD
===================
持仓 1800股 地平线机器人-W(09660)
余额 HKD 280.00 in 盈立证券
余额 HKD 32292.23 in 众安银行

【SUN YUJIE】2025-5-6
(执行) 买入330股 蔚来-SW(09866)
[价格] 29.9 HKD/股，共计9867.00 HKD
===================
持仓 1800股 地平线机器人-W(09660)
持仓 330股 蔚来-SW(09866)
余额 HKD 10,413.00 in 盈立证券
余额 HKD 12292.23 in 众安银行

【SUN YUJIE】2025-5-12
(执行) 换汇
[汇率] USD/HKD = 7.8026
===================
持仓 1800股 地平线机器人-W(09660)
持仓 330股 蔚来-SW(09866)
余额 USD 640.81 in 盈立证券
余额 HKD 5413.00 in 盈立证券
余额 HKD 12292.23 in 众安银行

【SUN YUJIE】2025-5-12
(执行) 买入48股 2倍做多特斯拉ETF(TSLL.US)
[价格] 13.14 USD/股，共计630.72 USD
===================
持仓 1800股 地平线机器人-W(09660)
持仓 330股 蔚来-SW(09866)
持仓 48股 2倍做多特斯拉ETF(TSLL.US)
余额 HKD 5413.00 in 盈立证券
余额 USD 10.09 in 盈立证券
余额 HKD 12292.23 in 众安银行

【SUN YUJIE】2025-8-28
(执行) 买入100股 小鹏汽车(XPEV)
[价格] 22.58/股，共计 2258 USD
[手续费] 2.18USD
===================
持仓 60000股 欢喜传媒(01003)
持仓 1000股 Soluna Holdings(SLNH.US)
持仓 400股 朴荷生物科技(PHH.US)
持仓 100股 TAO Synergies(TAOX.US)
持仓 540股 亿咖通科技(ECX.US)
持仓 100股 小鹏汽车(XPEV)
余额 USD 679.59 in 盈立证券
余额 HKD 351.89 in 盈立证券`)
  },
  {
    username: "陈辉",
    password: "chen2025",
    displayName: "陈辉",
    records: parseSeedRecords(`【CHEN HUI】2025-5-6
[收到] RMB 5000.00 in 招商银行
[执行] 换汇、跨境转账
[汇率] HKD/RMB = 0.9319
===================
余额 HKD 5364.84 in 盈立证券

【CHEN HUI】2025-5-12
(执行) 换汇
[汇率] USD/HKD = 7.8026
===================
余额 USD 640.81 in 盈立证券
余额 HKD 364.84 in 盈立证券

【CHEN HUI】2025-5-12
(执行) 买入48股 2倍做多特斯拉ETF(TSLL.US)
[价格] 13.14 USD/股，共计630.72 USD
===================
持仓 48股 2倍做多特斯拉ETF(TSLL.US)
余额 HKD 364.84 in 盈立证券
余额 USD 10.09 in 盈立证券

【CHEN HUI】2026-3-12
(执行) 买入605股 亿咖通科技(ECX.US)
[价格] 1.2/股，共计 726USD
[手续费] 9.08USD
===================
持仓 605股 亿咖通科技(ECX.US)
持仓 199股 2倍做多特斯拉ETF(TSLL.US)
持仓 1800股 Hyperscale Data(GPUS)
余额 USD 64.31 in 盈立证券`)
  }
];

const authView = document.querySelector("#authView");
const appView = document.querySelector("#appView");
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const recordForm = document.querySelector("#recordForm");
const passwordForm = document.querySelector("#passwordForm");
const authMessage = document.querySelector("#authMessage");
const appMessage = document.querySelector("#appMessage");
const welcomeName = document.querySelector("#welcomeName");
const entryCount = document.querySelector("#entryCount");
const holdingCount = document.querySelector("#holdingCount");
const balanceCount = document.querySelector("#balanceCount");
const holdingsList = document.querySelector("#holdingsList");
const balancesList = document.querySelector("#balancesList");
const recordsList = document.querySelector("#recordsList");
const logoutBtn = document.querySelector("#logoutBtn");
const exportBtn = document.querySelector("#exportBtn");
const changePasswordBtn = document.querySelector("#changePasswordBtn");

let store = { accounts: [] };
let sessionUser = "";

bootstrap();

function bootstrap() {
  bindTabs();
  bindForms();
  initializeStore().then(() => {
    sessionUser = localStorage.getItem(SESSION_KEY) || "";
    render();
  });
}

async function initializeStore() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    store = JSON.parse(saved);
    return;
  }

  const accounts = [];
  for (const account of seedAccounts) {
    accounts.push({
      username: normalizeUsername(account.username),
      displayName: account.displayName,
      passwordHash: await hashText(account.password),
      records: withIds(account.records)
    });
  }
  store = { accounts };
  persistStore();
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
      document.querySelectorAll(".auth-card .form").forEach((form) => form.classList.remove("active"));
      button.classList.add("active");
      const target = button.dataset.tab;
      document.querySelector(`#${target}Form`).classList.add("active");
      authMessage.textContent = "";
    });
  });
}

function bindForms() {
  loginForm.addEventListener("submit", handleLogin);
  registerForm.addEventListener("submit", handleRegister);
  recordForm.addEventListener("submit", handleAddRecord);
  passwordForm.addEventListener("submit", handlePasswordChange);
  logoutBtn.addEventListener("click", logout);
  exportBtn.addEventListener("click", exportRecords);
  changePasswordBtn.addEventListener("click", () => passwordForm.scrollIntoView({ behavior: "smooth", block: "center" }));
}

async function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(loginForm);
  const username = normalizeUsername(form.get("username"));
  const password = String(form.get("password") || "");
  const account = store.accounts.find((item) => item.username === username);

  if (!account) {
    authMessage.textContent = "没有找到这个账户，请检查姓名或先创建账户。";
    return;
  }

  if (account.passwordHash !== await hashText(password)) {
    authMessage.textContent = "密码不正确，请重新输入。";
    return;
  }

  sessionUser = account.username;
  localStorage.setItem(SESSION_KEY, sessionUser);
  loginForm.reset();
  authMessage.textContent = "";
  render();
}

async function handleRegister(event) {
  event.preventDefault();
  const form = new FormData(registerForm);
  const displayName = String(form.get("displayName") || "").trim();
  const username = normalizeUsername(displayName);
  const password = String(form.get("password") || "");
  const notes = String(form.get("notes") || "").trim();

  if (store.accounts.some((item) => item.username === username)) {
    authMessage.textContent = "该账户已存在，请直接登录或更换姓名。";
    return;
  }

  const records = [];
  if (notes) {
    records.push({
      id: crypto.randomUUID(),
      date: today(),
      title: "初始备注",
      detail: "",
      note: notes,
      holdings: [],
      balances: []
    });
  }

  store.accounts.push({
    username,
    displayName,
    passwordHash: await hashText(password),
    records
  });
  persistStore();
  registerForm.reset();
  authMessage.textContent = `账户“${displayName}”已创建，现在可以登录。`;
}

function handleAddRecord(event) {
  event.preventDefault();
  const account = getCurrentAccount();
  if (!account) return;

  const form = new FormData(recordForm);
  account.records.unshift({
    id: crypto.randomUUID(),
    date: normalizeDate(String(form.get("date") || today())),
    title: String(form.get("action") || "").trim(),
    detail: String(form.get("detail") || "").trim(),
    note: String(form.get("note") || "").trim(),
    holdings: parseLineItems(form.get("holdings")) || latestHoldings(account.records),
    balances: parseLineItems(form.get("balances")) || latestBalances(account.records)
  });
  persistStore();
  recordForm.reset();
  appMessage.textContent = "新记录已保存。";
  renderApp(account);
}

async function handlePasswordChange(event) {
  event.preventDefault();
  const account = getCurrentAccount();
  if (!account) return;

  const form = new FormData(passwordForm);
  const currentPassword = String(form.get("currentPassword") || "");
  const newPassword = String(form.get("newPassword") || "");

  if (account.passwordHash !== await hashText(currentPassword)) {
    appMessage.textContent = "当前密码不正确，无法修改。";
    return;
  }

  account.passwordHash = await hashText(newPassword);
  persistStore();
  passwordForm.reset();
  appMessage.textContent = "密码已更新。";
}

function render() {
  const account = getCurrentAccount();
  const loggedIn = Boolean(account);
  authView.classList.toggle("active", !loggedIn);
  appView.classList.toggle("active", loggedIn);

  if (loggedIn) {
    renderApp(account);
  }
}

function renderApp(account) {
  welcomeName.textContent = account.displayName;
  entryCount.textContent = `${account.records.length} 笔`;
  recordForm.elements.date.value = today();

  const holdings = latestHoldings(account.records);
  const balances = latestBalances(account.records);

  holdingCount.textContent = `${holdings.length} 项`;
  balanceCount.textContent = `${balances.length} 项`;

  renderChips(holdingsList, holdings, "暂无持仓");
  renderChips(balancesList, balances, "暂无余额");
  renderRecords(recordsList, account.records);
}

function renderChips(container, items, emptyText) {
  if (!items.length) {
    container.className = "stack empty-state";
    container.textContent = emptyText;
    return;
  }

  container.className = "stack";
  container.innerHTML = items.map((item) => `<div class="chip"><b>${escapeHtml(item)}</b></div>`).join("");
}

function renderRecords(container, records) {
  if (!records.length) {
    container.className = "timeline empty-state";
    container.textContent = "暂无记录";
    return;
  }

  container.className = "timeline";
  container.innerHTML = records
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map(
      (record) => `
        <article class="record">
          <div class="record-head">
            <strong>${escapeHtml(record.title || "未命名记录")}</strong>
            <span>${escapeHtml(record.date)}</span>
          </div>
          ${record.detail ? `<p>${escapeHtml(record.detail)}</p>` : ""}
          ${record.note ? `<p class="record-note">${escapeHtml(record.note)}</p>` : ""}
        </article>
      `
    )
    .join("");
}

function logout() {
  sessionUser = "";
  localStorage.removeItem(SESSION_KEY);
  appMessage.textContent = "";
  render();
}

function exportRecords() {
  const account = getCurrentAccount();
  if (!account) return;

  const text = account.records
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((record) => {
      const lines = [`【${account.displayName}】${record.date}`, record.title];
      if (record.detail) lines.push(record.detail);
      if (record.note) lines.push(record.note);
      if (record.holdings?.length) lines.push(...record.holdings);
      if (record.balances?.length) lines.push(...record.balances);
      return lines.join("\n");
    })
    .join("\n\n");

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${account.displayName}-投资记录.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

function getCurrentAccount() {
  return store.accounts.find((item) => item.username === sessionUser) || null;
}

function latestHoldings(records) {
  return records.find((record) => record.holdings?.length)?.holdings || [];
}

function latestBalances(records) {
  return records.find((record) => record.balances?.length)?.balances || [];
}

function persistStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function parseSeedRecords(raw) {
  return raw
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const header = lines.shift() || "";
      const date = normalizeDate((header.match(/(\d{4}-\d{1,2}-\d{1,2})/) || [today()])[1]);
      const separatorIndex = lines.findIndex((line) => line.includes("===="));
      const content = separatorIndex >= 0 ? lines.slice(0, separatorIndex) : lines;
      const states = separatorIndex >= 0 ? lines.slice(separatorIndex + 1) : [];

      return {
        id: crypto.randomUUID(),
        date,
        title: content[0] || "投资记录",
        detail: content.slice(1, 3).join(" | "),
        note: content.slice(3).join("\n"),
        holdings: states.filter((line) => line.startsWith("持仓")),
        balances: states.filter((line) => line.startsWith("余额"))
      };
    })
    .reverse();
}

function withIds(records) {
  return records.map((record) => ({ ...record, id: record.id || crypto.randomUUID() }));
}

function normalizeUsername(value) {
  return String(value || "").trim();
}

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDate(value) {
  const matched = String(value || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!matched) return today();
  const [, year, month, day] = matched;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseLineItems(value) {
  const items = String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return items.length ? items : null;
}

async function hashText(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
