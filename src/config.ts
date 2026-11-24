export type AquilaConfig = {
    brokerName: string;
    brokerUrl: string;
};

const DEFAULT_CONFIG: AquilaConfig = {
    brokerName: "Local broker",
    brokerUrl: "http://localhost:9090/ngsi-ld/v1",
};

const text = (value: unknown, fallback: string) =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;

export async function loadConfig(): Promise<AquilaConfig> {
    try {
        const response = await fetch("/config.json", { cache: "no-store" });
        if (!response.ok) return DEFAULT_CONFIG;
        const raw: unknown = await response.json();
        const values = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        return {
            brokerName: text(values.brokerName, DEFAULT_CONFIG.brokerName),
            brokerUrl: text(values.brokerUrl, DEFAULT_CONFIG.brokerUrl),
        };
    } catch {
        return DEFAULT_CONFIG;
    }
}
