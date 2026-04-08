"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plane } from "lucide-react";
import toast from "react-hot-toast";

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back");
      } else {
        if (!firstName.trim() || !lastName.trim()) {
          toast.error("First and last name are required");
          setLoading(false);
          return;
        }
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account");
          setLoading(false);
          return;
        }
        toast.success("Account created");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An error occurred";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: "var(--color-bg-subtle)" }}
    >
      <div className="w-full max-w-[400px] animate-in">
        <div className="flex items-center gap-2.5 mb-8 text-center justify-center">
          <div
            className="w-8 h-8 rounded-md grid place-items-center"
            style={{ background: "var(--color-accent)" }}
          >
            <Plane className="w-4 h-4 text-white" strokeWidth={2.25} />
          </div>
          <span
            className="text-[15px] font-semibold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Voyager
          </span>
        </div>

        {/* Heading */}
        <div className="mb-7 text-center">
          <h1
            className="text-[22px] font-semibold tracking-tight text-center"
            style={{ color: "var(--color-text)" }}
          >
            {isLogin ? "Sign in to your account" : "Create your account"}
          </h1>
          <p
            className="text-[13px] mt-1.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            {isLogin
              ? "Manage bookings for your travel agency."
              : "Get started with a free workspace."}
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="field-label">
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alex"
                    className="field"
                    required={!isLogin}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="field-label">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Morgan"
                    className="field"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@agency.com"
                className="field"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="field"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {isLogin ? "Signing in…" : "Creating account…"}
                </>
              ) : isLogin ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>

        <p
          className="text-[13px] text-center mt-5"
          style={{ color: "var(--color-text-muted)" }}
        >
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="font-medium focus-ring rounded-sm"
            style={{ color: "var(--color-accent)" }}
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
