import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  SourceLoadError,
  type RawDataset,
  type RawModelRecord,
  type RawRecord,
  type SourceAdapter,
} from "./source-adapter";

/**
 * Reads the hand-curated dataset committed under `data/`:
 *
 *   dataset.json          name + version of the snapshot
 *   labs.json             array of labs
 *   providers.json        array of providers
 *   benchmarks.json       array of benchmarks
 *   models/<lab>.json     array of that lab's models, each with its offerings and scores
 *
 * One file per lab keeps diffs small and reviewable in pull requests.
 */
export class CuratedJsonAdapter implements SourceAdapter {
  readonly name = "curated";
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  async load(): Promise<RawDataset> {
    const meta = await this.readJson("dataset.json");
    const version =
      meta && typeof meta === "object" && "version" in meta ? String(meta.version) : "unversioned";

    const [labs, providers, benchmarks] = await Promise.all([
      this.readArray("labs.json"),
      this.readArray("providers.json"),
      this.readArray("benchmarks.json"),
    ]);

    const modelFiles = (await this.listDir("models")).filter((name) => name.endsWith(".json"));
    const models: RawModelRecord[] = [];
    for (const name of modelFiles.sort()) {
      const labSlug = name.replace(/\.json$/, "");
      for (const record of await this.readArray(`models/${name}`)) {
        models.push({ ...record, labSlug });
      }
    }

    return { source: `${this.name}@${version}`, labs, providers, benchmarks, models };
  }

  private displayPath(relative: string): string {
    return path
      .relative(process.cwd(), path.join(this.dataDir, relative))
      .split(path.sep)
      .join("/");
  }

  private async readJson(relative: string): Promise<unknown> {
    const file = this.displayPath(relative);
    let text: string;
    try {
      text = await readFile(path.join(this.dataDir, relative), "utf8");
    } catch (error) {
      throw new SourceLoadError(file, "could not read file", { cause: error });
    }
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new SourceLoadError(file, `invalid JSON (${(error as Error).message})`, {
        cause: error,
      });
    }
  }

  private async readArray(relative: string): Promise<RawRecord[]> {
    const value = await this.readJson(relative);
    if (!Array.isArray(value)) {
      throw new SourceLoadError(this.displayPath(relative), "expected a JSON array of records");
    }
    const file = this.displayPath(relative);
    return value.map((record, index) => ({ file, index, value: record }));
  }

  private async listDir(relative: string): Promise<string[]> {
    try {
      return await readdir(path.join(this.dataDir, relative));
    } catch (error) {
      throw new SourceLoadError(this.displayPath(relative), "could not list directory", {
        cause: error,
      });
    }
  }
}
