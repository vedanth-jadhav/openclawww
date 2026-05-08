import { ensureDatabase } from "@/app/lib/migrate";
import { sqlite } from "@/app/lib/db";

export type RouterSettings = {
  ninerouterUrl: string;
  ninerouterKey: string;
  ninerouterModel: string;
};

const keys = {
  ninerouterUrl: "ninerouter_url",
  ninerouterKey: "ninerouter_key",
  ninerouterModel: "ninerouter_model"
} as const;

export function getRouterSettings(): RouterSettings {
  ensureDatabase();
  const rows = sqlite.prepare("SELECT key, value FROM app_settings").all() as Array<{ key: string; value: string }>;
  const values = new Map(rows.map((row) => [row.key, row.value]));
  return {
    ninerouterUrl: values.get(keys.ninerouterUrl) || process.env.NINEROUTER_URL || "",
    ninerouterKey: values.get(keys.ninerouterKey) || process.env.NINEROUTER_KEY || "",
    ninerouterModel: values.get(keys.ninerouterModel) || process.env.NINEROUTER_MODEL || "auto"
  };
}

export function saveRouterSettings(settings: RouterSettings) {
  ensureDatabase();
  const write = sqlite.transaction(() => {
    for (const [key, value] of [
      [keys.ninerouterUrl, settings.ninerouterUrl.trim()],
      [keys.ninerouterKey, settings.ninerouterKey.trim()],
      [keys.ninerouterModel, settings.ninerouterModel.trim() || "auto"]
    ]) {
      sqlite
        .prepare("INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, unixepoch()) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()")
        .run(key, value);
    }
  });
  write();
}
