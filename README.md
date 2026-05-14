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

## IIS authentication

Protected routes such as `/trustee/upload` rely on IIS Windows Authentication. The app expects IIS URL Rewrite to pass the authenticated Windows account through the `X-Windows-User` request header.

On the IIS site or application that owns the `/trustee` rewrite rules:

- Disable Anonymous Authentication.
- Enable Windows Authentication.
- In URL Rewrite, add `HTTP_X_WINDOWS_USER` to the allowed server variables list.
- Keep the rewrite target port in `web.config` aligned with the PM2 `PORT` in `ecosystem.config.cjs`.

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
