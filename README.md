# 西郊资本记账台

这是一个 Streamlit 版本的投资记账应用。

## 功能

- 为每位投资人创建独立账户和密码
- 登录后只能查看自己的投资记录
- 展示当前持仓、现金余额和投资流水
- 支持新增记录、修改密码、导出文本
- 首次启动时会从 `对孙钰杰.txt` 和 `对陈辉.txt` 初始化预置账户

## 运行

```bash
pip install -r requirements.txt
streamlit run app.py
```

## 预置账户

- 孙钰杰：`sun2025`
- 陈辉：`chen2025`

## 数据存储

应用运行后会在 `data/accounts.json` 中保存账户、密码哈希和新增流水。
