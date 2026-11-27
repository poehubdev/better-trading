#!/usr/bin/env bash
# Usage: pnpm release <patch|minor|major|prerelease|x.y.z>
# Bumps package.json version, tags vX.Y.Z and pushes; the tag triggers the GitHub Release build.
set -euo pipefail

bump=${1:?usage: pnpm release <patch|minor|major|prerelease|x.y.z>}

[[ $(git branch --show-current) == main ]] || { echo "release from main only" >&2; exit 1; }
# Untracked files never reach the tag, so only tracked changes block a release.
[[ -z $(git status --porcelain --untracked-files=no) ]] || { echo "uncommitted changes to tracked files" >&2; exit 1; }

slug=$(node -p "require('./package.json').changelog")
[[ -f changelogs/$slug.md ]] || { echo "changelogs/$slug.md missing (package.json changelog)" >&2; exit 1; }

git pull --ff-only
npm version "$bump"
git push --follow-tags
