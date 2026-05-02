import ResetPasswordForm from "./ResetPasswordForm";
import Navbar from "@/app/components/navbar";

interface ResetPasswordPageProps {
  searchParams?: {
    token?: string | string[];
  };
}

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const rawToken = searchParams?.token;
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
