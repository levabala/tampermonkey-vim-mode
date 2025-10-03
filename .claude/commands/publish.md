# publish

Publish a new version of the Tampermonkey script:

1. Run all tests to ensure everything works
2. Bump the version number in the `@version` field of tampermonkey_vim_mode.js (increment the patch version)
3. Look at recent git commits and staged/unstaged changes to infer an appropriate commit message
4. Commit all changes with the inferred descriptive message
5. Push to the remote repository

Do not use the TodoWrite tool for this command.
