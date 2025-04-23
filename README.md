# Vercel Node Auth – Secure Session + 2FA (完整版)

该项目基于 **Express + Server‑Side Session + TOTP 双因素认证**，可直接部署到 Vercel，兼容 Neon Postgres 免费层。

## 快速开始
```bash
pnpm i
cp .env.example .env            # 按需填写变量
pnpm dev                        # 本地启动 http://localhost:3000
```

## 主要端点

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /register | 注册 & 发送邮箱验证 |
| GET  | /verify   | 点击邮件里的链接完成验证 |
| POST | /login    | 登录；若启用了 TOTP 需附 `token` |
| POST | /2fa/setup | 登录后生成二维码 |
| POST | /2fa/verify | 提交 6 位验证码 |
| GET  | /auth/github | GitHub OAuth |
| GET  | /me | 当前用户信息 |

## 部署
推仓库到 GitHub → Vercel “Import Project” → 填 `.env` → Deploy。

更多说明请查看源码中文注释。欢迎提 issue！
