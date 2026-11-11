# Organizational Rules

1. Never work directly on the `main` branch. For small changes, work off of the `dev` branch. For larger changes, create a new branch off of `dev` and submit a pull request for review.
2. Keep the `main` branch clean and stable. Only merge code that has been reviewed and tested.
3. **NEVER** run `npm run test:e2e` on the `main` branch. This command will delete all data in the database and reset it to its initial state. Before running it on any branch, ensure that you are not connected to the production database but instead to the development database. Always double-check your database connection before running this command.
4. Always write tests for new features and bug fixes. Ensure that all tests pass before submitting a pull request.
5. If you use an LLM to generate code, double check the generated code for correctness, security vulnerabilities, and adherence to project standards. Do not blindly trust generated code.