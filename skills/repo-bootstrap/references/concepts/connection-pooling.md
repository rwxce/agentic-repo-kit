# Connection pooling

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

Every database connection costs server memory, and serverless or autoscaled apps open one per instance or per request. Under load the database hits its connection limit and every request fails at once.

## Principle

Share a bounded pool of connections per process, and put a pooler in front of the database when the number of processes is unbounded. Size the pool from the database limit divided by the number of instances, per workload.

## When it applies

- Relational databases accessed from serverless functions, autoscaled containers or many workers.

## When it doesn't

- Databases or backends that do not expose connections to the app (HTTP-based data APIs, Convex, Firestore).
- A single long-lived process with low concurrency.

## Typical mistakes

- A pool per request in serverless code.
- Pool size times instance count above the database `max_connections`.
- Transaction-mode poolers combined with session features (prepared statements, `SET`, advisory locks) without checking compatibility.
- One pool for fast queries and slow reports, so reports starve the API.

## The check that verifies it

A load test or staging soak that watches active connections against the limit; an alert on connection saturation; config review of pool size per deployment.

## Canonical source

- [PgBouncer features (pooling modes)](https://www.pgbouncer.org/features.html)

## Variants per stack

- **Postgres:** PgBouncer, or the provider pooler (Supabase Supavisor, Neon pooled endpoint, RDS Proxy).
- **Node:** `pg.Pool` with `max`; Prisma `connection_limit`.
- **Go:** `sql.DB.SetMaxOpenConns` / `SetMaxIdleConns`.
- **JVM:** HikariCP `maximumPoolSize`.
- **Python:** SQLAlchemy `pool_size` / `max_overflow`.

## Related

[separate-work-queues](separate-work-queues.md) · [transaction-isolation-levels](transaction-isolation-levels.md)
