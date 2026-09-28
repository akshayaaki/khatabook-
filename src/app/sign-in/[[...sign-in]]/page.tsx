import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-6 space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-[#EB5E28] flex items-center justify-center text-white font-black text-3xl mx-auto shadow-lg shadow-[#EB5E28]/30">
          ₹
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Personal Khata</h1>
        <p className="text-xs font-semibold text-slate-500">
          Sign in to your private financial money ledger
        </p>
      </div>
      <SignIn routing="path" path="/sign-in" />
    </div>
  );
}
