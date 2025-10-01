#!/bin/zsh
# 或者用 bash

DB_NAME="sitemap-monitor"

for file in $(ls -1 drizzle/*.sql | sort); do
  echo "正在执行迁移: $file"
  wrangler d1 execute "$DB_NAME" --remote --file "$file"
done
