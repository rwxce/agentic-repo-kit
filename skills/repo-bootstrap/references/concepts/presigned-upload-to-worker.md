# Presigned uploads processed by a worker

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Streaming user files through the web server costs memory and time limits, and storing them before validating them publishes whatever the user sent, including abusive content.

## Principle

The client uploads straight to object storage with a short-lived presigned URL under a per-tenant prefix. A worker then validates, converts and moderates the file, and only then records it. Moderation fails closed. Objects whose records are gone are swept with a durable ledger.

## When it applies

- User uploads of images, video or documents beyond a few hundred KB.

## When it doesn't

- Small files with no processing can go through the server directly.

## Typical mistakes

- Trusting the client-declared content type.
- Recording the file as usable before validation and moderation.
- Bucket CORS that does not allow PUT from the app origin (uploads fail only in the browser).
- No sweep for orphaned objects.

## The check that verifies it

Tests that a moderation error leaves no usable record; a test for the per-tenant key prefix; a sweep job with a test.

## Canonical source

- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Amazon S3 User Guide: Uploading objects with presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)

## Variants per stack

- **S3-compatible (S3, R2, GCS interop):** presigned PUT, worker triggered by an event or by a finalize call.
- **Convex:** `generateUploadUrl` for small files; presigned R2 plus a worker for heavy processing.
- **Mobile:** background upload sessions (URLSession background, WorkManager) to the presigned URL.

## Related

[native-binaries-in-workers](native-binaries-in-workers.md) · [durable-jobs](durable-jobs.md) · [input-validation-at-the-boundary](input-validation-at-the-boundary.md)
