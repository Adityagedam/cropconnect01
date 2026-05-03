import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Leaf, Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

const API_BASE_URL =
  process.env.REACT_APP_BACKEND_URL || "https://cropconnect01-production.up.railway.app";
const API = `${API_BASE_URL}/api`;

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        email: formData.email,
        password: formData.password,
      });
      const user = response.data.user;
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        state: user.state,
        locationType: user.locationType || "city",
        city: user.city || user.location || "",
        village: user.village || "",
        landSize: user.landSize || "",
        sensors: user.sensors || "0",
        pumps: user.pumps || "0",
        sensorDeviceId: user.sensorDeviceId || "sim-node-1",
        sensorSetupComplete: Boolean(user.sensorSetupComplete),
        sensorSetupStatus: user.sensorSetupStatus || "pending",
      };
      localStorage.setItem("cropconnect-user", JSON.stringify(userData));

      toast.success("Welcome back to CropConnect!");
      navigate("/dashboard");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (!err?.response) {
        toast.error(`Could not connect to backend at ${API_BASE_URL}. Please try again.`);
      } else {
        toast.error(typeof detail === "string" ? detail : "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 group"
          >
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#1B4332] text-[#FDFBF7]">
              <Leaf className="w-5 h-5" strokeWidth={2.5} />
            </span>
            <span className="font-display text-2xl text-[#1A201C] tracking-tight">
              Crop<span className="text-[#1B4332]">Connect</span>
            </span>
          </Link>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#D5D1C5]/50 p-8">
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl text-[#1A201C] mb-2">
              Welcome Back
            </h1>
            <p className="text-sm text-[#1A201C]/60">
              Sign in to access your account
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
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="pl-10 bg-[#FDFBF7] border-[#D5D1C5] focus:border-[#1B4332] focus:ring-[#1B4332]/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[#1A201C]">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-[#1B4332] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A201C]/40" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
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
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#1A201C]/60">
              Don't have an account?{" "}
              <Link
                to="/signin"
                className="text-[#1B4332] font-medium hover:underline"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-[#1A201C]/40 mt-6">
          By continuing, you agree to CropConnect's{" "}
          <Link to="/terms" className="underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
