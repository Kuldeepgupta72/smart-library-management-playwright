import fs from 'fs';
import path from 'path';

/**
 * DataLoader — Loads JSON test-data fixtures from src/data/<file>.json.
 *
 * Kept intentionally simple for a single-site framework: no brand/env
 * sub-folders like the reference repo, since automationexercise.com doesn't
 * need that split. If this framework later grows multiple target sites,
 * this is the natural place to add a brand-aware resolution path.
 */
export class DataLoader {
  private readonly dataDir: string;

  constructor(dataDir: string = path.resolve(__dirname, '../data')) {
    this.dataDir = dataDir;
  }

  /**
   * Load and parse a JSON fixture file by name.
   * e.g. loader.load('users.json') -> reads src/data/users.json
   */
  load<T = unknown>(fileName: string): T {
    const filePath = path.join(this.dataDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Test data file not found: ${filePath}`);
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  }
}
