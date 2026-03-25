import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-theme="warm" style={{ background: "#FAF9F7", color: "#1A1A1A", minHeight: "100vh" }}>
      <a href="#main-content" className="gt-skip-link">Skip to main content</a>
      <Navbar />
      <main id="main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
}
