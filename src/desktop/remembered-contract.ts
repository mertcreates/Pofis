export type RememberedResult<T> = { ok: true; value: T } | {
  ok: false; error: { code: string; status: number; details: Record<string, string | number> };
};

export type DesktopRememberedSessionBridge = {
  connect(input: { username: FormDataEntryValue | null; password: FormDataEntryValue | null; remember: boolean }): Promise<RememberedResult<{ remembered: boolean; cleanupFailed?: boolean }>>;
  disconnect(): Promise<RememberedResult<void>>;
  recover(force: boolean): Promise<RememberedResult<boolean>>;
  onRecovered(callback: () => void): () => void;
  onInvalid(callback: (cleanupFailed: boolean) => void): () => void;
};

declare global { interface Window { pofisRememberedSession?: DesktopRememberedSessionBridge } }
