import { NGSI_LD_CORE_CONTEXT, type NgsiBroker, type NgsiBrokerInput } from "@vela-tools/ngsi";
import { createNgsiLdAdapter } from "@vela-tools/ngsi-client";
import type { AquilaConfig } from "./config";

export const BROKER_STORAGE_KEY = "aquila.brokers";

export const defaultBrokers = (config: AquilaConfig): NgsiBrokerInput[] => [
    {
        name: config.brokerName,
        url: config.brokerUrl,
        contextUrl: NGSI_LD_CORE_CONTEXT,
    },
];

export const createAdapters = (broker: NgsiBroker) =>
    createNgsiLdAdapter({
        url: broker.url,
        context: broker.contextUrl,
        onInvalid: (item) => console.warn(`Aquila skipped a ${item.kind} the broker sent: ${item.reason}`, item.value),
        onLiveError: (error) => console.warn("Aquila could not refresh live data", error),
    });
