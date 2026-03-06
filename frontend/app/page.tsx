import Link from "next/dist/client/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-3xl font-bold">Welcome to Gira</h1><br></br>
      <p>
        Registration page here <Link href="/register">Register</Link>
      </p>
      <br></br>
      <p>
        Login page here <Link href="/login">Login</Link>
      </p>
    </div>
  );
}
