/**
 * DISTRIBUTED TRACING AND OBSERVABILITY
 * OpenTelemetry integration for microservices observability
 */

import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { trace, Span, Tracer } from '@opentelemetry/api';
import { logger } from './logger';

// ─── TRACING CONFIGURATION ───────────────────────────────────────────────────

export class TracingService {
  private static instance: TracingService;
  private tracer: Tracer;
  private provider!: NodeTracerProvider;

  private constructor() {
    this.initializeTracing();
    this.tracer = trace.getTracer('hers365-microservices', '1.0.0');
  }

  static getInstance(): TracingService {
    if (!TracingService.instance) {
      TracingService.instance = new TracingService();
    }
    return TracingService.instance;
  }

  private initializeTracing(): void {
    // Create tracer provider
    this.provider = new NodeTracerProvider();

    // Configure Jaeger exporter
    const jaegerExporter = new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      username: process.env.JAEGER_USERNAME,
      password: process.env.JAEGER_PASSWORD
    });

    // Add span processor
    this.provider.addSpanProcessor(new SimpleSpanProcessor(jaegerExporter as any) as any);

    // Register instrumentations
    registerInstrumentations({
      instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation({
          ignoreLayers: ['/health', '/ready', '/metrics']
        }),
        new PgInstrumentation({
          enhancedDatabaseReporting: true
        }),
        new RedisInstrumentation({
          dbStatementSerializer: (cmdName, cmdArgs) => {
            // Sanitize Redis commands for security
            return `${cmdName} ${cmdArgs.map(arg =>
              typeof arg === 'string' && arg.length > 100
                ? arg.substring(0, 100) + '...'
                : arg
            ).join(' ')}`;
          }
        })
      ]
    });

    // Register the provider
    this.provider.register();

    logger.info('OpenTelemetry tracing initialized');
  }

  getTracer(): Tracer {
    return this.tracer;
  }

  /**
   * Create a new span for a service operation
   */
  startSpan(name: string, options?: {
    parentSpan?: Span;
    attributes?: Record<string, string | number | boolean>;
  }): Span {
    const span = this.tracer.startSpan(name, {
      attributes: {
        'service.name': 'hers365-microservices',
        ...options?.attributes
      }
    });

    return span;
  }

  /**
   * Wrap an async operation with tracing
   */
  async traceAsync<T>(
    name: string,
    operation: (span: Span) => Promise<T>,
    options?: {
      attributes?: Record<string, string | number | boolean>;
    }
  ): Promise<T> {
    const span = this.startSpan(name, options);
    try {
      const result = await operation(span);
      span.setStatus({ code: 0 }); // OK
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 1, message: (error as Error).message }); // ERROR
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Add event to current span
   */
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  /**
   * Set attributes on current span
   */
  setAttributes(attributes: Record<string, string | number | boolean>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  /**
   * Get current span context for correlation
   */
  getCurrentSpan(): Span | undefined {
    return trace.getActiveSpan() || undefined;
  }

  async shutdown(): Promise<void> {
    await this.provider.shutdown();
    logger.info('Tracing service shut down');
  }
}

// ─── METRICS AND MONITORING ──────────────────────────────────────────────────

export class MetricsService {
  private static instance: MetricsService;
  private metrics: Map<string, any> = new Map();

  private constructor() {
    this.initializeMetrics();
    this.startPeriodicReporting();
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  private initializeMetrics(): void {
    // Service health metrics
    this.metrics.set('service_uptime', { value: 0, type: 'counter' });
    this.metrics.set('service_requests_total', { value: 0, type: 'counter', labels: {} });
    this.metrics.set('service_requests_duration', { value: [], type: 'histogram' });

    // Event processing metrics
    this.metrics.set('events_published_total', { value: 0, type: 'counter' });
    this.metrics.set('events_consumed_total', { value: 0, type: 'counter' });
    this.metrics.set('events_processing_duration', { value: [], type: 'histogram' });

    // Database metrics
    this.metrics.set('db_connections_active', { value: 0, type: 'gauge' });
    this.metrics.set('db_query_duration', { value: [], type: 'histogram' });

    // Service Bus metrics
    this.metrics.set('servicebus_messages_sent', { value: 0, type: 'counter' });
    this.metrics.set('servicebus_messages_received', { value: 0, type: 'counter' });
    this.metrics.set('servicebus_dead_letters', { value: 0, type: 'counter' });
  }

  /**
   * Record a metric
   */
  recordMetric(
    name: string,
    value: number,
    type: 'counter' | 'gauge' | 'histogram',
    labels?: Record<string, string>
  ): void {
    const metric = this.metrics.get(name);
    if (!metric) {
      logger.warn(`Unknown metric: ${name}`);
      return;
    }

    if (type === 'counter') {
      metric.value += value;
    } else if (type === 'gauge') {
      metric.value = value;
    } else if (type === 'histogram') {
      metric.value.push({ value, timestamp: Date.now(), labels });
      // Keep only last 1000 measurements
      if (metric.value.length > 1000) {
        metric.value.shift();
      }
    }

    // Update labels if provided
    if (labels && metric.labels) {
      Object.assign(metric.labels, labels);
    }
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: Record<string, string>): void {
    this.recordMetric(name, 1, 'counter', labels);
  }

  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric(name, value, 'gauge', labels);
  }

  /**
   * Record histogram value
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric(name, value, 'histogram', labels);
  }

  /**
   * Get all metrics
   */
  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [name, metric] of this.metrics.entries()) {
      if (metric.type === 'histogram') {
        const values = metric.value;
        const sorted = values.sort((a: any, b: any) => a.value - b.value);

        result[name] = {
          count: sorted.length,
          sum: sorted.reduce((sum: number, item: any) => sum + item.value, 0),
          avg: sorted.length > 0 ? sorted.reduce((sum: number, item: any) => sum + item.value, 0) / sorted.length : 0,
          p50: sorted[Math.floor(sorted.length * 0.5)]?.value || 0,
          p95: sorted[Math.floor(sorted.length * 0.95)]?.value || 0,
          p99: sorted[Math.floor(sorted.length * 0.99)]?.value || 0,
          max: sorted[sorted.length - 1]?.value || 0,
          min: sorted[0]?.value || 0
        };
      } else {
        result[name] = {
          value: metric.value,
          type: metric.type,
          labels: metric.labels
        };
      }
    }

    return result;
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    let output = '';

    for (const [name, metric] of this.metrics.entries()) {
      if (metric.type === 'histogram') {
        const hist = metric.value;
        const buckets = [0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0];

        output += `# HELP ${name} Histogram of ${name}\n`;
        output += `# TYPE ${name} histogram\n`;

        for (const bucket of buckets) {
          const count = hist.filter((h: any) => h.value <= bucket).length;
          output += `${name}_bucket{le="${bucket}"} ${count}\n`;
        }
        output += `${name}_bucket{le="+Inf"} ${hist.length}\n`;
        output += `${name}_count ${hist.length}\n`;
        output += `${name}_sum ${hist.reduce((sum: number, h: any) => sum + h.value, 0)}\n`;
      } else {
        output += `# HELP ${name} ${metric.type} of ${name}\n`;
        output += `# TYPE ${name} ${metric.type}\n`;
        output += `${name} ${metric.value}\n`;
      }
      output += '\n';
    }

    return output;
  }

  private startPeriodicReporting(): void {
    // Report metrics every 30 seconds
    setInterval(() => {
      const metrics = this.getMetrics();

      // Log key metrics
      logger.info('Metrics update', {
        service_requests_total: metrics.service_requests_total?.value || 0,
        events_published_total: metrics.events_published_total?.value || 0,
        events_consumed_total: metrics.events_consumed_total?.value || 0,
        db_connections_active: metrics.db_connections_active?.value || 0
      });

      // Reset counters every 5 minutes to prevent memory bloat
      const resetInterval = 5 * 60 * 1000; // 5 minutes
      if (Date.now() % resetInterval < 30000) { // Within 30 seconds of 5-minute mark
        this.resetCounters();
      }
    }, 30000);
  }

  private resetCounters(): void {
    for (const [name, metric] of this.metrics.entries()) {
      if (metric.type === 'counter') {
        metric.value = 0;
      }
    }
    logger.info('Metrics counters reset');
  }
}

// ─── CORRELATION AND CONTEXT MANAGEMENT ──────────────────────────────────────

export class CorrelationService {
  private static instance: CorrelationService;

  private constructor() {}

  static getInstance(): CorrelationService {
    if (!CorrelationService.instance) {
      CorrelationService.instance = new CorrelationService();
    }
    return CorrelationService.instance;
  }

  /**
   * Generate a correlation ID for request tracing
   */
  generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract correlation ID from request headers
   */
  extractCorrelationId(headers: any): string {
    return headers['x-correlation-id'] ||
           headers['x-request-id'] ||
           headers['correlation-id'] ||
           this.generateCorrelationId();
  }

  /**
   * Create distributed tracing context
   */
  createTracingContext(correlationId: string, serviceName: string, operation: string): any {
    return {
      correlationId,
      serviceName,
      operation,
      startTime: Date.now(),
      traceId: this.generateTraceId(),
      spanId: this.generateSpanId()
    };
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private generateSpanId(): string {
    return `span_${Math.random().toString(36).substr(2, 16)}`;
  }
}

// ─── EXPORT SERVICES ──────────────────────────────────────────────────────────

export const tracing = TracingService.getInstance();
export const metrics = MetricsService.getInstance();
export const correlation = CorrelationService.getInstance();