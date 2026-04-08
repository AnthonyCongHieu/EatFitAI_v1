const { execFileSync } = require('child_process');
const { resolveEnv } = require('../automation/resolveEnv');
const {
  TEST_IDS,
  captureDebugArtifacts,
  connect,
  findByTestId,
  loginIfNeeded,
  runAdb,
  waitForAny,
} = require('./lib/common');

function formatLocalDate(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeSqlLiteral(value) {
  return value.replace(/'/g, "''");
}

function runSql(query) {
  return execFileSync(
    'sqlcmd',
    ['-S', 'localhost', '-d', 'EatFitAI', '-E', '-C', '-h', '-1', '-W', '-Q', query],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  ).trim();
}

async function tapByTestId(driver, testId, timeout = 15000) {
  const element = await findByTestId(driver, testId, timeout);
  if (!element) {
    throw new Error(`Selector not found: ${testId}`);
  }

  await element.click();
  return element;
}

async function scrollUntilTestIdVisible(driver, testId, attempts = 6) {
  for (let index = 0; index < attempts; index += 1) {
    const element = await findByTestId(driver, testId, 2000);
    if (element) {
      return element;
    }

    runAdb(['shell', 'input', 'swipe', '540', '1850', '540', '950', '250']);
    await driver.pause(800);
  }

  return null;
}

async function setValueByTestId(driver, testId, value, timeout = 10000) {
  const element = await findByTestId(driver, testId, timeout);
  if (!element) {
    throw new Error(`Input selector not found: ${testId}`);
  }

  try {
    await element.setValue(value);
    return;
  } catch {
    const freshElement = await findByTestId(driver, testId, 3000);
    if (!freshElement) {
      throw new Error(`Input selector disappeared before typing: ${testId}`);
    }

    await freshElement.setValue(value);
  }
}

async function tapByDescriptionOrText(driver, value, timeout = 10000) {
  const selectors = [
    `android=new UiSelector().description("${value}")`,
    `android=new UiSelector().text("${value}")`,
  ];
  const start = Date.now();

  while (Date.now() - start < timeout) {
    for (const selector of selectors) {
      const element = await driver.$(selector);
      if (await element.isExisting()) {
        await element.click();
        return;
      }
    }

    await driver.pause(300);
  }

  throw new Error(`Description/text selector not found: ${value}`);
}

async function tapByTestIdWithScroll(driver, testId, attempts = 4) {
  for (let index = 0; index < attempts; index += 1) {
    const element = await findByTestId(driver, testId, 2000);
    if (element) {
      await element.click();
      return;
    }

    runAdb(['shell', 'input', 'swipe', '540', '1850', '540', '1100', '250']);
    await driver.pause(800);
  }

  throw new Error(`Selector not found after scrolling: ${testId}`);
}

async function waitForTestIdToDisappear(driver, testId, timeout = 8000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const element = await findByTestId(driver, testId, 500);
    if (!element) {
      return;
    }

    await driver.pause(300);
  }

  throw new Error(`Selector still visible after timeout: ${testId}`);
}

async function searchForTerm(driver, searchTerm) {
  try {
    await tapByDescriptionOrText(driver, searchTerm, 3000);
    return;
  } catch {
    await setValueByTestId(driver, TEST_IDS.foodSearch.queryInput, searchTerm, 10000);
    await tapByTestId(driver, TEST_IDS.foodSearch.submitButton, 10000);
  }
}

function verifyAndCleanupDatabase({ selectedDate, todayDate, note }) {
  const email = resolveEnv('EATFITAI_DEMO_EMAIL');
  if (!email) {
    throw new Error('EATFITAI_DEMO_EMAIL is missing, cannot verify DB state.');
  }

  const escapedEmail = escapeSqlLiteral(email);
  const escapedNote = escapeSqlLiteral(note);
  const verifyQuery = `
SET NOCOUNT ON;
SELECT
  CAST(m.MealDiaryId AS varchar(20)) + '|' +
  CONVERT(varchar(10), m.EatenDate, 23) + '|' +
  CAST(CAST(m.Grams AS decimal(10, 2)) AS varchar(32))
FROM MealDiary m
INNER JOIN dbo.Users u ON u.UserId = m.UserId
WHERE u.Email = '${escapedEmail}'
  AND m.Note = '${escapedNote}'
  AND m.IsDeleted = 0;
`;
  const verifyOutput = runSql(verifyQuery)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (verifyOutput.length !== 1) {
    throw new Error(`Expected exactly 1 MealDiary row for note ${note}, found ${verifyOutput.length}.`);
  }

  const [mealDiaryId, eatenDate, grams] = verifyOutput[0].split('|');
  if (eatenDate !== selectedDate) {
    throw new Error(`MealDiary saved to ${eatenDate}, expected ${selectedDate}.`);
  }
  if (eatenDate === todayDate) {
    throw new Error(`MealDiary incorrectly saved to today (${todayDate}).`);
  }

  const cleanupQuery = `
SET NOCOUNT ON;
DELETE m
FROM MealDiary m
INNER JOIN dbo.Users u ON u.UserId = m.UserId
WHERE u.Email = '${escapedEmail}'
  AND m.Note = '${escapedNote}';
`;
  runSql(cleanupQuery);

  return { mealDiaryId, eatenDate, grams };
}

function cleanupDatabaseByNote(note) {
  const email = resolveEnv('EATFITAI_DEMO_EMAIL');
  if (!email || !note) {
    return;
  }

  const escapedEmail = escapeSqlLiteral(email);
  const escapedNote = escapeSqlLiteral(note);
  const cleanupQuery = `
SET NOCOUNT ON;
DELETE m
FROM MealDiary m
INNER JOIN dbo.Users u ON u.UserId = m.UserId
WHERE u.Email = '${escapedEmail}'
  AND m.Note = '${escapedNote}';
`;

  try {
    runSql(cleanupQuery);
  } catch {
    // Ignore cleanup failures so the original test error is preserved.
  }
}

async function run() {
  const driver = await connect();
  const selectedDate = formatLocalDate(-1);
  const todayDate = formatLocalDate(0);
  const uniqueSuffix = Date.now();
  const searchTerm = process.env.MANUAL_LOGGING_SEARCH_TERM || 'rice';
  const gramsValue = '997';
  const noteValue = `e2e-p3-fe-09-${uniqueSuffix}`;

  try {
    const appEntry = await waitForAny(
      driver,
      [TEST_IDS.home.screen, TEST_IDS.auth.welcomeLoginButton, TEST_IDS.auth.loginScreen],
      15000,
    );
    if (appEntry !== TEST_IDS.home.screen) {
      await loginIfNeeded(driver);
    } else {
      console.log('Home screen detected, skipping login bootstrap.');
    }

    const diaryButton = await scrollUntilTestIdVisible(driver, TEST_IDS.home.diaryButton);
    if (!diaryButton) {
      throw new Error(`Selector not found after scroll: ${TEST_IDS.home.diaryButton}`);
    }
    await diaryButton.click();
    await waitForAny(driver, [TEST_IDS.mealDiary.screen], 15000);

    await tapByTestId(
      driver,
      `${TEST_IDS.mealDiary.dateChipPrefix}-${selectedDate}`,
      10000,
    );

    const manualAddButton =
      (await findByTestId(driver, TEST_IDS.mealDiary.addManualButton, 3000)) ??
      (await findByTestId(driver, TEST_IDS.mealDiary.emptyAddManualButton, 3000));

    if (!manualAddButton) {
      throw new Error('Manual add CTA was not found on MealDiary.');
    }
    await manualAddButton.click();

    await waitForAny(driver, [TEST_IDS.foodSearch.screen], 15000);
    await searchForTerm(driver, searchTerm);
    await tapByTestId(driver, TEST_IDS.foodSearch.firstResultCard, 20000);

    await waitForAny(driver, [TEST_IDS.foodDetail.screen], 15000);

    const gramsInput = await findByTestId(driver, TEST_IDS.foodDetail.gramsInput, 10000);
    if (!gramsInput) {
      throw new Error('Food detail grams input not found.');
    }

    await setValueByTestId(driver, TEST_IDS.foodDetail.gramsInput, gramsValue);
    const noteInput =
      (await findByTestId(driver, TEST_IDS.foodDetail.noteInput, 3000)) ??
      (await scrollUntilTestIdVisible(driver, TEST_IDS.foodDetail.noteInput, 4));
    if (!noteInput) {
      throw new Error('Food detail note input not found.');
    }

    await setValueByTestId(driver, TEST_IDS.foodDetail.noteInput, noteValue);
    await tapByTestIdWithScroll(driver, TEST_IDS.foodDetail.submitButton, 4);

    await waitForAny(driver, [TEST_IDS.mealDiary.screen], 20000);

    const backToTodayButton = await findByTestId(driver, TEST_IDS.mealDiary.backToTodayButton, 10000);
    if (!backToTodayButton) {
      throw new Error('Expected to remain on a non-today diary after save, but back-to-today button was not visible.');
    }

    const dbRecord = verifyAndCleanupDatabase({
      selectedDate,
      todayDate,
      note: noteValue,
    });

    await backToTodayButton.click();
    await waitForTestIdToDisappear(driver, TEST_IDS.mealDiary.backToTodayButton, 8000);

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          selectedDate,
          todayDate,
          searchTerm,
          gramsValue,
          noteValue,
          mealDiaryId: dbRecord.mealDiaryId,
          eatenDate: dbRecord.eatenDate,
          dbGrams: dbRecord.grams,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    cleanupDatabaseByNote(noteValue);
    await captureDebugArtifacts(driver, 'manual-logging-date-failure').catch(() => null);
    throw error;
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
