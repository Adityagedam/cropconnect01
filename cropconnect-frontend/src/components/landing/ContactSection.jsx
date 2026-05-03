import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Send, Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { useLandingLanguage } from "./LandingLanguageContext";

const API_BASE_URL =
  process.env.REACT_APP_BACKEND_URL || "https://cropconnect01-production.up.railway.app";
const API = `${API_BASE_URL}/api`;

export default function ContactSection() {
  const { t } = useLandingLanguage();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    message: "",
  });
  const [sending, setSending] = useState(false);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in name, email and message.");
      return;
    }
    setSending(true);
    try {
      // Send email via mailto or backend
      const emailBody = `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nOrganization: ${form.organization}\n\nMessage:\n${form.message}`;
      const mailtoLink = `mailto:cropconnectco@gmail.com?subject=CropConnect Enquiry from ${form.name}&body=${encodeURIComponent(emailBody)}`;
      
      // Try API first
      try {
        const response = await axios.post(`${API}/enquiries`, form);
        if (response.data?.email_sent === false) {
          window.location.href = mailtoLink;
        }
      } catch {
        // Fallback to mailto
        window.location.href = mailtoLink;
      }
      
      toast.success("Thanks! We'll get back to you within 24 hours.");
      setForm({ name: "", email: "", phone: "", organization: "", message: "" });
    } catch (err) {
      const msg =
        err?.response?.data?.detail?.[0]?.msg ||
        err?.response?.data?.detail ||
        "Could not send — please try again.";
      toast.error(typeof msg === "string" ? msg : "Something went wrong.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      id="contact"
      data-testid="contact-section"
      className="relative py-16 sm:py-28 bg-[#F4F1EA]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12">
        <div className="lg:col-span-5">
          <span className="eyebrow text-xs sm:text-sm">{t("contactEyebrow")}</span>
          <h2 className="font-display mt-3 text-3xl sm:text-4xl lg:text-5xl leading-tight text-[#1A201C]">
            {t("contactTitle")}
            <br />
            <span className="italic text-[#1B4332]">{t("contactItalic")}</span>
          </h2>
          <p className="mt-5 text-base text-[#1A201C]/70 max-w-md">
            {t("contactBody")}
          </p>

          <div className="mt-10 space-y-5">
            <InfoRow icon={Mail} label="Email" value="cropconnectco@gmail.com" />
            <InfoRow icon={Phone} label="Phone" value="+91 94791 87552" />
            <InfoRow icon={MapPin} label="Based in" value="Pune, Maharashtra · India" />
          </div>
        </div>

        <div className="lg:col-span-7">
          <form
            onSubmit={submit}
            noValidate
            data-testid="enquiry-form"
            className="bg-white border border-[#D5D1C5] rounded-2xl p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
              <Field label="Full name" required>
                <Input
                  data-testid="enquiry-name"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="h-11 bg-[#FDFBF7] border-[#D5D1C5] focus-visible:ring-[#1B4332]"
                />
              </Field>
              <Field label="Email" required>
                <Input
                  data-testid="enquiry-email"
                  type="email"
                  placeholder="you@farm.in"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="h-11 bg-[#FDFBF7] border-[#D5D1C5] focus-visible:ring-[#1B4332]"
                />
              </Field>
              <Field label="Phone">
                <Input
                  data-testid="enquiry-phone"
                  placeholder="+91 ..."
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className="h-11 bg-[#FDFBF7] border-[#D5D1C5] focus-visible:ring-[#1B4332]"
                />
              </Field>
              <Field label="Organization / Farm">
                <Input
                  data-testid="enquiry-organization"
                  placeholder="Optional"
                  value={form.organization}
                  onChange={(e) => update("organization", e.target.value)}
                  className="h-11 bg-[#FDFBF7] border-[#D5D1C5] focus-visible:ring-[#1B4332]"
                />
              </Field>
            </div>

            <Field label="How can we help?" required>
              <Textarea
                data-testid="enquiry-message"
                placeholder="Tell us about your farm, your crop or what you'd like CropConnect to do for you."
                rows={5}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                className="bg-[#FDFBF7] border-[#D5D1C5] focus-visible:ring-[#1B4332]"
              />
            </Field>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 pt-2">
              <p className="text-xs text-[#1A201C]/50 text-center sm:text-left">
                We reply within 24h · your data never leaves our servers.
              </p>
              <Button
                type="submit"
                data-testid="enquiry-submit"
                disabled={sending}
                className="bg-[#1B4332] hover:bg-[#0F2A1F] text-[#FDFBF7] rounded-full h-10 sm:h-11 px-5 sm:px-6 w-full sm:w-auto"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send enquiry
                    <Send className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-[0.18em] text-[#1A201C]/70 font-semibold">
        {label} {required && <span className="text-[#E07A5F]">*</span>}
      </Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-4">
      <span className="w-10 h-10 rounded-full bg-white border border-[#D5D1C5] flex items-center justify-center text-[#1B4332]">
        <Icon className="w-4 h-4" />
      </span>
      <div>
        <div className="eyebrow text-[10px]">{label}</div>
        <div className="mt-0.5 text-[15px] text-[#1A201C]">{value}</div>
      </div>
    </div>
  );
}
