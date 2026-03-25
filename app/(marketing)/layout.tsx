import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-theme="warm" style={{ background: "#FAF9F7", color: "#1A1A1A", minHeight: "100vh" }}>
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
