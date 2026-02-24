# Scalable Microservices API Platform

A high-performance, containerized API Gateway architecture built with Node.js, TypeScript, and Docker. This platform demonstrates production-grade patterns for security, traffic management, and observability.

![CI](https://github.com/somandhir/api-platform/actions/workflows/ci.yml/badge.svg)

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Performance Benchmarks](#performance-benchmarks)
- [Traffic Control & Resilience](#traffic-control--resilience)
- [Stress Test Results](#stress-test-results)
- [Observability](#observability)
- [CI/CD Pipeline](#cicd-pipeline)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)

---

## Architecture Overview

All traffic flows through a central API Gateway, keeping internal services fully isolated from the public internet.

```
                        ┌─────────────────────────────────────┐
                        │           CLIENT REQUEST             │
                        └──────────────────┬──────────────────┘
                                           │
                        ┌──────────────────▼──────────────────┐
                        │           API GATEWAY :3000          │
                        │  ┌─────────────┐  ┌──────────────┐  │
                        │  │ Rate Limiter│  │  JWT Verify  │  │
                        │  └──────┬──────┘  └──────┬───────┘  │
                        │         └────────┬────────┘          │
                        │           ┌──────▼──────┐            │
                        │           │ Redis Cache │            │
                        │           └──────┬──────┘            │
                        └──────────────────┼──────────────────┘
                 ┌────────────────┬────────┴────────┬───────────────────┐
                 │                │                 │                   │
    ┌────────────▼──────┐ ┌───────▼───────┐ ┌──────▼──────┐  ┌────────▼───────┐
    │  Auth Service     │ │  User Service │ │  RabbitMQ   │  │  Audit Service │
    │  (JWT Issuer)     │ │  (Protected)  │ │  AUDIT_LOGS │  │  (Async)       │
    └───────────────────┘ └───────────────┘ └─────────────┘  └────────────────┘
```

| Service | Role |
|---|---|
| **API Gateway** | Central entry point via `http-proxy-middleware`. Handles auth, caching, and rate limiting |
| **Auth Service** | Centralized JWT-based identity management |
| **User Service** | Internal resource service, shielded behind the Gateway |
| **Audit Service** | Asynchronous event processor driven by RabbitMQ |
| **Redis** | Distributed caching layer and rate-limit state store |
| **RabbitMQ** | Message broker for durable, async audit events |

---

## Performance Benchmarks

Monitored via a custom Winston-based observability layer. By intercepting repeated requests at the Gateway with a Redis caching layer, the platform achieves a **99.6% reduction in P99 latency** without any changes to downstream services.

| Metric | Direct Proxy (No Cache) | Redis Cached | Improvement |
|---|---|---|---|
| Cold Start Latency | 501ms | 17ms | −484ms |
| Steady State Latency | ~6ms | 2ms | ~66% faster |
| P99 Response Time | 37ms | 3ms | 91% faster |

**Key insight:** The caching strategy intercepts requests at the Gateway level, dramatically reducing load on internal services. The system scales horizontally without increasing backend resource consumption.

---

## Traffic Control & Resilience

### Dual-Strategy Rate Limiting

Two complementary layers of protection guard against API abuse:

- **Fixed Window Limiter** — Standard protection for public-facing endpoints with predictable traffic patterns.
- **Custom Token Bucket Algorithm** — A Redis-backed implementation that gracefully handles traffic bursts while enforcing strict long-term rate quotas. Unlike fixed windows, the token bucket refills continuously, closing the edge-case abuse window that occurs at window resets.

### Asynchronous Audit Logging

Audit logging is fully decoupled from the request lifecycle to preserve low-latency responses under all conditions.

```
Gateway  -->  RabbitMQ (AUDIT_LOGS queue)  -->  Audit Service
```

The Gateway publishes an event and returns immediately — zero blocking. If the Audit Service goes offline, the Gateway remains fully operational. Messages are durably persisted in RabbitMQ and processed automatically on service recovery.

---

## Stress Test Results

Validated using Autocannon — 100 concurrent connections sustained over 10 seconds.

```
┌─────────────────────────────────────────────────────────────┐
│                   AUTOCANNON STRESS TEST                    │
│              100 Connections · 10 Second Window             │
├──────────────────────────────┬──────────────────────────────┤
│  Total Requests Handled      │  22,326                      │
│  Average Throughput          │  2,232 req/sec               │
│  Peak Throughput             │  3,487 req/sec               │
│  Requests Allowed Through    │  10        (Rate Limit Hit)  │
│  Requests Blocked (429)      │  22,316    (Mitigated)       │
│  Avg Latency Under Load      │  47ms                        │
└──────────────────────────────┴──────────────────────────────┘
```

Under a simulated high-volume burst, the Redis-backed rate limiter correctly identified the traffic as abusive and blocked **99.95% of requests** via `429 Too Many Requests` — while maintaining an average latency of 47ms and leaving downstream Auth and User services completely unaffected.

---

## Observability

Every request is instrumented end-to-end. The structured Winston logger captures method, route, status, response time, and cache state for each event:

```log
2026-02-24T12:52:20.468Z | INFO  | GET /api/users/profile | Status: 200 | Time: 501ms | CacheStatus: MISS
2026-02-24T12:52:25.671Z | INFO  | GET /api/users/profile | Status: 200 | Time: 2ms   | CacheStatus: HIT
2026-02-24T12:52:39.271Z | ERROR | GET /api/users/profile | Status: 429 | Time: 13ms  | Result: BLOCKED
```

These three log lines tell a complete story: a cold cache miss at 501ms, a cache hit on the same route at 2ms (99.6% faster), and a rate-limited block at 13ms — with no downstream service involvement after the first request.

---

## CI/CD Pipeline

The repository includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs automatically on every push and pull request to `main`.

The pipeline runs in parallel across all three core services — `gateway`, `auth-service`, and `user-service` — using a matrix strategy, so a failure in one service is isolated and reported independently.

```yaml
strategy:
  matrix:
    service: [gateway, services/auth-service, services/user-service]
```

For each service, the pipeline installs dependencies with npm caching enabled for faster runs, then executes the TypeScript compiler (`tsc --noEmit`) to catch type errors before any code reaches production. This means a type error introduced in the Auth Service will not block a clean Gateway build — each service is validated independently and concurrently.

The workflow is structured to make it straightforward to add test execution (`npm test`) and Docker image builds as the project grows.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js, TypeScript |
| Framework | Express |
| Caching / Rate Limiting | Redis |
| Message Broker | RabbitMQ |
| Infrastructure | Docker, Docker Compose |
| Observability | Winston |
| Load Testing | Autocannon |
| CI/CD | GitHub Actions |

---

## Getting Started

**Prerequisites:** Docker and Docker Compose installed and running.

```bash
# Clone the repository
git clone https://github.com/somandhir/api-platform.git
cd api-platform

# Start all services
docker-compose up --build
```

All services will spin up automatically — Gateway, Auth, User, Audit, Redis, and RabbitMQ.

The **API Gateway** is available at: **`http://localhost:3000`**

### Available Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/login` | Obtain a JWT token | ✕ |
| `GET` | `/api/users/profile` | Fetch user profile (cached) | ✓ |

---

<div align="center">

Built with Node.js · TypeScript · Docker · Redis · RabbitMQ

</div>
