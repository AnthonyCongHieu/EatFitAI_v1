const { run } = require('./sanity.android');

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
