"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Shield,
  Lock,
  CheckCircle,
  Clock,
  FileText,
  AlertCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { c, f } from "@/lib/tokens";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

/* ═══════════════════════════════════════════════════
   PRODUCT CONFIG
   ═══════════════════════════════════════════════════ */

const PRODUCTS: Record<
  string,
  {
    name: string;
    deliverables: string[];
    delivery: string;
    guarantee: string;
  }
> = {
  A: {
    name: "Financial Exposure Detection",
    deliverables: [
      "Full SaaS, AI & Cloud exposure map",
      "Vendor overlap & redundancy analysis",
      "Shadow IT inventory",
      "License waste quantification",
      "Board-ready Decision Pack (PDF)",
      "Recovery paths with EUR amounts",
    ],
    delivery: "48 hours",
    guarantee: "If we find zero exposure, you pay nothing. Full refund.",
  },
  B_STABILIZE: {
    name: "Stabilization Protocol 30/60/90",
    deliverables: [
      "Everything in Detection",
      "30/60/90-day corrective roadmap",
      "Vendor negotiation playbooks",
      "License optimization scripts",
      "Consolidation priority matrix",
    ],
    delivery: "5 business days",
    guarantee: "If we find zero exposure, you pay nothing. Full refund.",
  },
};

/* ═══════════════════════════════════════════════════
   PAYMENT FORM (inside Elements provider)
   ═══════════════════════════════════════════════════ */

function PaymentForm({
  amount,
  currency,
  productName,
  onSuccess,
}: {
  amount: number;
  currency: string;
  productName: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Payment failed.");
      setProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/success?source=custom_checkout`,
      },
    });

    if (confirmError) {
      setError(confirmError.message || "Payment failed. Please try again.");
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  const fmtAmount =
    currency === "usd"
      ? `$${amount.toLocaleString("en-US")}`
      : `${amount.toLocaleString("de-DE")} €`;

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          marginBottom: 24,
          padding: "20px",
          borderRadius: 12,
          border: `1px solid ${c.border}`,
          background: "#fff",
        }}
      >
        <PaymentElement
          options={{
            layout: "tabs",
            business: { name: "Ghost Tax" },
          }}
        />
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "12px 16px",
            borderRadius: 10,
            background: c.redBg,
            border: `1px solid ${c.redBd}`,
            marginBottom: 16,
          }}
        >
          <AlertCircle size={16} color={c.red} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: c.red, lineHeight: 1.5 }}>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        style={{
          width: "100%",
          padding: "16px 0",
          borderRadius: 10,
          border: "none",
          background: processing ? c.text3 : c.accent,
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          cursor: processing ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          letterSpacing: "0.02em",
          transition: "background 200ms",
        }}
      >
        {processing ? (
          <>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            Processing...
          </>
        ) : (
          <>
            <Lock size={16} />
            Pay {fmtAmount}
          </>
        )}
      </button>

      {/* Trust signals under CTA */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 20,
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        {[
          { icon: <Lock size={11} />, text: "256-bit SSL" },
          { icon: <Shield size={11} />, text: "SOC 2" },
          { icon: <FileText size={11} />, text: "Invoice included" },
        ].map((t) => (
          <div
            key={t.text}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontFamily: f.mono,
              color: c.text4,
              letterSpacing: ".04em",
            }}
          >
            {t.icon}
            {t.text}
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN CHECKOUT PAGE
   ═══════════════════════════════════════════════════ */

function CheckoutContent() {
  const searchParams = useSearchParams();
  const rail = searchParams.get("rail") === "B_STABILIZE" ? "B_STABILIZE" : "A";
  const locale = searchParams.get("locale") || "en";
  const domain = searchParams.get("domain") || undefined;
  const email = searchParams.get("email") || undefined;
  const companyName = searchParams.get("company") || undefined;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<{
    amount: number;
    baseAmount: number;
    discount: number;
    appliedPromo: string | null;
    currency: string;
    productName: string;
  } | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [initError, setInitError] = useState(false);
  const [success, setSuccess] = useState(false);

  const product = PRODUCTS[rail];

  const createPaymentIntent = useCallback(
    async (promoCode?: string) => {
      try {
        const res = await fetch("/api/stripe/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rail,
            locale,
            email,
            domain,
            companyName,
            promoCode,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.code?.startsWith("PROMO_")) {
            setPromoError(data.error);
            return false;
          }
          setInitError(true);
          return false;
        }

        setClientSecret(data.clientSecret);
        setPaymentData({
          amount: data.amount,
          baseAmount: data.baseAmount,
          discount: data.discount,
          appliedPromo: data.appliedPromo,
          currency: data.currency,
          productName: data.productName,
        });
        setPromoError(null);
        return true;
      } catch {
        setInitError(true);
        return false;
      }
    },
    [rail, locale, email, domain, companyName]
  );

  // Initial load
  useEffect(() => {
    createPaymentIntent();
  }, [createPaymentIntent]);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    await createPaymentIntent(promoInput.trim());
    setPromoLoading(false);
  };

  const fmtPrice = (n: number, cur: string) =>
    cur === "usd"
      ? `$${n.toLocaleString("en-US")}`
      : `${n.toLocaleString("de-DE")} €`;

  if (success) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: c.surface,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <CheckCircle size={48} color={c.green} />
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginTop: 16,
              color: c.text1,
            }}
          >
            Payment confirmed
          </h1>
          <p style={{ color: c.text2, marginTop: 8 }}>Redirecting...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: c.surface,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <AlertCircle size={40} color={c.red} />
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              marginTop: 16,
              color: c.text1,
            }}
          >
            Unable to load checkout
          </h1>
          <p style={{ color: c.text2, marginTop: 8, fontSize: 14 }}>
            Please try again or contact audits@ghost-tax.com
          </p>
          <a
            href="/pricing"
            style={{
              display: "inline-block",
              marginTop: 20,
              color: c.accent,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ← Back to pricing
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: c.surface }}>
      {/* Minimal header */}
      <div
        style={{
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${c.border}`,
          background: "#fff",
        }}
      >
        <a
          href="/pricing"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: c.text3,
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={14} />
          Back
        </a>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: c.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 800,
              color: "#fff",
              fontFamily: f.mono,
            }}
          >
            GT
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: c.text1,
              letterSpacing: "-0.01em",
            }}
          >
            Ghost Tax
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 10,
            fontFamily: f.mono,
            color: c.green,
          }}
        >
          <Lock size={10} />
          Secure checkout
        </div>
      </div>

      {/* Two-column layout */}
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "40px 24px",
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gap: 40,
          alignItems: "start",
        }}
      >
        {/* ─── LEFT: Order summary ─── */}
        <div>
          {/* Product header */}
          <div style={{ marginBottom: 32 }}>
            <p
              style={{
                fontSize: 10,
                fontFamily: f.mono,
                color: c.text4,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              YOUR ORDER
            </p>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: c.text1,
                letterSpacing: "-0.03em",
                lineHeight: 1.2,
                marginBottom: 6,
              }}
            >
              {product.name}
            </h1>
            {domain && (
              <p
                style={{
                  fontSize: 13,
                  fontFamily: f.mono,
                  color: c.text3,
                }}
              >
                Target: {domain}
              </p>
            )}
          </div>

          {/* What's included */}
          <div
            style={{
              padding: "24px",
              borderRadius: 14,
              border: `1px solid ${c.border}`,
              background: "#fff",
              marginBottom: 24,
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontFamily: f.mono,
                color: c.text4,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                marginBottom: 16,
                fontWeight: 600,
              }}
            >
              WHAT YOU RECEIVE
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {product.deliverables.map((d) => (
                <div
                  key={d}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <CheckCircle
                    size={15}
                    color={c.green}
                    strokeWidth={2.5}
                    style={{ flexShrink: 0, marginTop: 1 }}
                  />
                  <span style={{ fontSize: 14, color: c.text2, lineHeight: 1.5 }}>
                    {d}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery & Guarantee */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                padding: "16px",
                borderRadius: 12,
                background: "#fff",
                border: `1px solid ${c.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <Clock size={14} color={c.accent} />
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: f.mono,
                    color: c.text4,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  DELIVERY
                </span>
              </div>
              <p
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  fontFamily: f.mono,
                  color: c.text1,
                }}
              >
                {product.delivery}
              </p>
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: 12,
                background: c.greenBg,
                border: `1px solid ${c.greenBd}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <Shield size={14} color={c.green} />
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: f.mono,
                    color: c.green,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  GUARANTEE
                </span>
              </div>
              <p style={{ fontSize: 12, color: c.green, lineHeight: 1.5, fontWeight: 500 }}>
                {product.guarantee}
              </p>
            </div>
          </div>

          {/* Social proof */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: 12,
              background: "#fff",
              border: `1px solid ${c.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontFamily: f.mono,
                  color: c.text4,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                }}
              >
                Trusted by
              </span>
              {["Mirakl", "ContentSquare", "PayFit", "Alan", "Spendesk"].map(
                (name) => (
                  <span
                    key={name}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: c.text3,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {name}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Payment column ─── */}
        <div
          style={{
            position: "sticky",
            top: 24,
          }}
        >
          <div
            style={{
              padding: "28px",
              borderRadius: 16,
              background: "#fff",
              border: `1px solid ${c.border}`,
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            }}
          >
            {/* Price summary */}
            {paymentData && (
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 14, color: c.text2 }}>
                    {paymentData.productName}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontFamily: f.mono,
                      color: paymentData.discount > 0 ? c.text4 : c.text1,
                      textDecoration:
                        paymentData.discount > 0 ? "line-through" : "none",
                      fontWeight: 600,
                    }}
                  >
                    {fmtPrice(paymentData.baseAmount, paymentData.currency)}
                  </span>
                </div>

                {paymentData.discount > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: c.green,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <CheckCircle size={12} />
                      {paymentData.appliedPromo}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontFamily: f.mono,
                        color: c.green,
                        fontWeight: 600,
                      }}
                    >
                      −{fmtPrice(paymentData.discount, paymentData.currency)}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    borderTop: `1px solid ${c.border}`,
                    paddingTop: 12,
                    marginTop: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: c.text1,
                    }}
                  >
                    Total
                  </span>
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      fontFamily: f.mono,
                      color: c.text1,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {fmtPrice(paymentData.amount, paymentData.currency)}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: c.text4,
                    textAlign: "right",
                    fontFamily: f.mono,
                    marginTop: 4,
                  }}
                >
                  One-time payment · No subscription
                </p>
              </div>
            )}

            {/* Promo code input */}
            {!paymentData?.appliedPromo && (
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <input
                    type="text"
                    placeholder="Promo code"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${promoError ? c.redBd : c.border}`,
                      fontSize: 13,
                      fontFamily: f.mono,
                      color: c.text1,
                      background: "#fff",
                      outline: "none",
                      letterSpacing: ".06em",
                    }}
                  />
                  <button
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 8,
                      border: `1px solid ${c.border}`,
                      background: c.surface,
                      color: c.text2,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor:
                        promoLoading || !promoInput.trim()
                          ? "not-allowed"
                          : "pointer",
                      opacity: promoLoading ? 0.6 : 1,
                    }}
                  >
                    {promoLoading ? "..." : "Apply"}
                  </button>
                </div>
                {promoError && (
                  <p
                    style={{
                      fontSize: 11,
                      color: c.red,
                      marginTop: 6,
                      fontFamily: f.mono,
                    }}
                  >
                    {promoError}
                  </p>
                )}
              </div>
            )}

            {/* Stripe Payment Element */}
            {clientSecret ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#0F172A",
                      colorBackground: "#FFFFFF",
                      colorText: "#0F172A",
                      colorDanger: "#DC2626",
                      fontFamily:
                        "system-ui, -apple-system, sans-serif",
                      borderRadius: "10px",
                      spacingUnit: "4px",
                      fontSizeBase: "14px",
                    },
                    rules: {
                      ".Input": {
                        border: `1px solid ${c.borderS}`,
                        boxShadow: "none",
                        padding: "12px 14px",
                      },
                      ".Input:focus": {
                        border: `1px solid ${c.accent}`,
                        boxShadow: `0 0 0 3px rgba(15,23,42,0.08)`,
                      },
                      ".Label": {
                        fontWeight: "600",
                        fontSize: "12px",
                        letterSpacing: "0.04em",
                        color: c.text3,
                      },
                      ".Tab": {
                        border: `1px solid ${c.border}`,
                        boxShadow: "none",
                      },
                      ".Tab--selected": {
                        border: `1px solid ${c.accent}`,
                        boxShadow: "none",
                      },
                    },
                  },
                }}
              >
                <PaymentForm
                  amount={paymentData!.amount}
                  currency={paymentData!.currency}
                  productName={paymentData!.productName}
                  onSuccess={() => setSuccess(true)}
                />
              </Elements>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "40px 0",
                }}
              >
                <Loader2
                  size={24}
                  color={c.text4}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              </div>
            )}
          </div>

          {/* Security footer */}
          <div
            style={{
              marginTop: 16,
              padding: "14px 20px",
              borderRadius: 12,
              background: "#fff",
              border: `1px solid ${c.border}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Shield size={18} color={c.green} />
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: c.text1,
                  marginBottom: 2,
                }}
              >
                Enterprise-grade security
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: c.text4,
                  fontFamily: f.mono,
                  lineHeight: 1.5,
                }}
              >
                PCI DSS Level 1 · 256-bit encryption · Zero data storage ·
                Powered by Stripe
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 420px"] {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: c.surface,
          }}
        >
          <Loader2
            size={32}
            color={c.text4}
            style={{ animation: "spin 1s linear infinite" }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
