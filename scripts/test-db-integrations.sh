#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Only Leaf's local container is used. Every run owns a separate empty database.
container=supabase_db_leaf-dot-is
database="leaf_integration_test_$$"
test_dir=''

docker exec "$container" createdb -U postgres "$database"
cleanup() {
  local status=$?
  trap - EXIT
  docker exec "$container" dropdb -U postgres "$database" || status=1
  if [[ -n "$test_dir" ]]; then
    docker exec "$container" rm -rf -- "$test_dir" || status=1
  fi
  exit "$status"
}
trap cleanup EXIT

test_dir=$(docker exec "$container" mktemp -d /tmp/leaf-integration-tests.XXXXXXXX)
docker cp supabase/integrations/. "$container:$test_dir/"
docker exec "$container" psql -X -U postgres -d "$database" \
  -v ON_ERROR_STOP=1 -f "$test_dir/test.sql"
