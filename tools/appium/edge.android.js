const {
  APP_ACTIVITY,
  APP_PACKAGE,
  connect,
  ensureHomeVisible,
  loginIfNeeded,
  runAdb,
  waitForAppEntry,
} = require('./lib/common');

async function run() {
  const driver = await connect();

  try {
    await loginIfNeeded(driver);
    await ensureHomeVisible(driver);

    console.log('Simulating Android process death and relaunch.');
    runAdb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
    runAdb(['shell', 'am', 'kill', APP_PACKAGE]);
    runAdb(['shell', 'am', 'start', '-n', `${APP_PACKAGE}/${APP_ACTIVITY}`]);

    await waitForAppEntry(driver, 30000);
    await loginIfNeeded(driver);
    await ensureHomeVisible(driver);

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
