# feishu-fetcher

批量导出飞书应用通讯录权限范围内的用户 ID（open_id、user_id、union_id）。

## 安装

```bash
npm install
npm run build
npm link  # 全局可用 feishu-fetcher 命令
```

## 使用

### 1. 配置飞书应用

```bash
feishu-fetcher config add
```

交互式输入 App ID 和 App Secret，工具会自动验证凭证并获取应用名称。支持配置多个应用。

```bash
feishu-fetcher config list     # 查看已配置的应用
feishu-fetcher config remove <name>  # 删除配置
```

### 2. 查看部门树

```bash
feishu-fetcher dept            # 树形展示
feishu-fetcher dept --flat     # 平铺格式（id\t路径），适合脚本处理
```

### 3. 导出用户

```bash
feishu-fetcher fetch                          # 交互式选择部门，输出 CSV 到 stdout
feishu-fetcher fetch --format json            # 输出 JSON
feishu-fetcher fetch --output users.csv       # 写入文件
feishu-fetcher fetch --department <dept_id>   # 指定部门（跳过交互选择）
feishu-fetcher fetch --app <name>             # 使用指定应用配置
```

交互模式下会展示部门树供多选；非 TTY 环境自动使用根部门。

## 输出格式

**CSV（默认）：**
```
name,open_id,user_id,union_id
张三,ou_xxx,on_xxx,on_xxx
```

**JSON：**
```json
[
  { "name": "张三", "open_id": "ou_xxx", "user_id": "on_xxx", "union_id": "on_xxx" }
]
```

## 飞书应用配置要求

需要在[飞书开放平台](https://open.feishu.cn)创建企业自建应用，并开通以下权限：

- `contact:contact:readonly_as_app` — 以应用身份读取通讯录
- 在「通讯录权限范围」中设置可访问的部门范围

## 开发

```bash
npm run dev -- <command>   # 开发模式运行（tsx 直接执行 TypeScript）
npm run build              # 构建生产产物
```

配置文件存储在 `~/.feishu-fetcher/config.json`。
