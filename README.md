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

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
