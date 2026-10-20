# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

Uploaded trustee sale PDFs are stored outside `static/`. In local dev, the app falls back to `storage/trustee-sales` when `TRUSTEE_FILE_STORAGE_DIR` is not set. On shared dev and production servers, set `TRUSTEE_FILE_STORAGE_DIR` to the machine-specific storage folder, for example:

```bash
TRUSTEE_FILE_STORAGE_DIR=C:/data/trustee-sales
```

## Schedule storage and backups

The app now saves schedules in `storage/sales.json`, outside the `build` output.
On first use only, if that default file is absent, the app copies the existing
root `sales.json` into it. The root file then becomes a seed; subsequent edits
are saved only to the persistent file. Preserve `storage/` across deployments.

For a shared server, prefer a separate data directory that deployments never
replace. Copy the **current** schedule there before setting
`TRUSTEE_SALES_DATA_FILE` in the Node/PM2 environment, for example:

```text
TRUSTEE_SALES_DATA_FILE=C:/data/trustee-schedule/sales.json
```

An explicitly configured file must already exist; a missing file produces an
error rather than silently falling back to an old schedule. Give the Node
service account modify permission on the data directories. Keep PDF storage
separate from the schedule directory, and use local NTFS storage (the app uses
atomic renames and hard links).

Each successful schedule save validates all twelve months, checks the version
that the editor originally loaded, saves the previous contents to `sales.json.bak`,
and atomically replaces the live file. Concurrent or outdated saves are rejected
with an explanation; the staff member's edits remain on screen. API clients must
send the GET response's `ETag` as `If-Match` when posting a schedule.

PDF uploads reject existing names, require exactly one file in index mode, and
validate the entire batch before publishing. A collision rolls back files added
by that request. To intentionally replace a notice, first keep a backup, then
explicitly delete the old notice and upload its replacement.

Configure scheduled backups of **both** persistent data directories on the server,
including a retention policy and a tested restore procedure. The single schedule
`.bak` file is a convenience for undoing the latest save, not a full backup policy.
To restore, stop the Node process, preserve a copy of the current data, restore
the selected backup, restart, and verify the public schedule and PDFs.

Write locks prevent overlapping processes from modifying the same schedule or
month. A process crash may leave `sales.json.lock` or a month's `.write.lock`.
If this happens, stop all Node processes using that storage, inspect the data
(a crash during a batch can leave some complete uploaded files), and remove only
the abandoned lock before restarting. Do not remove locks while writers are running.

## IIS authentication

Staff go directly to `/trustee/upload` or `/trustee/admin`, where IIS handles Windows Authentication. The public sales pages remain anonymous. The legacy `/trustee/login` URL redirects to a protected staff page.

On the IIS site or application that owns the `/trustee` rewrite rules:

- Keep the route-specific Windows Authentication and authorization rules in `web.config`.
- Keep the Node server bound to `127.0.0.1` so protected requests must pass through IIS.
- Keep the rewrite target port in `web.config` aligned with the PM2 `PORT` in `ecosystem.config.cjs`.

The app trusts IIS to authenticate protected requests; it does not require an `X-Windows-User` header or the `TRUSTEE_ADMIN_*` password settings. Local development on localhost uses a development identity. Protected writes also require a matching `Origin` header.

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

## Updating an existing PM2 deployment

Install the locked dependencies before deployment. `rebuild.ps1` stages a source
copy beneath `.releases/`, uses the application's installed dependencies, checks
types, and builds there. A failed check/build leaves the active `build` and PM2
process untouched. The source copy includes `src`, `static`, and the package,
Svelte, Vite, and TypeScript configuration files. If you add other build inputs,
update that list. Server `.env` files and mutable data are not copied; any future
build-time variables must be supplied to the build process explicitly.

To verify staging without restarting anything:

```powershell
.\rebuild.ps1 -BuildOnly
```

To deploy to the existing `trustee` PM2 app:

```powershell
.\rebuild.ps1
```

After a successful build, the script briefly stops PM2, retains the old build,
promotes the candidate, restarts PM2, and checks `/trustee/api/sales` over loopback.
If restart or the health check fails, it restores the previous build and verifies
it again. The script throws on failure even when rollback succeeds.
Use `-AppName` and `-HealthCheckUrl` if the PM2 name, base path, or Node port differs.
PM2 must run the app from this directory using `build/index.js`.

The rollback changes application files only. It does not revert schedules or PDFs.
When rolling back to a version from before persistent schedule storage was added,
that older version reads the root `sales.json`; account for that when planning a
manual rollback after staff have edited schedules.

Retained candidates and previous builds are printed by the script and are never
deleted automatically. Periodically archive/remove old `.releases/` directories
after confirming they are no longer needed. If deployment is interrupted, inspect
PM2 and `build` before removing the abandoned `.deploy.lock`.

Run `powershell -NoProfile -File scripts/test-rebuild.ps1` to exercise deployment
failure and rollback scenarios with simulated build/PM2 commands in disposable
directories. It does not operate on the running application.
