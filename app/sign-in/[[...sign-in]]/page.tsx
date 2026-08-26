import { redirect } from "next/navigation";

// Clerk's default sign-in route → our custom /login page.
// Kept as a redirect so Clerk internal redirects never land on the default UI.
export default function SignInPage() {
  redirect("/login");
}
