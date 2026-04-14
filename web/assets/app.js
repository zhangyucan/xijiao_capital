const { supabaseUrl, supabaseAnonKey } = window.APP_CONFIG || {};

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("your-project-ref")) {
  document.body.innerHTML = `
    <div style="max-width:760px;margin:80px auto;padding:24px;border:1px solid #e5dccd;border-radius:20px;background:#fffaf2;font-family:system-ui,sans-serif;">
      <h1 style="margin-top:0;">需要先配置 Supabase</h1>
      <p>请先编辑 <code>web/assets/config.js</code>，填入你的 Supabase URL 与 anon key，再重新打开页面。</p>
    </div>
  `;
  throw new Error("Missing Supabase config");
}

const client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

const state = {
  session: null,
  profile: null,
  records: [],
  managedProfiles: [],
  activeOwnerId: null,
};

const el = {
  authView: document.querySelector("#auth-view"),
  appView: document.querySelector("#app-view"),
  loginForm: document.querySelector("#login-form"),
  email: document.querySelector("#email"),
  password: document.querySelector("#password"),
  logoutButton: document.querySelector("#logout-button"),
  sessionPanel: document.querySelector("#session-panel"),
  sessionName: document.querySelector("#session-name"),
  sessionRole: document.querySelector("#session-role"),
  heroTitle: document.querySelector("#hero-title"),
  heroSubtitle: document.querySelector("#hero-subtitle"),
  metricRecords: document.querySelector("#metric-records"),
  metricHoldings: document.querySelector("#metric-holdings"),
  metricBalances: document.querySelector("#metric-balances"),
  adminToolbar: document.querySelector("#admin-toolbar"),
  accountSwitcher: document.querySelector("#account-switcher"),
  recordForm: document.querySelector("#record-form"),
  recordFormTitle: document.querySelector("#record-form-title"),
  recordDate: document.querySelector("#record-date"),
  recordTitle: document.querySelector("#record-title"),
  recordDetail: document.querySelector("#record-detail"),
  recordNote: document.querySelector("#record-note"),
  recordHoldings: document.querySelector("#record-holdings"),
  recordBalances: document.querySelector("#record-balances"),
  currentHoldings: document.querySelector("#current-holdings"),
  currentBalances: document.querySelector("#current-balances"),
  recordsList: document.querySelector("#records-list"),
  toast: document.querySelector("#toast"),
};

function showToast(message, tone = "info") {
  el.toast.textContent = message;
  el.toast.className = `toast ${tone}`;
  window.setTimeout(() => {
    el.toast.className = "toast hidden";
  }, 2800);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function joinDetail(detail, note) {
  return [detail, note].map((item) => item.trim()).filter(Boolean).join("\n");
}

function splitLines(value) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function latestState(records, field) {
  for (const record of records) {
    const items = record[field] || [];
    if (items.length > 0) {
      return items;
    }
  }
  return [];
}

function sortRecords(records) {
  return [...records].sort((a, b) => {
    const left = `${a.record_date || ""}-${a.created_at || ""}`;
    const right = `${b.record_date || ""}-${b.created_at || ""}`;
    return right.localeCompare(left);
  });
}

function renderList(target, items, emptyText) {
  if (!items.length) {
    target.innerHTML = `<li class="muted">${escapeHtml(emptyText)}</li>`;
    return;
  }
  target.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function getActiveProfile() {
  if (state.profile?.role !== "admin") {
    return state.profile;
  }
  return state.managedProfiles.find((profile) => profile.user_id === state.activeOwnerId) || null;
}

function updateHero() {
  const activeProfile = getActiveProfile();
  if (!activeProfile) {
    el.heroTitle.textContent = "没有可管理的账户";
    el.heroSubtitle.textContent = "请先在 Supabase Auth 中创建用户，并在 profiles 表补齐资料。";
    return;
  }

  if (state.profile?.role === "admin") {
    el.heroTitle.textContent = `${activeProfile.display_name} 的投资记录`;
    el.heroSubtitle.textContent = "你正以超级管理员身份查看和修改该账户的流水。";
    el.recordFormTitle.textContent = `为 ${activeProfile.display_name} 新增记录`;
  } else {
    el.heroTitle.textContent = `${activeProfile.display_name} 的投资记录`;
    el.heroSubtitle.textContent = "这里只展示你自己的投资流水、持仓和余额。";
    el.recordFormTitle.textContent = "新增记录";
  }
}

function renderMetrics(records) {
  const holdings = latestState(records, "holdings");
  const balances = latestState(records, "balances");
  el.metricRecords.textContent = String(records.length);
  el.metricHoldings.textContent = String(holdings.length);
  el.metricBalances.textContent = String(balances.length);
  renderList(el.currentHoldings, holdings, "暂无持仓");
  renderList(el.currentBalances, balances, "暂无余额");
}

function buildRecordItem(record, editable) {
  const holdings = (record.holdings || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const balances = (record.balances || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const detail = escapeHtml(record.detail || "").replaceAll("\n", "<br>");

  return `
    <article class="record-item">
      <div class="record-head">
        <div>
          <div class="record-date">${escapeHtml(record.record_date)}</div>
          <h4>${escapeHtml(record.title)}</h4>
        </div>
        ${editable ? `<button class="ghost-button small edit-button" data-record-id="${record.id}">编辑</button>` : ""}
      </div>
      <div class="record-detail">${detail || '<span class="muted">暂无详情</span>'}</div>
      <div class="record-columns">
        <div>
          <div class="section-label">持仓</div>
          <ul class="plain-list">${holdings || '<li class="muted">暂无持仓</li>'}</ul>
        </div>
        <div>
          <div class="section-label">余额</div>
          <ul class="plain-list">${balances || '<li class="muted">暂无余额</li>'}</ul>
        </div>
      </div>
      <div class="record-meta">创建 ${escapeHtml(record.created_at || "-")} · 更新 ${escapeHtml(record.updated_at || "-")}</div>
      ${
        editable
          ? `
        <form class="edit-form hidden" data-edit-form="${record.id}">
          <label><span>日期</span><input type="date" name="record_date" value="${escapeHtml(record.record_date)}" required /></label>
          <label><span>操作说明</span><input type="text" name="title" value="${escapeHtml(record.title)}" required /></label>
          <label><span>详情</span><textarea name="detail" rows="4">${escapeHtml(record.detail || "")}</textarea></label>
          <label><span>持仓</span><textarea name="holdings" rows="5">${escapeHtml((record.holdings || []).join("\n"))}</textarea></label>
          <label><span>余额</span><textarea name="balances" rows="5">${escapeHtml((record.balances || []).join("\n"))}</textarea></label>
          <div class="edit-actions">
            <button type="submit">保存修改</button>
            <button type="button" class="ghost-button small cancel-edit" data-record-id="${record.id}">取消</button>
          </div>
        </form>
      `
          : ""
      }
    </article>
  `;
}

function renderRecords() {
  const editable = state.profile?.role === "admin";
  if (!state.records.length) {
    el.recordsList.innerHTML = `<div class="muted">暂无记录</div>`;
    return;
  }
  el.recordsList.innerHTML = state.records.map((record) => buildRecordItem(record, editable)).join("");
}

function syncSessionChrome() {
  if (!state.session || !state.profile) {
    el.authView.classList.remove("hidden");
    el.appView.classList.add("hidden");
    el.sessionPanel.classList.add("hidden");
    return;
  }

  el.authView.classList.add("hidden");
  el.appView.classList.remove("hidden");
  el.sessionPanel.classList.remove("hidden");
  el.sessionName.textContent = state.profile.display_name;
  el.sessionRole.textContent = state.profile.role === "admin" ? "超级管理员" : "投资人";
}

async function fetchProfile(userId) {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw error;
  }
  return data;
}

async function fetchManagedProfiles() {
  if (state.profile?.role !== "admin") {
    state.managedProfiles = state.profile ? [state.profile] : [];
    state.activeOwnerId = state.profile?.user_id || null;
    el.adminToolbar.classList.add("hidden");
    return;
  }

  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (error) {
    throw error;
  }

  state.managedProfiles = (data || []).filter((item) => item.role !== "admin");
  state.activeOwnerId = state.managedProfiles[0]?.user_id || null;
  el.adminToolbar.classList.remove("hidden");
  el.accountSwitcher.innerHTML = state.managedProfiles
    .map(
      (profile) =>
        `<option value="${escapeHtml(profile.user_id)}">${escapeHtml(profile.display_name)} (${escapeHtml(
          profile.username
        )})</option>`
    )
    .join("");
  if (state.activeOwnerId) {
    el.accountSwitcher.value = state.activeOwnerId;
  }
}

async function fetchRecords() {
  const activeProfile = getActiveProfile();
  if (!activeProfile) {
    state.records = [];
    renderMetrics([]);
    renderRecords();
    return;
  }

  const { data, error } = await client
    .from("records")
    .select("*")
    .eq("owner_id", activeProfile.user_id)
    .order("record_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  state.records = sortRecords(data || []);
  renderMetrics(state.records);
  renderRecords();
}

async function refreshApp() {
  syncSessionChrome();
  updateHero();
  await fetchRecords();
}

async function bootstrapSession() {
  const { data, error } = await client.auth.getSession();
  if (error) {
    showToast(error.message, "error");
    return;
  }

  state.session = data.session;
  if (!state.session) {
    syncSessionChrome();
    return;
  }

  try {
    state.profile = await fetchProfile(state.session.user.id);
    await fetchManagedProfiles();
    await refreshApp();
  } catch (error) {
    showToast(error.message || "加载账户信息失败", "error");
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = el.email.value.trim();
  const password = el.password.value;
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    showToast(error.message, "error");
    return;
  }
  el.loginForm.reset();
  showToast("登录成功", "success");
}

async function handleLogout() {
  const { error } = await client.auth.signOut();
  if (error) {
    showToast(error.message, "error");
    return;
  }
  state.session = null;
  state.profile = null;
  state.records = [];
  state.managedProfiles = [];
  state.activeOwnerId = null;
  syncSessionChrome();
  showToast("已退出登录", "success");
}

async function handleCreateRecord(event) {
  event.preventDefault();
  const activeProfile = getActiveProfile();
  if (!activeProfile || !state.profile) {
    showToast("当前没有可写入的目标账户", "error");
    return;
  }

  const payload = {
    owner_id: activeProfile.user_id,
    record_date: el.recordDate.value,
    title: el.recordTitle.value.trim(),
    detail: joinDetail(el.recordDetail.value, el.recordNote.value),
    holdings: splitLines(el.recordHoldings.value),
    balances: splitLines(el.recordBalances.value),
    created_by: state.profile.user_id,
    updated_by: state.profile.user_id,
  };

  if (!payload.title) {
    showToast("操作说明不能为空", "error");
    return;
  }

  const { error } = await client.from("records").insert(payload);
  if (error) {
    showToast(error.message, "error");
    return;
  }

  el.recordForm.reset();
  el.recordDate.valueAsDate = new Date();
  showToast("记录已保存", "success");
  await fetchRecords();
}

async function handleRecordListClick(event) {
  const editButton = event.target.closest(".edit-button");
  if (editButton) {
    const recordId = editButton.dataset.recordId;
    document.querySelector(`[data-edit-form="${recordId}"]`)?.classList.remove("hidden");
    editButton.classList.add("hidden");
    return;
  }

  const cancelButton = event.target.closest(".cancel-edit");
  if (cancelButton) {
    const recordId = cancelButton.dataset.recordId;
    document.querySelector(`[data-edit-form="${recordId}"]`)?.classList.add("hidden");
    document.querySelector(`.edit-button[data-record-id="${recordId}"]`)?.classList.remove("hidden");
  }
}

async function handleRecordListSubmit(event) {
  const form = event.target.closest("[data-edit-form]");
  if (!form) {
    return;
  }

  event.preventDefault();
  const recordId = form.dataset.editForm;
  const formData = new FormData(form);
  const payload = {
    record_date: formData.get("record_date"),
    title: String(formData.get("title") || "").trim(),
    detail: String(formData.get("detail") || "").trim(),
    holdings: splitLines(String(formData.get("holdings") || "")),
    balances: splitLines(String(formData.get("balances") || "")),
    updated_by: state.profile?.user_id || null,
  };

  if (!payload.title) {
    showToast("操作说明不能为空", "error");
    return;
  }

  const { error } = await client.from("records").update(payload).eq("id", recordId);
  if (error) {
    showToast(error.message, "error");
    return;
  }

  showToast("记录已更新", "success");
  await fetchRecords();
}

function bindEvents() {
  el.loginForm.addEventListener("submit", handleLogin);
  el.logoutButton.addEventListener("click", handleLogout);
  el.recordForm.addEventListener("submit", handleCreateRecord);
  el.recordsList.addEventListener("click", handleRecordListClick);
  el.recordsList.addEventListener("submit", handleRecordListSubmit);
  el.accountSwitcher.addEventListener("change", async (event) => {
    state.activeOwnerId = event.target.value;
    updateHero();
    await fetchRecords();
  });

  client.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    if (!session) {
      state.profile = null;
      state.records = [];
      state.managedProfiles = [];
      state.activeOwnerId = null;
      syncSessionChrome();
      return;
    }

    try {
      state.profile = await fetchProfile(session.user.id);
      await fetchManagedProfiles();
      updateHero();
      await fetchRecords();
      syncSessionChrome();
    } catch (error) {
      showToast(error.message || "会话更新失败", "error");
    }
  });
}

function setDefaultDate() {
  el.recordDate.valueAsDate = new Date();
}

bindEvents();
setDefaultDate();
bootstrapSession();
