# Luna Chat Coder entry point

When repository development is requested from a chat surface with a disposable or sandboxed code-execution environment, read `.agents/skills/luna-chat-coder/SKILL.md` before working on the repository task.

Loading the skill is a readiness step, not a reason to use GitHub Actions. Normal engineering work should stay in the chat sandbox work container when it is available and sufficient.

The repository itself defines its runtimes, services, dependencies, architecture, build system, and verification requirements. Luna Chat Coder supplies continuity and missing execution capability; it does not introduce a development methodology or substitute technologies merely because they are easier to run.

Treat exact GitHub commit and PR state as durable source truth, preserve unrelated work, and do not make access to the user's computer a dependency of the workflow.

When this repository is used as a template, keep this entry point and add the project's own engineering instructions alongside it.

## Todo web app engineering instructions

- Runtime: Node.js 22 or newer.
- The app is dependency-free vanilla HTML, CSS, and JavaScript modules under `src/`.
- Keep application state logic in `src/todo-store.mjs` independently testable from the DOM.
- Run `npm test` for unit tests and `npm run build` for the production build.
- Build output belongs in `dist/` and must not be committed.
