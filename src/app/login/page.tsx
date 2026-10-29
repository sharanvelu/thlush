'use client';

import {Suspense, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {signIn} from "next-auth/react";
import {Config} from "@/config";
import Icon from "@/components/Icon";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const applicationName: string = Config.app_name;

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect: string = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleOAuthLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      await signIn('authentik', {callbackUrl: redirect});
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password.');
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isLocal: boolean = process.env.NEXT_PUBLIC_APP_ENV === 'local';

  return (
    <div className="grid min-h-screen grid-cols-1 bg-canvas lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sunken p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-[10px] bg-accent text-accent-ink">
            <Icon name="receipt" size={18}/>
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.01em]">{applicationName}</span>
        </div>

        {/* Receipt motif */}
        <div className="mx-auto w-full max-w-[300px] -rotate-2 pb-4">
          <div className="receipt rise p-6">
            <div className="text-center">
              <div className="eyebrow">Order</div>
              <div className="num mt-0.5 text-lg font-semibold">#0001</div>
            </div>
            <hr className="rule-dash my-4"/>
            <div className="flex flex-col gap-3 text-[13px]">
              {[['w-24', '2'], ['w-32', '1'], ['w-20', '3'], ['w-28', '1']].map(([w, q], i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="num text-xs text-ink-3">{q}x</span>
                    <span className={`h-2.5 rounded-full bg-sunken ${w}`}></span>
                  </div>
                  <span className="h-2.5 w-10 rounded-full bg-sunken"></span>
                </div>
              ))}
            </div>
            <hr className="rule-dash my-4"/>
            <div className="flex items-center justify-between">
              <span className="eyebrow">Total</span>
              <span className="num text-xl font-semibold text-accent">₹ 0.00</span>
            </div>
            <div className="mt-5 flex justify-center gap-[3px]" aria-hidden="true">
              {Array.from({length: 28}).map((_, i) => (
                <span key={i} className={`h-6 bg-ink ${i % 3 === 0 ? 'w-[3px]' : i % 2 === 0 ? 'w-px' : 'w-[2px]'}`}></span>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em]">{applicationName} Billing</h2>
          <p className="mt-1 max-w-sm text-sm text-ink-3">Menu, bills and customers, kept together at the counter.</p>
        </div>
      </aside>

      {/* Sign-in */}
      <main className="flex items-center justify-center px-5 py-10">
        <div className="rise w-full max-w-[380px]">
          <div className="mb-8">
            <div className="mb-5 grid size-9 place-items-center rounded-[10px] bg-accent text-accent-ink lg:hidden">
              <Icon name="receipt" size={18}/>
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">Sign in</h1>
            <p className="mt-1 text-sm text-ink-3">to {applicationName} Billing</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-lg bg-bad-soft px-3 py-2.5 text-[13px] text-bad" role="alert">
              <Icon name="alert" size={15} className="mt-0.5 shrink-0"/>
              <p>{error}</p>
            </div>
          )}

          {isLocal && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="field-label">Email</label>
                <input
                  type="email"
                  id="email"
                  placeholder="Enter your email"
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="password" className="field-label">Password</label>
                <input
                  type="password"
                  id="password"
                  placeholder="Enter your password"
                  className="field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <button type="submit" disabled={isLoading} className="btn btn-primary btn-lg w-full">
                {isLoading ? (<><span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span> Signing in…</>) : 'Sign In'}
              </button>
            </form>
          )}

          {isLocal && (
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-line"></div>
              <span className="eyebrow">or</span>
              <div className="h-px flex-1 bg-line"></div>
            </div>
          )}

          <button
            type="button"
            onClick={handleOAuthLogin}
            disabled={isLoading}
            className={`btn btn-lg w-full ${isLocal ? 'btn-secondary' : 'btn-primary'}`}
          >
            {isLoading ? (<><span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span> Signing in…</>) : (<><Icon name="shield" size={16}/>Sign in with Sentrix</>)}
          </button>
        </div>
      </main>
    </div>
  );
}
