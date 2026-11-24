import type { CSSProperties } from "react";
import { Box, Text } from "@mantine/core";
import { BaseKpi } from "@vela-tools/ui";
import classes from "./StatBox.module.css";

interface StatBoxProps {
    label: string;
    value: string | number;
    color?: string;
}

export function StatBox({ label, value, color = "#13497B" }: StatBoxProps) {
    return (
        <Box style={{ "--stat-color": color, minWidth: 150 } as CSSProperties}>
            <BaseKpi className={classes.kpi}>
                <Text className={classes.label}>{label}</Text>
                <Text className={classes.value}>{value}</Text>
            </BaseKpi>
        </Box>
    );
}
