import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Leaf, Mail } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    window.setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast.success("Password reset instructions sent.");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#1B4332] text-[#FDFBF7]">
              <Leaf className="w-5 h-5" strokeWidth={2.5} />
            </span>
            <span className="font-display text-2xl text-[#1A201C] tracking-tight">
              Crop<span className="text-[#1B4332]">Connect</span>
            </span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#D5D1C5]/50 p-8">
          {submitted ? (
            <div className="text-center">
              <span className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#E7F3EC] text-[#1B4332]">
                <CheckCircle2 className="h-7 w-7" strokeWidth={2.3} />
              </span>
              <h1 className="font-display text-2xl text-[#1A201C] mb-2">
                Check Your Email
              </h1>
              <p className="text-sm text-[#1A201C]/60 leading-6">
                If an account exists for {email}, password reset instructions
                will arrive shortly.
              </p>

              <Button
                asChild
                className="mt-7 w-full bg-[#1B4332] hover:bg-[#0F2A1F] text-[#FDFBF7] rounded-full py-5"
              >
                <Link to="/login">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="font-display text-2xl text-[#1A201C] mb-2">
                  Forgot Password?
                </h1>
                <p className="text-sm text-[#1A201C]/60 leading-6">
                  Enter your email address and we will send instructions to
                  reset your CropConnect password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#1A201C]">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A201C]/40" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="farmer@cropconnect.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 bg-[#FDFBF7] border-[#D5D1C5] focus:border-[#1B4332] focus:ring-[#1B4332]/20"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1B4332] hover:bg-[#0F2A1F] text-[#FDFBF7] rounded-full py-5"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#FDFBF7]/30 border-t-[#FDFBF7] rounded-full animate-spin" />
                      Sending instructions...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Send Reset Link
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-[#1B4332] font-medium hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
