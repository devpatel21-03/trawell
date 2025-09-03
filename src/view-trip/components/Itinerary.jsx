import React, { useEffect, useRef } from "react";
import ItineraryCard from "./ItineraryCard";
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const Itinerary = ({ trip }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.querySelectorAll(".itinerary-card"),
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.2,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
          },
        }
      );
    }
  }, [trip]);

  const itinerary = trip?.tripData?.dailyItinerary || [];

  return (
    <div ref={containerRef} className="container mx-auto px-6 py-12 w-4/5">
      <h2 className="text-4xl font-bold text-center mb-8">📍 Places to Visit</h2>
      {itinerary.length === 0 ? (
        <p className="text-center text-gray-500">No itinerary available</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {itinerary.map((item, i) => (
            <div
              key={i}
              className="itinerary-card p-6 bg-white rounded-2xl shadow-lg"
            >
              <h3 className="text-2xl font-semibold mb-4 text-blue-600">
                {item?.day} – <span className="text-gray-600">{item?.bestTime}</span>
              </h3>
              <div className="space-y-6">
                {(item?.plan || []).map((plan, index) => (
                  <ItineraryCard plan={plan} key={index} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Itinerary;
