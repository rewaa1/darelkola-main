import { LoginForm } from "@/components/auth/LoginForm";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher variant="outline" />
      </div>
      <LoginForm />
    </main>
  );
}
