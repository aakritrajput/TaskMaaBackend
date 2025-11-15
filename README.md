# 🧠 TaskMaa Backend — Emotionally Intelligent Task Management API

> _“I didn’t build TaskMaa just to manage tasks — I built it to manage discipline.”_  
> — **Aakrit Rajput**

---

## 🌸 Overview

TaskMaa is the backend that powers the emotionally intelligent task and goal management system — an app that doesn’t just track what you do, but reminds you *why* you do it.  

This repository represents the **core backend architecture**, built with a vision to handle **real-time collaboration, caching efficiency, scalability, and emotional intelligence-driven user experience**.  

I engineered this system to be **resilient, distributed, and production-grade**, integrating multiple industry-standard tools and design patterns to ensure it performs reliably even under high concurrency.

---

## ⚙️ Core Tech Stack

| Layer | Technology |
|--------|-------------|
| **Runtime & Framework** | Node.js, Express.js |
| **Database** | MongoDB (with Mongoose ODM) |
| **Caching & Queues** | Upstash Redis (Cloud Redis for serverless environments) |
| **Real-Time Communication** | Socket.io |
| **Deployment** | Vercel + Cloud Hosted Database & Caching |
| **Utilities** | Winston Logger, Express-Async-Handler, Dotenv, CORS, Rate Limiter |
| **Testing & Monitoring** | Postman, Console-based stress testing |

---

## 🧠 My Engineering Thought Process

While building TaskMaa, I wanted more than a REST API — I wanted a **system that behaves intelligently**, one that can:
- Cache aggressively when needed.  
- Communicate instantly with clients.  
- Queue background jobs without blocking the main thread.  
- Handle user scaling gracefully while staying cost-effective.  

Every tool, every middleware, and every design decision came from solving real problems — not copying patterns.

---

## ⚙️ Architecture Overview

              ┌────────────────────────┐
              │        Client UI        │
              │   (Next.js + Socket.io) │
              └────────────┬────────────┘
                           │
                     HTTPS / WebSocket
                           │
            ┌──────────────┴──────────────┐
            │       Express API Layer     │
            └──────────────┬──────────────┘
                           │
             ┌─────────────┴─────────────┐
             │         Controllers       │
             └─────────────┬─────────────┘
                           │
    ┌───────────────────────────────────────────┐
    │           Services & Business Logic       │
    ├──────────────────┬────────────────────────┤
    │ Task Service     │  Chat Service          │
    │ Group Service    │  Leaderboard Service   │
    └──────────────────┴────────────────────────┘
                           │
          ┌────────────────┴─────────────────┐
          │            MongoDB               │
          │   (Primary Data Persistence)     │
          └────────────────┬─────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │         Redis (Upstash)         │
          │  • Caching Layer                │
          │  • Queue Management (Workers)   │
          └────────────────────────────────┘


---

## 🚀 Features

### 🧩 Task System
- **General Tasks** — Regular tasks with CRUD operations, priorities, and due dates.  
- **Daily Tasks** — Auto-resetting tasks with completion tracking and streak counters.  
- **Group Tasks** — Public or private shared tasks where users can collaborate, compete, and communicate.

### 💬 Real-Time Communication
- Integrated **Socket.io** layer for:
  - Instant chat messaging
  - Real-time leaderboard updates
  - Live task completion broadcasts

### ⚡ Performance Layer
- **Upstash Redis Caching** for quick data retrieval.
- **Distributed Queues** for async processes (e.g., leaderboard updates, score updates).
- **Background Workers** to ensure the API thread remains non-blocking.
- **Pagination & Filtering** -- right now only implemented for seeing all tasks.

---

## 🧩 Problem-Solving Highlights

> _"Every performance bottleneck was a story to fix — not a bug to ignore."_

- **Challenge:** Task updates were slow under concurrent user loads.  
  **Solution:** Added Redis caching for hot data and switched to background queues for non-critical updates.  

- **Challenge:** Real-time group updates causing socket congestion.  
  **Solution:** Used namespace-based Socket.io rooms with selective emits.

- **Challenge:** Repeated DB reads for leaderboard recalculations.
  **Solution:** Redis caching with periodic invalidation using a TTL-based worker.

Each improvement didn’t just optimize performance — it refined my understanding of *systems thinking.*

---


## ⌛ Future Improvements

- We can add more AI responses for other tasks.
- Badge assignment to users based on their achievments.
- Email verification part -- code already written but not implemented as nodemailer was taking too long for sending emails which was not good for our initial UX.
- In general tasks or group tasks we have not set the validation to not choose passed date. so can implement that too.
- When we send request to user then we can have the option to cancel the request which we don't have right now.
- In chats we can implement sent, delivered, and read states -- the code for this is actually written but there was some issue with status showing up as sometimes it is showing properly but some times as we are moving from one chat to other it is giving some problem - so we can see that.
- Can also implement deleting specific messages from chat.
- Can implement media sharing on chat.
- In profile we can implement delete profile (the code of which is already written) but on deleting the chats and other tables data is not deleting so can do this small improvement and then can public this feature.
