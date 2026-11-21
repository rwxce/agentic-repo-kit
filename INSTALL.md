# Install agentic-repo-kit (instructions for AI agents)

You are an AI coding agent and the user asked you to install the `repo-bootstrap` skill from
this repository. Follow these steps exactly. Do not run any script from this repository: the
install is a file copy.

## 1. Ask one question

Ask the user, and wait for the answer:

> Install `/repo-bootstrap` for **every project** on this machine, or only for **this
> repository**?

If you are not inside a git repository, skip the question and install for every project.

## 2. Pick the destination

Use the skills folder of the tool you are running in:

| Tool | Every project | This repository |
|---|---|---|
| Claude Code | `~/.claude/skills/` | `<repo>/.claude/skills/` |
| Codex CLI | `~/.codex/skills/` | `<repo>/.codex/skills/` |
| Cursor | `~/.cursor/skills/` | `<repo>/.cursor/skills/` |
| OpenCode | `~/.config/opencode/skills/` | `<repo>/.opencode/skills/` |

If the repository has a `.rulesync/` folder, install into `<repo>/.rulesync/skills/` instead and
run the repository's rulesync generate command afterwards, so every tool gets the skill.

If your tool is not listed or you are unsure where it reads skills from, check its official
docs, or ask the user. Do not guess a path.

## 3. Copy the skill

```bash
tmp="$(mktemp -d)"
git clone --depth 1 https://github.com/rwxce/agentic-repo-kit.git "$tmp/agentic-repo-kit"
mkdir -p "<destination>"
cp -R "$tmp/agentic-repo-kit/skills/repo-bootstrap" "<destination>/"
rm -rf "$tmp"
```

- If `<destination>/repo-bootstrap` already exists, ask before replacing it, because it is an
  update.
- Copy only `skills/repo-bootstrap`. Do not copy the rest of this repository into the user's
  project.

## 4. Check it

- `<destination>/repo-bootstrap/SKILL.md` exists and starts with a `---` frontmatter block.
- `<destination>/repo-bootstrap/templates/` and `references/` exist.

## 5. Tell the user

Reply in the user's language, in two lines:

- where you installed it;
- how to start: run `/repo-bootstrap` (or say "make this repo agent-ready") inside the
  repository to set up. New skills may only appear after the tool restarts or a new session
  starts.

Do not start `/repo-bootstrap` yourself unless the user asks.
