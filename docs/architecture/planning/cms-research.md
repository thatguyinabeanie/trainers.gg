# 🗂️ CMS Research: Integrating Payload CMS with Next.js

## TL;DR

- **Payload CMS** can be embedded directly into an existing Next.js app as an API route or run as a standalone server.
- **Best for:** Teams wanting a code-first, open-source, highly customizable CMS with a modern admin UI and strong Next.js support.
- **Supports:** Articles, rich content, roles/permissions, custom fields, and more.

---

## 1. What is Payload CMS?

- **Open-source, headless CMS** built for Node.js/TypeScript.
- **Code-first:** Content models (collections, fields, access control) are defined in code, versioned with your app.
- **Modern admin UI:** Accessible, customizable, and user-friendly.
- **Database support:** MongoDB, Postgres, SQLite, and more.
- **API:** REST and GraphQL out of the box.

---

## 2. Integration Approaches with Next.js

### A. Embedded in Next.js (API Route)

- Add Payload as a custom API route (e.g., `/api/payload`).
- Admin UI and API available at `/api/payload/admin` and `/api/payload`.
- Good for local dev, small/medium projects, or monorepos.

### B. Standalone Server

- Run Payload as a separate Node.js process.
- Next.js fetches content from Payload's API.
- More scalable for large/complex apps.

---

## 3. Typical Workflow for Article Support

1. **Install Payload:** `bun add payload` (or npm/yarn)
2. **Create `payload.config.ts`:** Define collections (e.g., `articles`) and fields.
3. **Set up API route:** (if embedding) in `src/pages/api/payload.ts`.
4. **Configure database:** via `.env.local` (MongoDB, Postgres, etc.)
5. **Access admin UI:** `/api/payload/admin` (or your chosen route)
6. **Fetch content in Next.js:** Use REST/GraphQL API to display articles.

---

## 4. Example: Minimal Article Collection

```ts
// payload.config.ts
import { buildConfig } from "payload/config";

export default buildConfig({
  collections: [
    {
      slug: "articles",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "content", type: "richText", required: true },
        // Add more fields as needed
      ],
    },
  ],
});
```

---

## 5. Key Considerations

- **Roles & Permissions:** Built-in, customizable per collection/field.
- **Rich Content:** Supports rich text, media, relationships, localization, etc.
- **Versioning:** All config is code, so changes are tracked in git.
- **Accessibility:** Modern, accessible admin UI.
- **Extensibility:** Hooks, custom endpoints, plugins.
- **Deployment:** For production, consider running Payload as a separate server for performance.

---

## 6. Resources

- [Payload + Next.js Guide](https://payloadcms.com/docs/production/nextjs)
- [Payload Example Repo](https://github.com/payloadcms/public-demo)
- [Payload Docs](https://payloadcms.com/docs/)

---

## 7. Next Steps / Open Questions

- Decide on embedded vs. standalone architecture.
- Plan article schema (fields, relationships, permissions).
- Evaluate editor/admin experience for your team.
- Consider database choice and hosting requirements.

---

_This document is for research and planning. No implementation has been done yet._
