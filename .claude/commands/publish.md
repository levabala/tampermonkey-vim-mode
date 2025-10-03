# publish

Publish a new version of the Tampermonkey script:

1. Run all tests to ensure everything works
2. Bump the version number in src/setup.ts (increment the patch version)
3. Rebuild the distribution file with `bun run build`
4. Run `bun run lint:fix && bun run format` to ensure code quality
5. Check git status, diff, and recent commits in parallel to understand changes
6. Commit all changes with an inferred descriptive message using heredoc format
7. Push to the remote repository

Optimize performance by:

- Running independent git commands (status, diff, log) in parallel using multiple Bash tool calls in a single message
- Chaining dependent commands with && (e.g., `lint:fix && format`, `git add && git commit && git push`)

Do not use the TodoWrite tool for this command.
