import { http, HttpResponse } from "msw";
import { findUserByEmail, createUser } from "./db";

let currentUserId: string | null = null;

export const handlers = [
  http.post("/api/auth/signup", async ({ request }) => {
    const { email, password, name } = (await request.json()) as {
      email: string;
      password: string;
      name: string;
    };

    if (findUserByEmail(email)) {
      return HttpResponse.json(
        { error: "Email already in use" },
        { status: 409 },
      );
    }

    const user = createUser(email, password, name);
    currentUserId = user.id;
    return HttpResponse.json({ id: user.id, email: user.email, name: user.name });
  }),

  http.post("/api/auth/login", async ({ request }) => {
    const { email, password } = (await request.json()) as {
      email: string;
      password: string;
    };

    const user = findUserByEmail(email);
    if (!user || user.password !== password) {
      return HttpResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    currentUserId = user.id;
    return HttpResponse.json({ id: user.id, email: user.email, name: user.name });
  }),

  http.post("/api/auth/logout", () => {
    currentUserId = null;
    return HttpResponse.json({ ok: true });
  }),

  http.get("/api/auth/me", () => {
    if (!currentUserId) {
      return HttpResponse.json({ user: null });
    }
    return HttpResponse.json({ user: { id: currentUserId } });
  }),
];
