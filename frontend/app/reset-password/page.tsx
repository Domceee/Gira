import ResetPasswordForm from "./ResetPasswordForm";
import Navbar from "@/app/components/navbar";

interface ResetPasswordPageProps {
  searchParams?: Promise<{
    token?: string | string[];
  }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams; // ← FIX
  const rawToken = params?.token;

  const token = Array.isArray(rawToken)
    ? rawToken[0] ?? null
    : rawToken ?? null;

  return (
    <div className="min-h-screen bg-[#171c24] text-white">
      <Navbar />
      <ResetPasswordForm token={token} />
    </div>
  );
}
