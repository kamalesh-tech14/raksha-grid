import BottomNav from "@/components/BottomNav";
import SosButton from "@/components/SosButton";
import QueueBanner from "@/components/QueueBanner";
import RiskToday from "@/components/RiskToday";
import SafetyStatusHero from "@/components/SafetyStatusHero";
import WeatherStrip from "@/components/WeatherStrip";
import NearbyResources from "@/components/NearbyResources";
import TopAlertBanner from "@/components/TopAlertBanner";

export default function HomePage() {
  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-bg-void">
      <header className="safe-top flex items-center justify-between px-5 pb-4 pt-3">
        <div className="flex items-center gap-2 font-display text-[19px] font-bold">
          <span
            className="h-2 w-2 rounded-full bg-accent-cyan shadow-[0_0_8px_theme(colors.accent-cyan)]"
            aria-hidden="true"
          />
          Raksha Grid
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-4">
        <QueueBanner />
        <SafetyStatusHero />
        <TopAlertBanner />
        <RiskToday />
        <WeatherStrip />
        <SosButton ambientSeverity="watch" />
        <NearbyResources />
      </main>

      <BottomNav />
    </div>
  );
}
