# Development

How to work on Aquila itself. Running and using Aquila is covered by the [documentation](https://vela-tools.github.io/aquila/).

## Requirements

- Node `^22.22.2 || ^24.15.0 || >=26`. `.node-version` sets the version for development and CI; the image build pins its own in the `Dockerfile`.
- npm 11.20 or newer, as `packageManager` in `package.json` states. Older npm versions ignore the install-script policy below.
- Docker with Compose, for the local broker.

## First run

```bash
npm ci
cd docker && docker compose up -d && cd ..
npm run dev
```

`docker compose up -d` starts Scorpio at http://localhost:9090/ngsi-ld/v1, with its Postgres database, and a notification receiver at http://localhost:8099. Scorpio takes about a minute to start. `npm run dev` serves Aquila at http://localhost:2361 and opens it.

Without a `/config.json`, Aquila selects `Local broker` at `http://localhost:9090/ngsi-ld/v1`, the default in `src/config.ts`. To start from another broker, create `public/config.json` with `brokerName` and `brokerUrl`. It is git-ignored. In the container, `nginx/40-aquila-config.sh` writes the same file from `AQUILA_BROKER_NAME` and `AQUILA_BROKER_URL` when the container starts.

## The local stack

`docker/docker-compose.yaml` runs the services Aquila talks to. With `--profile app` it also builds Aquila's image from this repository and serves it at http://localhost:2362:

```bash
cd docker
docker compose --profile app up -d --build
```

| Variable | Default | Purpose |
|---|---|---|
| `SCORPIO_PORT` | `9090` | Port Scorpio is published on |
| `RECEIVER_PORT` | `8099` | Port the receiver is published on |
| `RECEIVER_KEEP` | `5000` | Number of notifications the receiver keeps |
| `CORS_ORIGINS` | `http://localhost:2361,http://localhost:2362` | Origins Scorpio accepts; must include the one Aquila is opened from |
| `AQUILA_PORT` | `2362` | Port of Aquila in the `app` profile |
| `AQUILA_BROKER_URL`, `AQUILA_BROKER_NAME` | unset, `Local Scorpio` | Broker Aquila selects on first load in the `app` profile |

Scorpio calls notification URIs from inside the Compose network, so a subscription that should reach the receiver uses `http://receiver:8099/notify/<tag>`, not `localhost`. `?status=500` makes the receiver answer with an error and `?delay=2000` makes it answer late, to test failing and slow deliveries. The receiver's page lists what it received; `GET /notifications` returns the same list as JSON, filtered with `?tag=`, `?tagPrefix=` or `?subscriptionId=`.

`npm run seed` puts demo entities and subscriptions on the local Scorpio and changes the entities, so Aquila lists delivered, paused, failing and expiring subscriptions. Running it again replaces the demo subscriptions.

PostGIS publishes amd64 images only, so ARM machines run the database emulated. `docker compose down -v` removes the stack and its data.

## Source layout

| Path | Contents |
|---|---|
| `src/main.tsx` | Entry point: loads `/config.json`, then renders the app |
| `src/AquilaProviders.tsx`, `src/brokers.ts`, `src/config.ts` | Providers, the brokers stored in the browser, and the runtime configuration |
| `src/routes/` | TanStack Router file routes. `src/routeTree.gen.ts` is generated from them by the router plugin; do not edit it |
| `src/components/` | Aquila's own components. The subscription list, editor and entity explorer come from `@vela-tools/ui` and `@vela-tools/ngsi` |
| `test/` | Vitest tests, mirroring `src/` |
| `nginx/` | The image's nginx configuration, the content security policy in `security-headers.conf`, and the start script that writes `/config.json` |
| `docker/` | The Compose stack and the notification receiver |

## Checks

Every check CI runs is an npm script:

| Script | What it does | Workflow |
|---|---|---|
| `npm run format:check` | Prettier, with `.prettierrc.json`; `npm run format` rewrites the files | `format` |
| `npm run lint` | ESLint with no warnings allowed, including `eslint-plugin-compat` against the supported browsers | `lint` |
| `npm run knip` | Unused files, exports and dependencies | `lint` |
| `npm run typecheck` | TypeScript for `src` and `test` | `typecheck` |
| `npm run build` | Type build and production bundle in `dist/` | `test` |
| `npm test` | Vitest in jsdom, against the mock adapter from `@vela-tools/ngsi/testing`, so no broker is needed | `test` |
| `npm run audit:sources` | lockfile-lint and `npm audit signatures`: every package comes from registry.npmjs.org with a valid signature | `dependencies` |

The `test` workflow also builds and tests on Node 22.22.2, the oldest supported version. The `dependencies` workflow runs osv-scanner for advisories and licences as well, with the policy in `osv-scanner.toml` and the allowed licences in `.github/workflows/dependencies.yaml`. Development-only packages are exempt from the licence check, because they never ship; their advisories are still checked. The remaining workflows check for secrets with gitleaks, lint the workflows with actionlint and zizmor, and check that the commits and the title of a pull request follow Conventional Commits, since a squash merge uses the title as the commit subject.

osv-scanner takes licences from deps.dev, which lists a new release some time after npm publishes it, often a day or more. Until then the licence check reports the release as `UNKNOWN` and fails, typically on a Dependabot pull request. Re-run the check once deps.dev lists the version, or add a `[[PackageOverrides]]` entry for that exact version to `osv-scanner.toml` with the licence its `package.json` and licence file state, as for `@tanstack/react-query` 5.108.4. An entry for one version stops applying with the next update; delete it then.

One file or test: `npx vitest run test/config.test.ts`, or `npx vitest` to watch.

## Dependencies

`.npmrc` pins the npm registry and sets `strict-allow-scripts`: a dependency with an install script fails the install until it is listed under `allowScripts` in `package.json`, as allowed (`true`) or denied (`false`). CI and the image build install with `--ignore-scripts` as well.

Dependabot proposes updates every day for npm, the GitHub Actions, the `Dockerfile` and the Compose file, grouping minor and patch updates. Base images are pinned to an exact version and digest, and Dependabot updates both. Two updates are held back, each with its reason in `.github/dependabot.yaml`: TypeScript majors, until typescript-eslint supports TypeScript 7, and Scorpio, until a release after 6.0.1 is out.

The supported browsers are the `browserslist` entry in `package.json`, Baseline Widely available. The build target in `vite.config.ts` and the compat lint rule both read it.

`npm run build` writes the licences of every bundled package to `dist/licenses/third-party.md`. The image adds `LICENSE.md` and `NOTICE.md` beside it and serves the three files at `/licenses/`.

## Working on the Vela packages

To change `@vela-tools/ui`, `@vela-tools/ngsi` or `@vela-tools/ngsi-client` together with Aquila, clone [Vela Components](https://github.com/vela-tools/components) next to Aquila, build it and link the packages:

```bash
cd ../components && npm run build
cd ../aquila && npm install --no-save ../components/packages/{ui,ngsi,ngsi-client}
```

Run `npm run build` in `components` after each change there, then reload Aquila. `npm ci` goes back to the released packages.

To build the image from a `dist/` built this way:

```bash
npm run build
docker build --build-context app-dist=./dist -t aquila:test .
```

## Releasing

A release is a `vX.Y.Z` tag, or `vX.Y.Z-alpha.N`, `-beta.N` or `-rc.N` for a pre-release, on a commit on `main`. The version in `package.json` is the only place it is written: set it with `npm version <version> --no-git-tag-version`, which also updates the lockfile, and the header shows it. The `release` workflow fails when the tag and `package.json` disagree or the commit is not on `main`. It then runs every check, builds the image for `linux/amd64` and `linux/arm64`, signs it, attests its provenance, pushes it to `ghcr.io/vela-tools/aquila`, and creates the GitHub release with notes generated by git-cliff from `cliff.toml`. Last, it dispatches the `pages` workflow, which builds the documentation site from `main` of `vela-tools/aquila-docs` and deploys it to https://vela-tools.github.io/aquila/, so the documentation for a release is merged there before the tag is pushed. `pages` can also be dispatched by hand, with a branch, tag or SHA of `aquila-docs`.
