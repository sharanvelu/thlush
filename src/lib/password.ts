import bcrypt from "bcryptjs";

const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

let dummyHash: Promise<string> | undefined;

/**
 * Compares against a throwaway hash so that "unknown email" and "wrong password"
 * take about the same time and cannot be told apart by timing.
 */
export async function burnPasswordCheck(plain: string): Promise<void> {
  dummyHash ??= bcrypt.hash("not-a-real-password", COST);
  await bcrypt.compare(plain, await dummyHash);
}
