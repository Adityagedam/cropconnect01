import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Leaf, Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff, MapPin } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

const API_BASE_URL =
  process.env.REACT_APP_BACKEND_URL || "https://cropconnect01-production.up.railway.app/api";
const API = API_BASE_URL.replace(/\/$/, "");

// Indian states and major cities for location selection
const locationData = {
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Kolhapur"],
  Karnataka: ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Davangere"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Erode"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda"],
  Haryana: ["Chandigarh", "Faridabad", "Gurugram", "Panipat", "Karnal"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  Kerala: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"],
  Bihar: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur"],
};

export default function SignInPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    state: "",
    locationType: "city", // "city" or "village"
    city: "",
    village: "",
    landSize: "",
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    // Reset city/village when state or locationType changes
    if (e.target.name === "state") {
      setFormData((prev) => ({ ...prev, city: "", village: "" }));
    }
    if (e.target.name === "locationType") {
      setFormData((prev) => ({ ...prev, city: "", village: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (step === 1) {
      // Move to step 2
      setStep(2);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!formData.state || (formData.locationType === "city" && !formData.city) || (formData.locationType === "village" && !formData.village)) {
      toast.error("Please select your location");
      setStep(1);
      return;
    }

    setLoading(true);

    try {
      const location = formData.locationType === "city" ? formData.city : formData.village;
      const sensorDeviceId = `farm-${Date.now()}`;
      const response = await axios.post(`${API}/auth/signup`, {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        state: formData.state,
        location,
        land_size: formData.landSize ? Number(formData.landSize) : null,
        location_type: formData.locationType,
        city: formData.locationType === "city" ? formData.city : "",
        village: formData.locationType === "village" ? formData.village : "",
        sensor_device_id: sensorDeviceId,
        sensors: "0",
        pumps: "0",
        sensor_setup_complete: false,
        sensor_setup_status: "pending",
      });
      const user = response.data.user;
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        state: user.state,
        locationType: user.locationType || formData.locationType,
        city: user.city || (formData.locationType === "city" ? user.location : ""),
        village: user.village || (formData.locationType === "village" ? user.location : ""),
        landSize: user.landSize || formData.landSize || "2.5",
        sensors: user.sensors || "0",
        pumps: user.pumps || "0",
        sensorDeviceId: user.sensorDeviceId || sensorDeviceId,
        sensorSetupComplete: Boolean(user.sensorSetupComplete),
        sensorSetupStatus: user.sensorSetupStatus || "pending",
      };
      localStorage.setItem("cropconnect-user", JSON.stringify(userData));

      toast.success("Account created successfully! Welcome to CropConnect.");
      navigate("/dashboard");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (!err?.response) {
        toast.error(`Could not connect to backend at ${API}. Please try again.`);
      } else {
        toast.error(typeof detail === "string" ? detail : "Could not create account");
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
              Create Account
            </h1>
            <p className="text-sm text-[#1A201C]/60">
              Join CropConnect and transform your farming experience
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-[#1A201C]">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A201C]/40" />
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Ramesh Kumar"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="pl-10 bg-[#FDFBF7] border-[#D5D1C5] focus:border-[#1B4332] focus:ring-[#1B4332]/20"
                />
              </div>
            </div>

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
              <Label htmlFor="phone" className="text-[#1A201C]">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A201C]/40" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="pl-10 bg-[#FDFBF7] border-[#D5D1C5] focus:border-[#1B4332] focus:ring-[#1B4332]/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1A201C]">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A201C]/40" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="pl-10 pr-10 bg-[#FDFBF7] border-[#D5D1C5] focus:border-[#1B4332] focus:ring-[#1B4332]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A201C]/40 hover:text-[#1A201C]/70"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[#1A201C]">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A201C]/40" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="pl-10 bg-[#FDFBF7] border-[#D5D1C5] focus:border-[#1B4332] focus:ring-[#1B4332]/20"
                />
              </div>
            </div>

            {step >= 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-[#1A201C]">
                    State
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A201C]/40" />
                    <select
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-[#FDFBF7] border border-[#D5D1C5] rounded-md focus:border-[#1B4332] focus:ring-[#1B4332]/20 appearance-none cursor-pointer"
                    >
                      <option value="">Select your state</option>
                      {Object.keys(locationData).map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#1A201C]">
                    Location Type
                  </Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="locationType"
                        value="city"
                        checked={formData.locationType === "city"}
                        onChange={handleChange}
                        className="text-[#1B4332] focus:ring-[#1B4332]/20"
                      />
                      <span className="text-[#1A201C]">City</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="locationType"
                        value="village"
                        checked={formData.locationType === "village"}
                        onChange={handleChange}
                        className="text-[#1B4332] focus:ring-[#1B4332]/20"
                      />
                      <span className="text-[#1A201C]">Village</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={formData.locationType === "city" ? "city" : "village"} className="text-[#1A201C]">
                    {formData.locationType === "city" ? "City" : "Village"}
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A201C]/40" />
                    {formData.locationType === "city" ? (
                      <select
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                        disabled={!formData.state}
                        className="w-full pl-10 pr-4 py-2 bg-[#FDFBF7] border border-[#D5D1C5] rounded-md focus:border-[#1B4332] focus:ring-[#1B4332]/20 appearance-none cursor-pointer disabled:opacity-50"
                      >
                        <option value="">Select your city</option>
                        {formData.state &&
                          locationData[formData.state].map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <Input
                        id="village"
                        name="village"
                        type="text"
                        placeholder="Enter your village name"
                        value={formData.village}
                        onChange={handleChange}
                        required
                        disabled={!formData.state}
                        className="pl-10 bg-[#FDFBF7] border-[#D5D1C5] focus:border-[#1B4332] focus:ring-[#1B4332]/20 disabled:opacity-50"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="landSize" className="text-[#1A201C]">
                    Land Size (acres)
                  </Label>
                  <div className="relative">
                    <Input
                      id="landSize"
                      name="landSize"
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="2.5"
                      value={formData.landSize}
                      onChange={handleChange}
                      className="pl-10 bg-[#FDFBF7] border-[#D5D1C5] focus:border-[#1B4332] focus:ring-[#1B4332]/20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A201C]/40 text-sm">
                      acres
                    </span>
                  </div>
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1B4332] hover:bg-[#0F2A1F] text-[#FDFBF7] rounded-full py-5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#FDFBF7]/30 border-t-[#FDFBF7] rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : step === 1 ? (
                <span className="flex items-center gap-2">
                  Next: Location Details
                  <ArrowRight className="w-4 h-4" />
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#1A201C]/60">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[#1B4332] font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-[#1A201C]/40 mt-6">
          By creating an account, you agree to CropConnect's{" "}
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
