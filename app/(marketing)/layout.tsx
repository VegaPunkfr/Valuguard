import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: "#FFFFFF", color: "#0F172A", minHeight: "100vh" }}>
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
