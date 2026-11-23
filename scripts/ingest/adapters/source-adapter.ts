/**
 * A source of catalog data. The MVP ships one adapter (curated JSON in the repo); a live feed
 * would be another adapter feeding the same validate → normalize → write steps (docs D11).
 */
export interface SourceAdapter {
  readonly name: string;
  load(): Promise<RawDataset>;
}

/** One unparsed record plus where it came from, so problems can be reported precisely. */
export type RawRecord = {
  file: string;
  index: number;
  value: unknown;
};

export type RawModelRecord = RawRecord & {
  /** The lab that owns the model (curated data: taken from the file name). */
  labSlug: string;
};

export type RawDataset = {
  /** Identifies this snapshot in IngestionRun, e.g. "curated@2026-11-22". */
  source: string;
  labs: RawRecord[];
  providers: RawRecord[];
  benchmarks: RawRecord[];
  models: RawModelRecord[];
};

/** A file could not be read or parsed. Fatal: nothing is written. */
export class SourceLoadError extends Error {
  readonly file: string;

  constructor(file: string, message: string, options?: { cause?: unknown }) {
    super(`${file}: ${message}`, options);
    this.name = "SourceLoadError";
    this.file = file;
  }
}
