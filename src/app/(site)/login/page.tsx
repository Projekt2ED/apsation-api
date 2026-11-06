import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="site-shell section-space flex flex-1 items-center justify-center">
      <div className="grid w-full max-w-[1040px] gap-6 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center">
        <section className="space-y-5">
          <p className="eyebrow">Account</p>
          <h1 className="font-display text-5xl font-semibold text-[var(--ink)] sm:text-6xl">
            登录工作台
          </h1>
          <p className="max-w-xl text-base leading-8 text-[var(--muted)]">
            使用邮箱密码注册，或通过已配置的第三方账号登录。新账号默认余额为 0，充值后才能调用计费接口。
          </p>
        </section>

        <LoginForm />
      </div>
    </main>
  );
}
