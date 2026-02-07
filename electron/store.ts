import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export class SimpleStore {
  private path: string;
  private data: Record<string, any>;

  constructor(opts: { configName: string; defaults: Record<string, any> }) {
    const userDataPath = app.getPath('userData');
    this.path = path.join(userDataPath, opts.configName + '.json');
    this.data = parseDataFile(this.path, opts.defaults);
  }

  get(key: string) {
    return this.data[key];
  }

  set(key: string, val: any) {
    this.data[key] = val;
    try {
      fs.writeFileSync(this.path, JSON.stringify(this.data));
    } catch (error) {
      console.error('Error writing to store:', error);
    }
  }
}

function parseDataFile(filePath: string, defaults: Record<string, any>) {
  try {
    return JSON.parse(fs.readFileSync(filePath).toString());
  } catch (error) {
    return defaults;
  }
}
