import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const otlpEndpoint =
  Bun.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";

if (Bun.env.OTEL_DEBUG === "true") {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

const resource = new Resource({
  [ATTR_SERVICE_NAME]: "ticketmaster-api",
  [ATTR_SERVICE_VERSION]: "0.0.1",
  environment: Bun.env.NODE_ENV ?? "development",
});

const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` }),
    exportIntervalMillis: 15000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
  ],
});

export function startTelemetry(): void {
  sdk.start();
  console.log(`OpenTelemetry started -> ${otlpEndpoint}`);
}

export async function shutdownTelemetry(): Promise<void> {
  await sdk.shutdown();
}
