const {
  TEST_IDS,
  connect,
  findByTestId,
  loginIfNeeded,
} = require('./lib/common');

async function run() {
  const driver = await connect();

  try {
    await loginIfNeeded(driver);

    const home = await findByTestId(driver, TEST_IDS.home.screen, 10000);
    if (!home) {
      throw new Error('Home screen selector not found after login sanity check.');
    }

    console.log('Appium sanity flow completed successfully.');
  } finally {
    await driver.deleteSession();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  run,
};
