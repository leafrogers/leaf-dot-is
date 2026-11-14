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

# Exercise application SQL against the real migrated schema in the same empty database.
for migration in supabase/migrations/*.sql; do
  docker exec -i "$container" psql -X -U postgres -d "$database" \
    -v ON_ERROR_STOP=1 < "$migration"
done
LEAF_TEST_DATABASE="$database" TZ=UTC BASE_URL='' PERMALINK_BASE_URL='' \
  PRISMIC_ACCESS_TOKEN='' PRISMIC_REPO_NAME='test' PRISMIC_TYPES_TOKEN='' \
  PG_CONNECTION_STRING='' node --experimental-vm-modules --no-warnings \
  node_modules/jest/bin/jest.js --runInBand \
  --testMatch='**/test/database-queries.integration.js'
