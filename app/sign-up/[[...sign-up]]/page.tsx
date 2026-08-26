import { redirect } from "next/navigation";

// Clerk's default sign-up route → our custom /register page.
// Kept as a redirect so Clerk internal redirects never land on the default UI.
export default function SignUpPage() {
  redirect("/register");
}
