#!/usr/bin/env bash
set -euo pipefail

DEFAULT_DB_NAME="sitemap-monitor"
DEFAULT_LOCAL_DB="drizzle/local.sqlite"
WRANGLER_FLAGS="--remote"
DRY_RUN=0
DB_NAME="${D1_DATABASE:-$DEFAULT_DB_NAME}"
LOCAL_DB="$DEFAULT_LOCAL_DB"

usage() {
  cat <<'USAGE'
将本地 SQLite 数据推送到 Cloudflare D1。

用法：
  scripts/push-local-to-d1.sh [选项]

选项：
  -d, --database <name>    Cloudflare D1 数据库名称（默认 sitemap-monitor）
  -f, --file <path>        本地 SQLite 文件路径（默认 drizzle/local.sqlite）
  --remote                 通过 Cloudflare 远端执行（默认）
  --local                  针对本地 D1 Dev 实例执行
  --dry-run                仅生成 SQL，不执行导入
  -h, --help               查看帮助

也可通过环境变量 D1_DATABASE 覆盖默认数据库名。
USAGE
}

while [[ $# -gt 0 ]]; do
  case $1 in
    -d|--database)
      DB_NAME=$2
      shift 2
      ;;
    -f|--file|--local-db)
      LOCAL_DB=$2
      shift 2
      ;;
    --remote)
      WRANGLER_FLAGS="--remote"
      shift
      ;;
    --local)
      WRANGLER_FLAGS="--local"
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "未知参数: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -f "$LOCAL_DB" ]]; then
  echo "找不到本地数据库文件: $LOCAL_DB" >&2
  exit 1
fi

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "未检测到 sqlite3，请先安装" >&2
  exit 1
fi

if ! command -v wrangler >/dev/null 2>&1; then
  echo "未检测到 wrangler CLI，请先安装并执行 wrangler login" >&2
  exit 1
fi

SQL_FILE=$(mktemp)
cleanup() { rm -f "$SQL_FILE"; }
trap cleanup EXIT

echo "正在从 $LOCAL_DB 导出数据..."
TABLES=$(sqlite3 "$LOCAL_DB" "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")

{
  echo "PRAGMA foreign_keys = OFF;"
  echo "PRAGMA defer_foreign_keys = ON;"
  echo "BEGIN TRANSACTION;"
  while IFS= read -r table; do
    [[ -z "$table" ]] && continue
    printf 'DELETE FROM "%s";\n' "$table"
  done <<< "$TABLES"
  sqlite3 "$LOCAL_DB" ".dump" | awk '/^INSERT INTO/ { print }'
  echo "COMMIT;"
  echo "PRAGMA foreign_keys = ON;"
} > "$SQL_FILE"

if [[ $DRY_RUN -eq 1 ]]; then
  echo "已生成导入 SQL（未执行）：$SQL_FILE"
  cat "$SQL_FILE"
  exit 0
fi

echo "即将把本地数据推送到 Cloudflare D1 数据库: $DB_NAME"
wrangler d1 execute "$DB_NAME" $WRANGLER_FLAGS --file "$SQL_FILE"

echo "迁移完成。"
