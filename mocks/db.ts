export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
}

const users: User[] = [];

export function findUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email === email);
}

export function createUser(email: string, password: string, name: string): User {
  const user: User = { id: crypto.randomUUID(), email, password, name };
  users.push(user);
  return user;
}
