# Vortex API Gateway - Product Requirements Document

> **Template Type**: Advanced Feature Spec  
> **Version**: 1.1  
> **Date**: 2026-01-20  
> **Status**: Refined Sample

---

## 1. Executive Summary
**Vortex API Gateway** is a cloud-native, high-performance gateway designed to manage and secure microservices at scale. Built on the Envoy proxy engine, Vortex provides a centralized entry point for authentication, rate limiting, request transformation, and observability. It simplifies the developer experience by offloading cross-cutting concerns from individual services.

## 2. Problem Statement
Microservice management is plagued by:
1. **Security Fragmentation**: Each service implementing its own auth/JWT validation leads to security holes.
2. **Resource Exhaustion**: Lack of a global rate-limiting layer makes the system vulnerable to DDoS and noisy neighbors.
3. **Observability Blind Spots**: Hard to trace a single request across multiple services without a unified logging gateway.

## 3. Goals & Success Metrics
- **Performance**: < 10ms overhead for 99% of requests passing through the gateway.
- **Security**: 100% of internal services hidden behind the gateway with mandatory OIDC/JWT validation.
- **Reliability**: Zero-downtime configuration updates using hot-reloading sidecars.
- **Scalability**: Support for 50,000 requests per second (RPS) on a standard 3-node cluster.

## 4. User Personas
- **The Platform Engineer (SRE Sam)**: Needs a declarative way (YAML/Custom Resource Definitions) to manage routing and rate limits.
- **The Backend Dev (Maya)**: Wants to focus on business logic without worrying about TLS termination or CORS headers.
- **The Security Auditor (Dan)**: Requires a single point to monitor all incoming traffic and auth failures.

## 5. User Stories
- As an engineer, I want to route traffic to different service versions (Canary/Blue-Green) with a single config change.
- As a developer, I want my service to automatically receive validated user headers (X-User-ID) from the gateway.
- As an SRE, I want to apply global rate limits across all public APIs to prevent service abuse.

## 6. Functional Requirements
### 6.1. Dynamic Routing & Load Balancing
- Path-based and host-based routing with wildcard support.
- Support for multiple load balancing algorithms: Round Robin, Least Request, and Maglev.
- Service Discovery integration (Consul, Kubernetes, or static).

### 6.2. Identity & Access Management (IAM)
- Built-in JWT/JWKS validation and OIDC flow support.
- Role-Based Access Control (RBAC) at the gateway level.
- Mutual TLS (mTLS) for secure service-to-service communication.

### 6.3. Traffic Control & Resilience
- Global and local rate limiting (Leaky Bucket / Token Bucket).
- Circuit breaking and retries with exponential backoff.
- Header manipulation (addition, removal, and transformation).

## 7. Technical Requirements
### 7.1. Core Engine (Envoy / C++)
- Leverage Envoy's L4/L7 proxying capabilities for low-level performance.
- WebAssembly (Wasm) filter support for custom logic injection.

### 7.2. Control Plane (Go / gRPC)
- Dedicated Go-based control plane for managing cluster configuration.
- gRPC xDS API for real-time config delivery to Envoy instances.

## 8. Data Model
| Entity | Key Attributes | Relationships |
| :--- | :--- | :--- |
| Cluster | id, name, lb_policy, endpoints | 1:N with Routes |
| Route | id, prefix, cluster_id, retry_policy | Linked to Cluster |
| Policy | id, type (RateLimit/Auth), config | N:M with Routes |
| Trace | id, span_id, duration, status | Associated with Request |

## 9. API Specification (Selected Endpoints)
- `POST /v1/routes`: Create or update a routing rule.
- `GET /v1/status`: Health check for all upstream clusters.
- `POST /v1/policies/apply`: Attach a security or traffic policy to a specific route.

## 14. Implementation Tasks
- [ ] **Phase 1**: Control Plane Setup & Envoy Configuration (MUST).
- [ ] **Phase 2**: JWT Validation & RBAC Filter Implementation (MUST).
- [ ] **Phase 3**: Distributed Rate Limiting with Redis (SHOULD).
- [ ] **Phase 4**: Wasm filter support for custom transformations (COULD).
