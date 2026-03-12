import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f5ede3] text-[#3e2a1f] flex items-center justify-center">
      <div className="bg-[#fffaf5] border border-[#b08968] shadow-md rounded-2xl p-10 max-w-lg text-center">

        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <Image
            src="/favicon.ico"
            alt="Gira Logo"
            width={80}
            height={80}
            className="rounded-xl"
          />
        </div>

        <h1 className="text-4xl font-bold mb-4 text-[#5c3b28]">
          Welcome to Gira
        </h1>

        <p className="text-lg mb-8 text-[#4b2e1f]">
          Your project management companion.
        </p>

        <div className="space-y-4">
          <Link
            href="/register"
            className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-6 py-3 text-[#4b2e1f] font-medium transition hover:-translate-y-1 hover:shadow"
          >
            Register
          </Link>

          <Link
            href="/login"
            className="block w-full rounded-lg border border-[#c8a27a] bg-[#fdf7f2] px-6 py-3 text-[#4b2e1f] font-medium transition hover:-translate-y-1 hover:shadow"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
