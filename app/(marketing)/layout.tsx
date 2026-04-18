import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background:
          "radial-gradient(ellipse at top, #0a0f1a 0%, #060912 55%, #04060c 100%)",
        color: "#E2E8F0",
        minHeight: "100vh",
        position: "relative",
      }}
    >
      <a href="#main-content" className="gt-skip-link">Skip to main content</a>
      <Navbar />
      <main id="main-content">{children}</main>
      <Footer />
    </div>
  );
}
