# Check the Apple Shortcut requests

Run this check on a Mac with the synced Shortcuts collection.
Use synthetic input throughout this procedure.
The local inspector returns `201` and plain text `Created` without writing to a database.

1. From the website repository, start the inspector:

   ```sh
   node scripts/capture-shortcut-request.mjs
   ```

2. Duplicate **Send Event** and name the copy **Send Event — local check**.
3. In the copy, change the request URL to `http://127.0.0.1:8765/event`.
4. Remove its Authorization header. Do not add a production key.
5. Keep its File body, input variable, and response comparison unchanged.
6. Duplicate **Log Coffee**, **Add An Overheard**, and **Create Event** for this check.
7. Change each copied wrapper to call **Send Event — local check**.
8. Run the copies with synthetic titles and a fixed test date. Keep the existing date-format action unchanged.
9. Read the inspector output in the terminal. Check these fields:

   | Field | Expected result |
   | --- | --- |
   | `contentType` | Exactly `application/json` |
   | `validJson` | `true` |
   | `typeIdType` | `number` |
   | `body` | The expected dictionary serialized as JSON |
   | `timestamp` | Absent for wrappers without a date; the formatted test date for Create Event |

   `bodyBase64` preserves the exact request bytes for further local comparison.
   The inspector omits authentication headers from its output.

10. Check that the response comparison accepts `Created` without showing an error dialog.
11. Stop the inspector with `Ctrl+C`.

Share the synthetic output for each wrapper so we can check timestamp parsing and payload compatibility.
Do not change the production Shortcuts during this check.
If the content type differs, keep the result for review before changing any header.
The deployed handler also requires exactly `application/json`.

## Prepare the production change

The owner completed the local check for all three wrappers on 2026-10-31.
All requests matched the prepared parser, and Send Event accepted `Created` in every case.
See the [captured results](supabase-key-rollout.md#local-shortcut-results).

Keep both production Shortcuts unchanged, including `Authorization: Bearer <API_TOKEN>`.
The function update changes its server-side database credential.
Do not copy a Supabase secret key into a Shortcut.

After deployment:

1. Run the existing **Fetch event types** Shortcut through its complete downstream flow through Bunny.
2. After agreement on a test entry, make one production write through a specialized Shortcut.
3. Check `Created`, the resulting Me Event, and the website display.
4. Check the existing core Shortcuts on the iPhone. The owner excluded laptop checks from the rollout scope.

The legacy rollback window is closed. The recovered source requires a revoked database key and cannot serve as a rollback.
See the [rollout checklist](supabase-key-rollout.md) for deployment prerequisites and rollback limits.

## Production results: 2026-11-01

The owner reported successful event-type retrieval and a successful check-in event after deployment.
Both used the existing Shortcuts without header changes.
The owner confirmed successful iPhone operation and the check-in event's website display.
The owner excluded laptop checks from the rollout scope.
The owner also confirmed scheduled Last.fm collection and the resulting song's display on `/consuming`.

After the legacy-key retirement instructions, the owner confirmed another successful run of all three checks.
These checks covered the iPhone Shortcuts, check-in display, and another scheduled Last.fm import.
The owner confirmed that the legacy API keys are revoked and the API-key migration is complete.
