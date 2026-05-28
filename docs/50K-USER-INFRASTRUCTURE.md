# HERS365 50,000 User Infrastructure Requirements

## Executive Summary
This document outlines the infrastructure requirements to support 50,000 concurrent user logins on the HERS365 platform.

## Current Scalability Improvements Implemented

### 1. Rate Limiting
- **Status**: ✅ Implemented
- **Configuration**: 50 requests/minute per IP
- **Protection**: Prevents brute force attacks and DoS

### 2. Optimized Bcrypt
- **Status**: ✅ Implemented
- **Login cost factor**: 8 (vs 12 for registration)
- **Performance gain**: ~4x faster password verification
- **Backward compatible**: Falls back to cost 12 for legacy hashes

### 3. Database Connection Pooling
- **Status**: ✅ Implemented
- **Max connections**: 100
- **Min idle**: 10
- **Timeout**: 10s acquire, 30s idle

### 4. Token Caching
- **Status**: ✅ Implemented (in-memory)
- **Cache size**: 10,000 tokens
- **TTL**: 5 minutes
- **Production note**: Requires Redis for full 50K scale

### 5. Health Check Endpoint
- **Status**: ✅ Implemented
- **Endpoint**: `GET /api/health`
- **Monitors**: Database, memory, uptime

---

## Production Infrastructure Requirements

### 1. Database (PostgreSQL)
| Resource | Specification |
|----------|---------------|
| Instance | AWS RDS db.r6g.xlarge or equivalent |
| vCPUs | 4 |
| Memory | 32 GB |
| Storage | 500 GB SSD (gp3) |
| IOPS | 3000 |
| Replicas | 1 Read Replica |

### 2. Application Servers
| Resource | Specification |
|----------|---------------|
| Type | AWS ECS Fargate or EC2 Auto Scaling |
| Min Instances | 3 |
| Max Instances | 20 |
| vCPUs | 2 vCPU |
| Memory | 4 GB |
| Scaling | CPU > 70% for 2 minutes |

### 3. Redis Cache (Required for Full 50K Scale)
| Resource | Specification |
|----------|---------------|
| Type | AWS ElastiCache or Redis Cloud |
| Node Type | cache.r6g.large |
| Replicas | 2 |
| Shards | 2 |
| Max Connections | 10,000 |

### 4. Load Balancer
| Resource | Specification |
|----------|---------------|
| Type | AWS ALB |
| SSL Certificates | Managed |
| Health Checks | /api/health |

### 5. CDN (Static Assets)
| Resource | Specification |
|----------|---------------|
| Type | CloudFront |
| Origins | S3 bucket |
| Cache Policy | 1 year for assets |

---

## Expected Performance Metrics

### Login Throughput
| Metric | Target |
|--------|--------|
| Concurrent Logins | 50,000 |
| Requests/Second | 500+ |
| Avg Response Time | < 200ms |
| P99 Response Time | < 500ms |
| Success Rate | > 99.9% |

### Database Metrics
| Metric | Target |
|--------|--------|
| Connections Used | 80-100 |
| Query Latency P99 | < 50ms |
| CPU Utilization | < 70% |

---

## Environment Variables Required

```bash
# Database
DATABASE_URL=postgres://user:pass@host:5432/hers365
DB_POOL_MAX=100
DB_POOL_MIN=10

# Redis (for production)
REDIS_URL=redis://host:6379

# Auth
JWT_SECRET=your-secure-secret-min-32-chars
JWT_EXPIRES=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=50

# App
NODE_ENV=production
PORT=5000
```

---

## Deployment Checklist

- [ ] Provision PostgreSQL with connection pooling
- [ ] Set up Redis cluster for session/tokens
- [ ] Configure Auto Scaling Group
- [ ] Set up CloudFront CDN
- [ ] Configure health checks
- [ ] Set up monitoring (CloudWatch/Datadog)
- [ ] Configure SSL certificates
- [ ] Test load with 50K concurrent users
- [ ] Set up alerting thresholds
- [ ] Document runbook for scaling events

---

## Monitoring & Alerts

### Key Metrics to Monitor
1. Login request rate
2. Auth latency (P50, P95, P99)
3. Database connection pool usage
4. Redis memory usage
5. Error rate by endpoint
6. CPU/Memory utilization

### Alert Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| Login Latency P99 | > 300ms | > 500ms |
| DB Connections | > 70% | > 90% |
| CPU Utilization | > 60% | > 80% |
| Error Rate | > 1% | > 5% |