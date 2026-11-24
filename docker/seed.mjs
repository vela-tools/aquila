// Puts demo entities and subscriptions on the Scorpio of the local stack, then changes entities so the
// broker sends notifications. Aquila then lists subscriptions that are delivered, paused, failing and
// about to expire. Running it again replaces the demo subscriptions.
//
// Usage: npm run seed [-- <broker URL>]. The default is the local stack at SCORPIO_PORT, or 9090.
const broker = process.argv[2] ?? `http://localhost:${process.env.SCORPIO_PORT ?? "9090"}/ngsi-ld/v1`;
// Scorpio calls the receiver from inside the Compose network, not through the published port.
const receiver = "http://receiver:8099/notify";

async function call(method, path, body, ok = [200, 201, 204, 207]) {
    const res = await fetch(`${broker}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body && JSON.stringify(body),
    });
    if (!ok.includes(res.status)) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
}

const point = (lon, lat) => ({ type: "GeoProperty", value: { type: "Point", coordinates: [lon, lat] } });
const prop = (value, unitCode) => ({ type: "Property", value, ...(unitCode && { unitCode }) });

const entities = [
    {
        id: "urn:ngsi-ld:AirQualityObserved:center",
        type: "AirQualityObserved",
        pm10: prop(32, "GQ"),
        no2: prop(28, "GQ"),
        location: point(14.5058, 46.0514),
    },
    {
        id: "urn:ngsi-ld:AirQualityObserved:bezigrad",
        type: "AirQualityObserved",
        pm10: prop(41, "GQ"),
        no2: prop(35, "GQ"),
        location: point(14.5124, 46.0654),
    },
    {
        id: "urn:ngsi-ld:WaterQualityObserved:river-1",
        type: "WaterQualityObserved",
        pH: prop(7.4),
        temperature: prop(12.1, "CEL"),
        location: point(14.5103, 46.0481),
    },
    {
        id: "urn:ngsi-ld:NoiseLevelObserved:market",
        type: "NoiseLevelObserved",
        LAeq: prop(64, "2N"),
        location: point(14.5085, 46.0511),
    },
];

const subscription = (id, name, description, type, q, watched, uri, extra = {}) => ({
    id: `urn:ngsi-ld:Subscription:${id}`,
    type: "Subscription",
    subscriptionName: name,
    description,
    entities: [{ type }],
    watchedAttributes: watched,
    q,
    notification: { endpoint: { uri, accept: "application/json" }, format: "keyValues" },
    ...extra,
});

const inDays = (days) => new Date(Date.now() + days * 86_400_000).toISOString();

const subscriptions = [
    subscription(
        "pm10-high",
        "PM10 over 50",
        "Particulate matter above the daily limit value",
        "AirQualityObserved",
        "pm10>50",
        ["pm10"],
        `${receiver}/pm10`,
        { throttling: 60 },
    ),
    subscription(
        "no2-high",
        "NO2 over 40",
        "Nitrogen dioxide above the annual limit value",
        "AirQualityObserved",
        "no2>40",
        ["no2"],
        `${receiver}/no2`,
        { isActive: false },
    ),
    subscription(
        "river-ph",
        "River pH out of range",
        "Water quality alarm for the river stations in the city centre",
        "WaterQualityObserved",
        "pH<6.5|pH>8.5",
        ["pH"],
        `${receiver}/river`,
        { geoQ: { geometry: "Point", coordinates: [14.5058, 46.0514], georel: "near;maxDistance==3000" } },
    ),
    subscription(
        "river-temperature",
        "River temperature over 20 °C",
        "Summer watch for low oxygen in the river",
        "WaterQualityObserved",
        "temperature>20",
        ["temperature"],
        `${receiver}/temperature`,
        { expiresAt: inDays(120) },
    ),
    // The receiver answers 500 to ?status=500, so this one shows a failing delivery.
    subscription(
        "market-noise",
        "Market noise over 70 dB",
        "Night-time noise at the central market",
        "NoiseLevelObserved",
        "LAeq>70",
        ["LAeq"],
        `${receiver}/noise?status=500`,
    ),
];

await call("POST", "/entityOperations/upsert", entities);
for (const s of subscriptions) {
    await call("DELETE", `/subscriptions/${encodeURIComponent(s.id)}`, undefined, [204, 404]);
    await call("POST", "/subscriptions", s);
}

// The pauses keep the changes apart, so each one is notified on its own.
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const patch = (id, attrs) => call("PATCH", `/entities/${encodeURIComponent(id)}/attrs`, attrs);
await patch("urn:ngsi-ld:AirQualityObserved:bezigrad", { pm10: prop(64, "GQ") });
await pause(1500);
await patch("urn:ngsi-ld:AirQualityObserved:center", { pm10: prop(57, "GQ"), no2: prop(46, "GQ") });
await pause(1500);
await patch("urn:ngsi-ld:WaterQualityObserved:river-1", { pH: prop(8.9) });
await pause(1500);
await patch("urn:ngsi-ld:NoiseLevelObserved:market", { LAeq: prop(74, "2N") });
await pause(1500);
await patch("urn:ngsi-ld:NoiseLevelObserved:market", { LAeq: prop(77, "2N") });
await pause(4000);
console.log(`Seeded ${entities.length} entities and ${subscriptions.length} subscriptions on ${broker}.`);
