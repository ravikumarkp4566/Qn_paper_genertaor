import jwt from "jsonwebtoken";
import { User } from "./models.js";

const TOKEN_LIFETIME = "8h";

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, process.env.JWT_SECRET, { expiresIn: TOKEN_LIFETIME });
}

/** The user as the web app sees it. */
export function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    college: user.college ? { id: String(user.college._id ?? user.college), name: user.college.name } : null,
  };
}

/** Requires a valid "Authorization: Bearer <token>" header; sets req.user. */
export async function requireAuth(req, res, next) {
  const header = req.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Sign in required" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).populate("college", "name slug header");
    if (!user || !user.active) return res.status(401).json({ error: "Account not found" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Session expired. Sign in again." });
  }
}

export function requireRole(role) {
  return (req, res, next) => (req.user?.role === role ? next() : res.status(403).json({ error: "Not allowed" }));
}

/**
 * The college whose data a request works on. Faculty always use their own;
 * a platform admin may pick one with ?college=<id>.
 */
export function collegeOf(req) {
  if (req.user.role === "platform_admin" && req.query.college) return req.query.college;
  return req.user.college?._id ?? null;
}
