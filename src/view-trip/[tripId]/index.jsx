import { db, readDataWithRetry } from "@/service/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import InfoSection from "../components/InfoSection";
import Hotels from "../components/Hotels";
import Itinerary from "../components/Itinerary";

const ViewTrip = () => {
  const { tripId } = useParams();
  const [trip, setTrip] = useState([]);
  const [loading, setLoading] = useState(false);

  // logic to get trip info from firebase
  const GetTripData = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, "AITrips", tripId);
      
      // Use the new readDataWithRetry function
      const tripData = await readDataWithRetry("AITrips", tripId);

      if (tripData) {
        console.log("Document : ", tripData);
        setTrip(tripData);
      } else {
        console.log("No such document");
        toast("No trip found");
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching trip data:", error);
      setLoading(false);
      toast.error("Failed to load trip. Please try again.");
    }
  };

  useEffect(() => {
    GetTripData();
  }, [tripId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading trip details...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      {/* Information Section */}
      <InfoSection trip={trip} />
      {/* Recommended Hotels */}
      <Hotels trip={trip} />
      {/* Daily Plan */}
      <Itinerary trip={trip} />
      {/* Footer (not necessary) */}
    </div>
  );
};

export default ViewTrip;
