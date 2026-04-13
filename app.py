from __future__ import annotations

import hashlib
import json
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import streamlit as st


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
ACCOUNTS_FILE = DATA_DIR / "accounts.json"

SEED_SOURCES = {
    "孙钰杰": {
        "password": "sun2025",
        "file": BASE_DIR / "对孙钰杰.txt",
    },
    "陈辉": {
        "password": "chen2025",
        "file": BASE_DIR / "对陈辉.txt",
    },
}


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def normalize_date(value: str) -> str:
    matched = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", value.strip())
    if not matched:
        return date.today().isoformat()
    year, month, day = matched.groups()
    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"


def split_lines(value: str) -> list[str]:
    return [line.strip() for line in value.splitlines() if line.strip()]


def parse_seed_records(raw_text: str) -> list[dict[str, Any]]:
    clean_text = raw_text.replace("\x0b", "\n")
    blocks = [block.strip() for block in re.split(r"\n\s*\n", clean_text) if block.strip()]
    records: list[dict[str, Any]] = []

    for block in blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines:
            continue

        header = lines.pop(0)
        matched = re.search(r"(\d{4}-\d{1,2}-\d{1,2})", header)
        record_date = normalize_date(matched.group(1) if matched else date.today().isoformat())
        separator_index = next((idx for idx, line in enumerate(lines) if "===" in line), -1)
        content = lines[:separator_index] if separator_index >= 0 else lines
        state_lines = lines[separator_index + 1 :] if separator_index >= 0 else []

        title = content[0] if content else "投资记录"
        detail = "\n".join(content[1:])

        records.append(
            {
                "id": str(uuid4()),
                "date": record_date,
                "title": title,
                "detail": detail,
                "holdings": [line for line in state_lines if line.startswith("持仓")],
                "balances": [line for line in state_lines if line.startswith("余额")],
                "created_at": datetime.now().isoformat(timespec="seconds"),
            }
        )

    return records


def seed_accounts() -> dict[str, Any]:
    accounts: list[dict[str, Any]] = []
    for display_name, config in SEED_SOURCES.items():
        raw_text = config["file"].read_text(encoding="utf-8")
        accounts.append(
            {
                "username": display_name,
                "display_name": display_name,
                "password_hash": hash_password(config["password"]),
                "records": parse_seed_records(raw_text),
            }
        )
    return {"accounts": accounts}


def load_store() -> dict[str, Any]:
    DATA_DIR.mkdir(exist_ok=True)
    if not ACCOUNTS_FILE.exists():
        store = seed_accounts()
        save_store(store)
        return store
    return json.loads(ACCOUNTS_FILE.read_text(encoding="utf-8"))


def save_store(store: dict[str, Any]) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    ACCOUNTS_FILE.write_text(
        json.dumps(store, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def get_account(store: dict[str, Any], username: str) -> dict[str, Any] | None:
    for account in store["accounts"]:
        if account["username"] == username:
            return account
    return None


def sort_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        records,
        key=lambda item: (item.get("date", ""), item.get("created_at", "")),
        reverse=True,
    )


def latest_state(records: list[dict[str, Any]], field: str) -> list[str]:
    for record in sort_records(records):
        items = record.get(field) or []
        if items:
            return items
    return []


def build_export_text(account: dict[str, Any]) -> str:
    chunks: list[str] = []
    for record in sorted(account["records"], key=lambda item: (item.get("date", ""), item.get("created_at", ""))):
        lines = [f"【{account['display_name']}】{record['date']}", record["title"]]
        if record.get("detail"):
            lines.extend(split_lines(record["detail"]))
        if record.get("holdings") or record.get("balances"):
            lines.append("===================")
            lines.extend(record.get("holdings", []))
            lines.extend(record.get("balances", []))
        chunks.append("\n".join(lines))
    return "\n\n".join(chunks)


def register_account(store: dict[str, Any], username: str, password: str, notes: str) -> tuple[bool, str]:
    username = username.strip()
    if not username:
        return False, "姓名不能为空。"
    if len(password) < 6:
        return False, "密码至少需要 6 位。"
    if get_account(store, username):
        return False, "该账户已存在，请直接登录。"

    records: list[dict[str, Any]] = []
    if notes.strip():
        records.append(
            {
                "id": str(uuid4()),
                "date": date.today().isoformat(),
                "title": "初始备注",
                "detail": notes.strip(),
                "holdings": [],
                "balances": [],
                "created_at": datetime.now().isoformat(timespec="seconds"),
            }
        )

    store["accounts"].append(
        {
            "username": username,
            "display_name": username,
            "password_hash": hash_password(password),
            "records": records,
        }
    )
    save_store(store)
    return True, f"账户“{username}”已创建。"


def add_record(
    store: dict[str, Any],
    username: str,
    record_date: str,
    title: str,
    detail: str,
    note: str,
    holdings_text: str,
    balances_text: str,
) -> tuple[bool, str]:
    account = get_account(store, username)
    if not account:
        return False, "当前账户不存在。"
    if not title.strip():
        return False, "操作说明不能为空。"

    holdings = split_lines(holdings_text) or latest_state(account["records"], "holdings")
    balances = split_lines(balances_text) or latest_state(account["records"], "balances")

    detail_parts = [part.strip() for part in [detail, note] if part.strip()]
    account["records"].append(
        {
            "id": str(uuid4()),
            "date": normalize_date(record_date),
            "title": title.strip(),
            "detail": "\n".join(detail_parts),
            "holdings": holdings,
            "balances": balances,
            "created_at": datetime.now().isoformat(timespec="seconds"),
        }
    )
    save_store(store)
    return True, "新记录已保存。"


def change_password(store: dict[str, Any], username: str, current_password: str, new_password: str) -> tuple[bool, str]:
    account = get_account(store, username)
    if not account:
        return False, "当前账户不存在。"
    if account["password_hash"] != hash_password(current_password):
        return False, "当前密码不正确。"
    if len(new_password) < 6:
        return False, "新密码至少需要 6 位。"

    account["password_hash"] = hash_password(new_password)
    save_store(store)
    return True, "密码已更新。"


def login(store: dict[str, Any], username: str, password: str) -> tuple[bool, str]:
    account = get_account(store, username.strip())
    if not account:
        return False, "没有找到这个账户。"
    if account["password_hash"] != hash_password(password):
        return False, "密码不正确。"
    st.session_state["current_user"] = account["username"]
    return True, "登录成功。"


def render_auth(store: dict[str, Any]) -> None:
    st.title("西郊资本记账台")
    st.caption("每位投资人一个账户，登录后仅能查看自己的投资记录。")

    left, right = st.columns([1.2, 1])

    with left:
        with st.form("login_form", clear_on_submit=False):
            st.subheader("账户登录")
            username = st.text_input("账户名", placeholder="例如：孙钰杰")
            password = st.text_input("密码", type="password")
            submitted = st.form_submit_button("登录并查看记录", use_container_width=True)
            if submitted:
                ok, message = login(store, username, password)
                if ok:
                    st.success(message)
                    st.rerun()
                st.error(message)

    with right:
        st.info("预置测试账户\n\n孙钰杰：sun2025\n\n陈辉：chen2025")
        with st.form("register_form", clear_on_submit=True):
            st.subheader("新建账户")
            new_name = st.text_input("投资人姓名")
            new_password = st.text_input("登录密码", type="password")
            notes = st.text_area("初始记录（可选）", placeholder="可填写首笔投资说明、来源或备注")
            submitted = st.form_submit_button("创建账户", use_container_width=True)
            if submitted:
                ok, message = register_account(store, new_name, new_password, notes)
                if ok:
                    st.success(message)
                else:
                    st.error(message)


def render_dashboard(store: dict[str, Any], account: dict[str, Any]) -> None:
    records = sort_records(account["records"])
    holdings = latest_state(records, "holdings")
    balances = latest_state(records, "balances")

    st.title(f"{account['display_name']} 的投资记录")
    st.caption("当前登录后只展示此账户自己的流水、持仓和余额。")

    with st.sidebar:
        st.subheader("账户")
        st.write(account["display_name"])
        if st.button("退出登录", use_container_width=True):
            st.session_state["current_user"] = None
            st.rerun()

        st.download_button(
            "导出当前账户文本",
            data=build_export_text(account),
            file_name=f"{account['display_name']}-投资记录.txt",
            mime="text/plain",
            use_container_width=True,
        )

    c1, c2, c3 = st.columns(3)
    c1.metric("记录笔数", len(records))
    c2.metric("当前持仓", len(holdings))
    c3.metric("现金余额", len(balances))

    left, right = st.columns([1.05, 0.95])

    with left:
        st.subheader("新增记录")
        with st.form("record_form", clear_on_submit=True):
            record_date = st.date_input("日期", value=date.today())
            title = st.text_input("操作说明", placeholder="例如：买入 100 股 小鹏汽车")
            detail = st.text_input("价格/金额", placeholder="例如：22.58 USD/股，共计 2258 USD")
            note = st.text_area("备注", placeholder="补充手续费、汇率、说明")
            holdings_text = st.text_area(
                "更新后的持仓",
                placeholder="每行一条，例如：持仓 100股 小鹏汽车(XPEV)",
            )
            balances_text = st.text_area(
                "更新后的余额",
                placeholder="每行一条，例如：余额 USD 679.59 in 盈立证券",
            )
            submitted = st.form_submit_button("保存记录", use_container_width=True)
            if submitted:
                ok, message = add_record(
                    store,
                    account["username"],
                    record_date.isoformat(),
                    title,
                    detail,
                    note,
                    holdings_text,
                    balances_text,
                )
                if ok:
                    st.success(message)
                    st.rerun()
                st.error(message)

        st.subheader("修改密码")
        with st.form("password_form", clear_on_submit=True):
            current_password = st.text_input("当前密码", type="password")
            new_password = st.text_input("新密码", type="password")
            submitted = st.form_submit_button("更新密码", use_container_width=True)
            if submitted:
                ok, message = change_password(store, account["username"], current_password, new_password)
                if ok:
                    st.success(message)
                else:
                    st.error(message)

    with right:
        st.subheader("当前持仓")
        if holdings:
            for item in holdings:
                st.markdown(f"- {item}")
        else:
            st.caption("暂无持仓")

        st.subheader("现金余额")
        if balances:
            for item in balances:
                st.markdown(f"- {item}")
        else:
            st.caption("暂无余额")

    st.subheader("投资流水")
    if not records:
        st.caption("暂无记录")
    for record in records:
        with st.expander(f"{record['date']} | {record['title']}", expanded=False):
            if record.get("detail"):
                st.text(record["detail"])
            if record.get("holdings"):
                st.markdown("**持仓**")
                for item in record["holdings"]:
                    st.markdown(f"- {item}")
            if record.get("balances"):
                st.markdown("**余额**")
                for item in record["balances"]:
                    st.markdown(f"- {item}")


def main() -> None:
    st.set_page_config(page_title="西郊资本记账台", layout="wide")
    if "current_user" not in st.session_state:
        st.session_state["current_user"] = None

    store = load_store()
    current_user = st.session_state.get("current_user")
    account = get_account(store, current_user) if current_user else None

    if account:
        render_dashboard(store, account)
    else:
        render_auth(store)


if __name__ == "__main__":
    main()
