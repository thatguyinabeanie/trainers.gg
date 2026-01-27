---
title: Feature Survey & Recommendations
description: Community feature survey results and implementation recommendations for Battle Stadium
category: architecture
type: planning
status: survey-results
obsidian_compatible: true
---

> [!WARNING]
> **ARCHIVED DOCUMENT** — This is a planning document from early development. The tech stack and priorities have evolved. Kept for historical reference.

# 📊 Feature Survey & Recommendations

To help select the best real-time provider for your Next.js app on Vercel, please answer the following questions. Your responses will guide the recommendation of the top 3 services for your needs.

## Survey Questions

1. **Do you need a prebuilt chat UI, or will you build your own?**
2. **Is message history (fetching old messages) required?**
3. **Do you need push notifications (mobile/web)?**
4. **Should users see who is online (presence)?**
5. **Do you want to sync app state or listen to database changes in real time?**
6. **Is collaborative editing (live cursors, shared docs) needed?**
7. **Will you need moderation tools (block/report, content filtering)?**
8. **Should users be able to share files or images in chat?**
9. **Is rich media (emojis, embeds) important?**
10. **Do you need to support a global user base (low latency worldwide)?**
11. **Is open source/self-hosting a requirement?**
12. **Do you need fine-grained permissions/roles?**
13. **Is integration with Postgres or another DB important?**
14. **Do you have a strict budget or need a generous free tier?**
15. **Any compliance/security requirements (GDPR, HIPAA, etc.)?**
16. **Anything else unique to your use case?**

---

_Fill out this survey to clarify your requirements before choosing a real-time provider for your project._

i will include a number 1-5 . 5 being mission critical. 1 being not important. 3 is nice to have.

1. Initally having a prebuilt chat UI would be very helpful as it would help increase velocity and reduce the time it takes to release. However, later I will want to build my own chat UI. this is a 2 or 3

2. Yes it is. it is very important. this is a 5

3. yes push notifications are highly important. it will depend on cost tho. this is likely a 4.

4. yes seeing who is online will be needed. this is like a 3

5. that sounds useful. given my answer i need you to generate ideas on how we could use this feature in the app. since im not sure how i will use this, this is a at most a 3, probably a 2.

6. I have not given this any thought before but that does sound cool. lets call this nice to have but not required. this is a 1.

7. moderation tools are somewhat of a nice to have. i imagine that will cost more. the application WILL have moderation tools, but that might be something that i build myself. it really is going to depend on cost.

8. nice to have. not important. this is a 2

9. rich media is a nice to have but not important. i do want it but it is not mission critical. but i am sure this would be something that users would love to have. lets say its a 3

10. yes low latency would be nice. we have players all over the world. however i dont want to pay more to have the lowest latency. i would say this is a 3.

11. not a requirement. definately a nice to have tho. this is a 1.

12. yes. 4

13. this is the most important thing. this is easily a 5

14. yes. i am not made of money. there is no money for this. generous free tier is a 5 on this scale. And this is okay. we should architect things such that once the app starts generating money, we can swap out the backends for something else.

15. i know nothing about this. other than we definately dont need HIPPA. you will need to do more granular questioning in this regard.

---

## Survey Analysis & Current Architecture

### Priority Summary (1–5 scale)

| Feature                        | Priority | Notes                                                       |
| ------------------------------ | -------- | ----------------------------------------------------------- |
| Prebuilt Chat UI               | 2–3      | Helpful for velocity, but will want to build your own later |
| Message History                | 5        | Very important                                              |
| Push Notifications             | 4        | Highly important, but cost-sensitive                        |
| Presence (Online Users)        | 3        | Needed                                                      |
| State Sync/DB Change Streams   | 2–3      | Useful, but not sure how yet; want ideas                    |
| Collaboration/CRDTs            | 1        | Nice to have, not required                                  |
| Moderation Tools               | 2–3      | Nice to have, may build yourself depending on cost          |
| File Sharing                   | 2        | Nice to have, not important                                 |
| Rich Media                     | 3        | Nice to have, not critical, but users would love it         |
| Global Edge/Low Latency        | 3        | Nice to have, but not at high cost                          |
| Open Source/Self-hosting       | 1        | Not required, nice to have                                  |
| Fine-grained Permissions/Roles | 4        | Important                                                   |
| Integration with Postgres/DB   | 5        | Most important                                              |
| Generous Free Tier             | 5        | Mission critical; must be able to swap backend later        |
| Compliance/Security            | ?        | Not HIPAA, need more granular questions                     |

### Ideas for State Sync/DB Change Streams

- Live match updates: Instantly update match status, scores, or results for all viewers/players.
- Tournament bracket updates: Real-time bracket changes as matches finish.
- Team/roster changes: Instantly reflect team edits or player swaps.
- Admin dashboards: Show live analytics, user activity, or moderation events.
- Chat moderation: Instantly remove flagged messages or users from all clients.
- Presence sync: Show who is viewing a match, page, or team in real time.

---

## Current Architecture Solution: Supabase

**Battle Stadium uses Supabase** as the unified solution for database, authentication, and real-time messaging. This decision provides:

### ✅ **Perfect Match for Requirements**

- **Deep Postgres Integration** (Priority 5): Native integration, no sync required
- **Generous Free Tier** (Priority 5): 500MB database, 50,000 MAUs, real-time included
- **Message History** (Priority 5): Store in Postgres, fetch via Prisma
- **Fine-grained Permissions** (Priority 4): Row Level Security + existing RBAC
- **Push Notifications** (Priority 4): External integration with OneSignal/Resend

### ✅ **Technical Benefits**

- **Unified API**: Single provider for database, auth, and real-time
- **Row Level Security**: Database-level permissions for real-time subscriptions
- **Built-in Features**: Presence, broadcast, database change streams
- **No Vendor Lock-in**: Standard PostgreSQL with open-source real-time layer
- **Simple Architecture**: No need to sync between multiple services

### ✅ **Cost-Effective Scaling**

- **Free Development**: Generous free tier for development and MVP
- **Predictable Costs**: $25/month Pro tier covers significant usage
- **No Message Limits**: Real-time included in all plans
- **Global Edge**: Low latency worldwide without additional cost

---

## Implementation Strategy

### **Phase 1: Core Chat Features**

1. **Database Models**: Chat messages, channels, permissions via Prisma
2. **Real-time Integration**: Supabase Realtime for live messaging
3. **Permission Integration**: Leverage existing RBAC system
4. **Message History**: Store and fetch via existing database

### **Phase 2: Enhanced Features**

1. **Custom Moderation**: Build moderation tools using existing audit system
2. **Rich Media**: File sharing via Supabase Storage
3. **Advanced UI**: Custom chat interface replacing basic components
4. **Push Notifications**: Integration with external services as needed

### **Phase 3: Advanced Real-time**

1. **State Sync**: Tournament updates, bracket changes via database subscriptions
2. **Presence Features**: Online users, typing indicators
3. **Live Dashboards**: Real-time analytics and admin interfaces

---

## Advantages Over Previous Considerations

### **vs. Ably/PubNub**

- ✅ **No sync complexity**: Direct database integration
- ✅ **Lower cost**: No additional service fees
- ✅ **Unified permissions**: RLS policies work for real-time
- ✅ **Simpler architecture**: One service instead of two

### **vs. External Real-time + Database**

- ✅ **No data consistency issues**: Single source of truth
- ✅ **Easier development**: No manual event publishing required
- ✅ **Better debugging**: Unified logging and monitoring
- ✅ **Reduced complexity**: Fewer moving parts

---
