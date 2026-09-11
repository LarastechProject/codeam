export function validateSignupInput(input: { name: string; email: string; password: string }) {
  if (!input.name.trim()) return "Display name is required";
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) return "Enter a valid email address";
  if (input.password.length < 8) return "Password must be at least 8 characters";
  return null;
}
