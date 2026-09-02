import React, { useState, useEffect } from 'react';
import { Gift, GiftOrder, Rsvp } from './types';
import { fetchGifts, fetchRsvps, fetchOrders } from './services/api';
import { JasmineSvgDefs } from './components/FloralMotifs';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { StorySection } from './components/StorySection';
import { DetailsSection } from './components/DetailsSection';
import { GiftRegistrySection } from './components/GiftRegistrySection';
import { GiftCheckoutModal } from './components/GiftCheckoutModal';
import { RsvpSection } from './components/RsvpSection';
import { AdminModal } from './components/AdminModal';
import { CheckupModal } from './components/CheckupModal';
import { ReturnBanner } from './components/ReturnBanner';
import { Footer } from './components/Footer';

export const App: React.FC = () => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [orders, setOrders] = useState<GiftOrder[]>([]);

  // Modals
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [checkupOpen, setCheckupOpen] = useState(false);

  const loadAllData = async () => {
    try {
      const [giftsData, rsvpsData, ordersData] = await Promise.all([
        fetchGifts(),
        fetchRsvps(),
        fetchOrders()
      ]);
      setGifts(giftsData);
      setRsvps(rsvpsData);
      setOrders(ordersData);
    } catch (e) {
      console.error('Error loading wedding data:', e);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F1E6] text-[#3A2E22]">
      {/* SVG Global Jasmine Definitions */}
      <JasmineSvgDefs />

      {/* Stripe and Payment Return Alerts */}
      <ReturnBanner onPaymentApproved={loadAllData} />

      {/* Romantic Navigation Bar */}
      <Navbar
        onOpenAdmin={() => setAdminOpen(true)}
        onOpenCheckup={() => setCheckupOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* 1. Hero & Live Wedding Countdown */}
        <HeroSection />

        {/* 2. Story / Heartfelt message from Couple */}
        <StorySection />

        {/* 3. Event Details (Date, Time, Venue, Maps & Calendar .ics download) */}
        <DetailsSection />

        {/* 4. Gift Registry (Filters, Search, Status Badges & Checkout Trigger) */}
        <GiftRegistrySection
          gifts={gifts}
          orders={orders}
          onSelectGift={gift => setSelectedGift(gift)}
        />

        {/* 5. RSVP Confirmation (Live attendee counter, guest count selector, message) */}
        <RsvpSection
          rsvps={rsvps}
          onRsvpSuccess={loadAllData}
        />
      </main>

      {/* Footer */}
      <Footer
        onOpenAdmin={() => setAdminOpen(true)}
        onOpenCheckup={() => setCheckupOpen(true)}
      />

      {/* Gift Checkout & Payment Modal */}
      {selectedGift && (
        <GiftCheckoutModal
          gift={selectedGift}
          onClose={() => setSelectedGift(null)}
          onSuccess={loadAllData}
        />
      )}

      {/* Admin Portal Modal */}
      <AdminModal
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        gifts={gifts}
        rsvps={rsvps}
        orders={orders}
        onRefreshData={loadAllData}
      />

      {/* System Checkup Modal */}
      <CheckupModal
        isOpen={checkupOpen}
        onClose={() => setCheckupOpen(false)}
        giftsCount={gifts.length}
        rsvpsCount={rsvps.length}
        ordersCount={orders.length}
      />
    </div>
  );
};
