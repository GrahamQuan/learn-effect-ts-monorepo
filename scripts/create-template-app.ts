import { cp, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline';

const APPS_DIRECTORY_NAME = 'apps';
const APP_NAME_PADDING = 3;
const APP_DIRECTORY_NAME_PATTERN = /^(?<prefix>\d+)(?<suffix>-.+)$/;

type AppDirectory = {
  name: string;
  path: string;
};

async function main(): Promise<void> {
  const rootDirectoryPath = process.cwd();
  const appsDirectoryPath = path.join(rootDirectoryPath, APPS_DIRECTORY_NAME);
  const appDirectories = await getAppDirectories(appsDirectoryPath);
  const sourceDirectory = await selectAppDirectory(appDirectories);
  const targetDirectoryName = getNextAppDirectoryName(appDirectories, sourceDirectory.name);
  const targetDirectoryPath = path.join(appsDirectoryPath, targetDirectoryName);

  await cp(sourceDirectory.path, targetDirectoryPath, { recursive: true });
  await syncPackageName(targetDirectoryPath, targetDirectoryName);

  console.log({
    copiedFrom: path.relative(rootDirectoryPath, sourceDirectory.path),
    created: path.relative(rootDirectoryPath, targetDirectoryPath),
  });
}

async function getAppDirectories(appsDirectoryPath: string): Promise<AppDirectory[]> {
  const directoryEntries = await readdir(appsDirectoryPath, { withFileTypes: true });
  const appDirectories = directoryEntries
    .filter((directoryEntry) => directoryEntry.isDirectory())
    .map((directoryEntry) => ({
      name: directoryEntry.name,
      path: path.join(appsDirectoryPath, directoryEntry.name),
    }))
    .sort((leftDirectory, rightDirectory) => leftDirectory.name.localeCompare(rightDirectory.name));

  if (appDirectories.length === 0) {
    throw new Error(`No app directories found in ${appsDirectoryPath}`);
  }

  return appDirectories;
}

function getNextAppDirectoryName(appDirectories: AppDirectory[], sourceDirectoryName: string): string {
  const latestAppNumber = Math.max(
    0,
    ...appDirectories.map((appDirectory) => getAppDirectoryNumber(appDirectory.name)),
  );
  const nextAppPrefix = String(latestAppNumber + 1).padStart(APP_NAME_PADDING, '0');
  const sourceDirectorySuffix = getAppDirectorySuffix(sourceDirectoryName);

  return `${nextAppPrefix}${sourceDirectorySuffix}`;
}

function getAppDirectoryNumber(appDirectoryName: string): number {
  const match = APP_DIRECTORY_NAME_PATTERN.exec(appDirectoryName);
  const prefix = match?.groups?.prefix;

  return prefix === undefined ? 0 : Number(prefix);
}

function getAppDirectorySuffix(appDirectoryName: string): string {
  const match = APP_DIRECTORY_NAME_PATTERN.exec(appDirectoryName);
  const suffix = match?.groups?.suffix;

  return suffix ?? `-${appDirectoryName}`;
}

async function selectAppDirectory(appDirectories: AppDirectory[]): Promise<AppDirectory> {
  const input = process.stdin;
  const output = process.stdout;

  if (!input.isTTY || !output.isTTY) {
    throw new Error('This script needs an interactive terminal so you can select an app with the arrow keys.');
  }

  readline.emitKeypressEvents(input);

  const previousRawMode = input.isRaw;
  let selectedIndex = 0;

  input.setRawMode(true);
  input.resume();

  return await new Promise((resolve, reject) => {
    const cleanup = (): void => {
      input.off('keypress', onKeypress);
      input.setRawMode(previousRawMode);
      input.pause();
      output.write('\x1B[?25h\n');
    };

    const render = (): void => {
      output.write('\x1B[2J\x1B[H\x1B[?25l');
      output.write('Select an app folder to copy:\n\n');

      for (const [appDirectoryIndex, appDirectory] of appDirectories.entries()) {
        const marker = appDirectoryIndex === selectedIndex ? '>' : ' ';
        output.write(`${marker} ${appDirectory.name}\n`);
      }

      output.write('\nUse up/down arrows to move, enter to create, ctrl+c to cancel.\n');
    };

    const onKeypress = (_inputValue: string, key: readline.Key): void => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('Cancelled'));
        return;
      }

      if (key.name === 'up') {
        selectedIndex = selectedIndex === 0 ? appDirectories.length - 1 : selectedIndex - 1;
        render();
        return;
      }

      if (key.name === 'down') {
        selectedIndex = selectedIndex === appDirectories.length - 1 ? 0 : selectedIndex + 1;
        render();
        return;
      }

      if (key.name === 'return') {
        const selectedAppDirectory = appDirectories[selectedIndex];

        if (selectedAppDirectory === undefined) {
          cleanup();
          reject(new Error('Selected app directory was not found.'));
          return;
        }

        cleanup();
        resolve(selectedAppDirectory);
      }
    };

    input.on('keypress', onKeypress);
    render();
  });
}

async function syncPackageName(targetDirectoryPath: string, targetDirectoryName: string): Promise<void> {
  const packageJsonPath = path.join(targetDirectoryPath, 'package.json');
  const packageJsonContent = await readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonContent) as Record<string, unknown>;
  packageJson.name = targetDirectoryName;

  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
}

main().catch((error: unknown) => {
  console.error({ error });
  process.exitCode = 1;
});
