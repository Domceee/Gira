import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#171c24] text-[#ffffff] flex items-center justify-center">
      <div className="rounded-2xl border border-[#7a8798] bg-[#1f2630] p-10 max-w-lg w-full text-center shadow-2xl">

        <div className="flex justify-center mb-6">
          <Image
            src="/gira-logo.svg"
            alt="Gira Logo"
            width={72}
            height={72}
            className="rounded-xl"
          />
        </div>

        <h1 className="text-4xl font-bold mb-3 text-[#ffffff]">
          Welcome to <span className="text-[#39e7ac]">Gira</span>
        </h1>

        <p className="text-sm mb-8 text-[#c3ceda]">
          Your project management companion.
        </p>

        <div className="space-y-3">
          <Link
            href="/register"
            className="block w-full rounded-lg border border-[rgba(57,231,172,0.40)] bg-[rgba(57,231,172,0.13)] px-6 py-3 text-[#39e7ac] font-semibold transition hover:bg-[rgba(57,231,172,0.20)]"
          >
            Register
          </Link>

          <Link
            href="/login"
            className="block w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-6 py-3 text-[#ffffff] font-semibold transition hover:bg-[#323d4b]"
          >
            Login
          </Link>

          <Link
            href="/api/auth/google/login"
            className="block w-full rounded-lg border border-[#7a8798] bg-[#28313d] px-6 py-3 font-semibold text-[#ffffff] transition hover:bg-[#323d4b]"
          >
            <span className="flex items-center justify-center gap-3">
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.233 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4c-7.682 0-14.344 4.337-17.694 10.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.144 35.091 26.679 36 24 36c-5.212 0-9.62-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.084 5.571h.003l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>
              <span>Continue with Google</span>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

