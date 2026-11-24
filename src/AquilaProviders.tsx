import { useState, type ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NgsiBrokersProvider, type NgsiBrokersProviderProps } from "@vela-tools/ngsi";
import { theme } from "@vela-tools/ui";
import { BROKER_STORAGE_KEY, createAdapters as createBrokerAdapters, defaultBrokers } from "./brokers";
import type { AquilaConfig } from "./config";

export type AquilaProvidersProps = {
    config: AquilaConfig;
    createAdapters?: NgsiBrokersProviderProps["createAdapters"];
    queryClient?: QueryClient;
    children: ReactNode;
};

export function AquilaProviders({
    config,
    createAdapters = createBrokerAdapters,
    queryClient,
    children,
}: AquilaProvidersProps) {
    const [client] = useState(() => queryClient ?? new QueryClient());
    return (
        <MantineProvider theme={theme}>
            <QueryClientProvider client={client}>
                <NgsiBrokersProvider
                    defaultBrokers={defaultBrokers(config)}
                    storageKey={BROKER_STORAGE_KEY}
                    createAdapters={createAdapters}
                >
                    {children}
                </NgsiBrokersProvider>
            </QueryClientProvider>
        </MantineProvider>
    );
}
