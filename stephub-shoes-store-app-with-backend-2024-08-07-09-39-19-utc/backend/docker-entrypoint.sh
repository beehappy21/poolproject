#!/bin/sh
set -eu

cd /var/www/html/backend

mkdir -p database storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache public
touch database/database.sqlite

php artisan storage:link >/dev/null 2>&1 || true

cd public

exec php \
  -d upload_max_filesize="${BAO_UPLOAD_MAX_FILESIZE:-32M}" \
  -d post_max_size="${BAO_POST_MAX_SIZE:-64M}" \
  -d max_file_uploads="${BAO_MAX_FILE_UPLOADS:-20}" \
  -S "${BAO_HOST:-0.0.0.0}:${BAO_PORT:-8001}" \
  /var/www/html/backend/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
