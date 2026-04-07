const {
  APP_ACTIVITY,
  APP_PACKAGE,
  TEST_IDS,
  connect,
  findByTestId,
  loginIfNeeded,
  runAdb,
  waitForAppEntry,
} = require('./lib/common');

async function run() {
  const driver = await connect();

  try {
    await loginIfNeeded(driver);

    const home = await findByTestId(driver, TEST_IDS.home.screen, 10000);
    if (!home) {
      throw new Error('Home screen selector not found before edge flow.');
    }

    console.log('Simulating Android process death and relaunch.');
    runAdb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
    runAdb(['shell', 'am', 'kill', APP_PACKAGE]);
    runAdb(['shell', 'am', 'start', '-n', `${APP_PACKAGE}/${APP_ACTIVITY}`]);

    await waitForAppEntry(driver, 30000);
    await loginIfNeeded(driver);

    const recoveredHome = await findByTestId(driver, TEST_IDS.home.screen, 10000);
    if (!recoveredHome) {
      throw new Error('Home screen selector not found after edge recovery flow.');
    }

    console.log('Appium edge flow completed successfully.');
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
