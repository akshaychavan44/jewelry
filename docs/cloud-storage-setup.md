# Cloud storage for the Vercel jewelry app

Production project: `jewelry` in the `akshay-2290` Vercel team.

The deployed project's environment-variable list was checked: it has authentication,
encryption and database settings, but no S3 settings. No AWS credentials or AWS
profile were found in this workspace. Real buckets, credentials and a live
upload test are still required; the code changes alone do not activate storage.

## AWS setup

1. In your AWS account, create two general-purpose S3 buckets in the same region,
   using globally unique names. One is for public media, one for private documents.
2. Keep all Block Public Access options enabled on the private bucket. Keep S3's
   default encryption enabled. Never enable website hosting or public reads there.
3. For the media bucket, use a CloudFront distribution with origin access control
   and set `S3_PUBLIC_BASE_URL` to its HTTPS domain. This lets the bucket stay
   private while shop images are publicly served. Alternatively, configure public
   read access only for the image prefixes shown in the example media policy below.
4. Create an application IAM identity, without console access, with the scoped
   permissions in `infrastructure/s3/app-policy.json`. Replace both example bucket
   names first. Create its access key and enter it directly into Vercel's encrypted
   project settings. The application does not need account-wide S3 permissions.
5. On the private bucket, configure CORS using `infrastructure/s3/private-cors.json`.
   Replace the example origin with every exact HTTPS domain that serves this app.
   This permits browser PUT uploads using short-lived signed URLs; it does not make
   documents public. Add preview origins explicitly if testing preview deployments.
6. Add the following Vercel environment variables to Production, and separately to
   Preview if needed:

| Variable | Value |
| --- | --- |
| `S3_BUCKET` | Media bucket name |
| `S3_PRIVATE_BUCKET` | Different private document bucket name |
| `S3_REGION` | Region containing both buckets, e.g. `ap-south-1` |
| `S3_ACCESS_KEY_ID` | Application identity's access key ID |
| `S3_SECRET_ACCESS_KEY` | Its secret access key |
| `S3_PUBLIC_BASE_URL` | Media CDN domain; omit only if using direct public S3 image URLs |

7. Redeploy after the code and environment settings are ready. Existing deployments
   do not receive newly added variables. Retry onboarding with a small PDF, then a
   document larger than 4.5 MB, and verify admin viewing and unauthorized denial.
   Also test shop branding and product images. Existing files stored on a previous
   machine's local disk must be migrated to the same object keys or uploaded again.

## Optional Cloudflare R2

Use separate media and private buckets. Set `S3_ENDPOINT` to your account's R2 S3
API endpoint, `S3_REGION=auto`, and the R2 S3 credentials. `S3_PUBLIC_BASE_URL` is
required and must be the public media bucket's custom domain. Keep the private
bucket's public access disabled and configure the equivalent CORS rule there.

## Behavior implemented

- Vercel and production require complete cloud configuration; the app never falls
  back to writing production documents to local disk. Visitors receive a friendly
  upload error while missing variable names are logged for the operator.
- Local development without S3 settings keeps disk storage. Partially configured
  cloud storage produces an explicit configuration failure.
- Public and private buckets must differ. R2/custom endpoints are supported.
- KYC files upload directly from the browser to the private bucket; file bytes no
  longer pass through Vercel's server-action request. The existing 12 MB per-file
  allowance remains. Other upload forms retain their existing server upload path
  and remain subject to Vercel's total request-size limit.
- Upload grants expire after ten minutes, bind the owner and expected file size,
  and prohibit overwriting an existing object. Finalization checks the bytes and
  registers a private asset. Form submission rechecks asset ownership and purpose.
- Existing authorization and audit checks protect document downloads. No database
  migration is needed.

## Checks

`node --import tsx --test scripts/check-cloud-storage.mjs` exercises configuration,
signed upload restrictions, ownership/expiry validation, content checks, document
attachment and the browser helper with isolated S3/database fixtures. No live
bucket or real credentials are used by those tests.

Reference: [AWS presigned uploads](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html),
[Vercel payload limit](https://vercel.com/docs/errors/function_payload_too_large),
[R2 SDK setup](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/).

Observed verification: npm run lint, npm run typecheck and npm run build passed. All 30 targeted storage/onboarding/login/contact tests passed. Production HTTP checks passed for unauthenticated and cross-origin upload denial, private-file authentication, jeweler login and the public directory. Missing production storage was also checked directly and returned the friendly UploadError before local storage construction. No connected browser or AWS credentials were available, so a real upload/CORS check and visual interaction test remain unverified. The Vercel production deployment and environment settings were not changed.
