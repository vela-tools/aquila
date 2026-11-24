import { useState } from "react";
import { Accordion, Box, Button, Group, Modal, SimpleGrid, Stack, Tabs } from "@mantine/core";
import { PlusIcon } from "@phosphor-icons/react";
import { AppFrame, Masthead, ToolBar } from "@vela-tools/ui";
import {
    BrokerConnector,
    EntityPicker,
    Ngsi,
    sameTypeRef,
    useEntityTypes,
    useSubscriptions,
    type Subscription,
    type SubscriptionDraft,
} from "@vela-tools/ngsi";
import { StatBox } from "./StatBox/StatBox";

export function AppShellAquila() {
    const [showAddNew, setShowAddNew] = useState(false);
    const [editorDefaults, setEditorDefaults] = useState<Partial<SubscriptionDraft>>({});
    const [editorKey, setEditorKey] = useState(0);
    const [editing, setEditing] = useState<Subscription | null>(null);

    const subscriptions = useSubscriptions().data ?? [];
    const knownTypes = useEntityTypes().data ?? [];
    const activeCount = subscriptions.filter((s) => s.status === "active").length;
    const totalTimesSent = subscriptions.reduce((sum, s) => sum + (s.delivery?.timesSent ?? 0), 0);

    function openEditor(type?: string, attribute?: string) {
        const ref = type ? (knownTypes.find((info) => sameTypeRef(info.type, { type }))?.type ?? { type }) : undefined;
        setEditorDefaults({
            ...(ref ? { types: [ref] } : {}),
            ...(attribute ? { watchedAttributes: [attribute] } : {}),
        });
        setEditing(null);
        setEditorKey((k) => k + 1);
        setShowAddNew(true);
    }

    function openEdit(subscription: Subscription) {
        setEditing(subscription);
        setShowAddNew(true);
    }

    const closeEditor = () => setShowAddNew(false);

    return (
        <AppFrame
            masthead={
                <Masthead
                    icon={<img src="/favicon.svg" alt="" />}
                    appName="Aquila"
                    edition="FOSS"
                    version={__APP_VERSION__}
                />
            }
            toolbar={
                <ToolBar>
                    <BrokerConnector style={{ flexShrink: 0 }} />
                </ToolBar>
            }
        >
            <Box style={{ flex: 1, overflowY: "auto" }} p="md">
                <Stack gap="md">
                    <Group justify="space-between" align="flex-end">
                        <Group gap="md">
                            <StatBox label="Subscriptions" value={subscriptions.length} />
                            <StatBox label="Active" value={activeCount} color="#0E8A7C" />
                            <StatBox label="Notifications sent" value={totalTimesSent} color="#C2452D" />
                        </Group>
                        <Button leftSection={<PlusIcon size={14} />} onClick={() => openEditor()}>
                            Add subscription
                        </Button>
                    </Group>

                    <Tabs defaultValue="subscriptions">
                        <Tabs.List>
                            <Tabs.Tab value="subscriptions">Subscriptions</Tabs.Tab>
                            {/* <Tabs.Tab value="history">Alert history</Tabs.Tab> */}
                            <Tabs.Tab value="entities">Entity explorer</Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="subscriptions" pt="md">
                            <Ngsi.SubscriptionList.Root selectable={false} onEdit={openEdit}>
                                <Stack gap="xs">
                                    <Ngsi.SubscriptionList.Error />
                                    <Ngsi.SubscriptionList.Table actions={["edit", "toggle", "remove"]} />
                                </Stack>
                            </Ngsi.SubscriptionList.Root>
                        </Tabs.Panel>

                        {/* <Tabs.Panel value="history" pt="md">
                            <Ngsi.NotificationList.Root>
                                <Stack gap="xs">
                                    <Ngsi.NotificationList.Error />
                                    <Ngsi.NotificationList.Table />
                                </Stack>
                            </Ngsi.NotificationList.Root>
                        </Tabs.Panel> */}

                        <Tabs.Panel value="entities" pt="md">
                            <EntityPicker onPick={(entity, attribute) => openEditor(entity.type, attribute)} />
                        </Tabs.Panel>
                    </Tabs>
                </Stack>
            </Box>

            <Modal
                opened={showAddNew}
                onClose={closeEditor}
                title={editing ? "Edit subscription" : "New subscription"}
                size="xl"
            >
                <Ngsi.SubscriptionEditor.Root
                    key={editing?.id ?? `new-${editorKey}`}
                    defaultValues={editorDefaults}
                    subscription={editing ?? undefined}
                    submitLabel={editing ? "Save changes" : "Create subscription"}
                    onCreated={closeEditor}
                    onUpdated={closeEditor}
                    onCancel={closeEditor}
                >
                    <Ngsi.SubscriptionEditor.Form>
                        <Stack gap="sm">
                            <Ngsi.SubscriptionEditor.Name />
                            <Ngsi.SubscriptionEditor.Description />
                            <Ngsi.SubscriptionEditor.Endpoint />
                            <Ngsi.QueryBuilder.EntityTypes />
                            <Ngsi.QueryBuilder.Conditions>
                                <Ngsi.QueryBuilder.Preview />
                            </Ngsi.QueryBuilder.Conditions>
                            <Ngsi.QueryBuilder.GeoRegion />
                            <Ngsi.SubscriptionEditor.NotifyWhen />
                            <Ngsi.SubscriptionEditor.WatchedAttributes />
                            <SimpleGrid cols={{ base: 1, sm: 3 }}>
                                <Ngsi.SubscriptionEditor.ExpiresAt />
                                <Ngsi.SubscriptionEditor.ScopeQuery />
                                <Ngsi.SubscriptionEditor.Lang />
                            </SimpleGrid>
                            <Ngsi.SubscriptionEditor.Format />
                            <Ngsi.SubscriptionEditor.Payload />
                            <Accordion variant="contained">
                                <Accordion.Item value="advanced">
                                    <Accordion.Control>Advanced</Accordion.Control>
                                    <Accordion.Panel>
                                        <Ngsi.SubscriptionEditor.Advanced />
                                    </Accordion.Panel>
                                </Accordion.Item>
                            </Accordion>
                            <Ngsi.SubscriptionEditor.Error />
                            <Ngsi.SubscriptionEditor.Actions />
                        </Stack>
                    </Ngsi.SubscriptionEditor.Form>
                </Ngsi.SubscriptionEditor.Root>
            </Modal>
        </AppFrame>
    );
}
