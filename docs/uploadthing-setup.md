# UploadThing image storage

1. Create an app at https://uploadthing.com/dashboard and copy its server token. **Private files require a paid UploadThing plan**; the free tier alone cannot support this platform's private verification images. No plan is purchased by this integration.
2. In the UploadThing app settings, set the default file ACL to **private** and enable **per-request ACL overrides**. Public jewelry photos and branding use `public-read`; verification and certificate images use `private`. Allow signed URL expiration overrides for the existing authorized file routes.
3. Set `UPLOADTHING_TOKEN` in `.env.local` for development and in your Vercel project's environment variables for every environment that needs uploads. This is a server secret: never prefix it with `NEXT_PUBLIC_`, commit it, or paste it into a client component.
4. Restart development or redeploy Vercel after setting the token. Keep `/api/uploadthing` reachable by UploadThing callbacks (deployment protection must allow those callbacks).
5. Test a jewelry upload and a verification upload. Jewelry images should load publicly; opening the verification image's unsigned UploadThing URL must fail. Review verification files through the existing authorized `/api/files/[id]` route, which issues a short-lived signed URL.

Jewelry images accept JPG, PNG, WebP and AVIF up to 12 MB each. Store branding accepts JPG, PNG and WebP up to 6 MB. Certificates and verification documents accept JPG, PNG and WebP up to 12 MB. User-uploaded PDFs and SVGs are rejected; platform-generated PDF invoices and labels retain their existing behavior.

Jewelry editor, showcase, branding, certificate and verification uploads go directly from the browser to UploadThing. The server validates ownership, purpose, size, MIME type and image signatures before saving a database file reference. Verification images are never stored as public URLs in the database.

When `UPLOADTHING_TOKEN` is configured, UploadThing takes priority over S3. Without it, existing S3 configuration remains supported and local disk remains available in development only. Production never silently falls back to local disk.

Existing local/S3 files are **not migrated automatically**. Public URLs continue to point to their original host, but private files require migration or re-upload before switching the active storage provider. Keep the original storage until existing files have been accounted for.

No database migration is required. Existing logical file keys are stored as UploadThing custom IDs, preserving the existing authorization and file-reference model.

References: [Next.js integration](https://docs.uploadthing.com/getting-started/appdir), [file ACLs](https://docs.uploadthing.com/concepts/regions-acl), [server file API](https://docs.uploadthing.com/api-reference/ut-api).
