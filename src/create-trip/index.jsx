import React, { useEffect, useState } from "react";
import axios from "axios";
//import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import _ from "lodash";
import { Input } from "@/components/ui/input";
import CustomPlacesAutocomplete from "@/components/CustomPlacesAutocomplete";
import {
  AI_PROMPT,
  SelectBudgetOptions,
  SelectTravelList,
} from "@/constants/options";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sendMessageWithTimeout } from "@/service/AIModel";
import Spinner from "@/components/ui/spinner";
import { logEnvironmentStatus } from "@/utils/envCheck";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useGoogleLogin } from "@react-oauth/google";
import { doc, setDoc } from "firebase/firestore";
import { db, saveDataWithRetry, testFirestoreConnection } from "@/service/firebaseConfig";
import { useNavigate } from "react-router-dom";

const CreateTrip = () => {
  const [place, setPlace] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [formData, setFormData] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const navigate = useNavigate();

  // Log environment status on component mount
  useEffect(() => {
    logEnvironmentStatus();
  }, []);

  const handleInputChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  useEffect(() => {
    console.log(formData);
  }, [formData]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor Firebase connection status
  useEffect(() => {
    const checkFirebaseConnection = async () => {
      try {
        const isConnected = await testFirestoreConnection();
        setFirebaseConnected(isConnected);
      } catch (error) {
        console.error("Firebase connection check failed:", error);
        setFirebaseConnected(false);
      }
    };

    checkFirebaseConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkFirebaseConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => GetUserProfile(tokenResponse),
    onError: (error) => console.log(error),
  });

  const handleSelect = _.debounce((value) => {
    setPlace(value);
    handleInputChange("location", value);
  }, 1000);

  const onGenerateTrip = async () => {
    const user = localStorage.getItem("user");

    if (!user) {
      setOpenDialog(true);
      return;
    }

    // Validate user data
    try {
      const userData = JSON.parse(user);
      if (!userData.email) {
        throw new Error("Invalid user data");
      }
      
      // Check if user data is recent (not older than 24 hours)
      const userTimestamp = userData.timestamp || 0;
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      if (now - userTimestamp > twentyFourHours) {
        console.log("User data is too old, requiring re-authentication");
        localStorage.removeItem("user");
        setOpenDialog(true);
        return;
      }
    } catch (error) {
      console.error("Invalid user data:", error);
      localStorage.removeItem("user");
      setOpenDialog(true);
      return;
    }

    if (formData?.noOfDays > 7) {
      toast("Please enter no. of days less than 8");
      return;
    }
    if (
      !formData?.noOfDays ||
      !formData?.location ||
      !formData?.budget ||
      !formData?.noOfPeople
    ) {
      toast("Please enter all the details");
      return;
    }
    
    try {
      setLoading(true);
      setLoadingStep("Generating AI travel plan...");
      
      // Check if API key is available
      const apiKey = import.meta.env.VITE_GOOGLE_GEMINI_AI_API_KEY;
      if (!apiKey) {
        throw new Error("Google Gemini AI API key is not configured");
      }
      
      const FINAL_PROMPT = AI_PROMPT.replace(
        "{location}",
        formData?.location?.label
      )
        .replace("{totalDays}", formData?.noOfDays)
        .replace("{traveler}", formData?.noOfPeople)
        .replace("{budget}", formData?.budget)
        .replace("{totalDays}", formData?.noOfDays);

      console.log("Sending prompt to AI:", FINAL_PROMPT);
      console.log("API Key available:", !!apiKey);
      
      // Try up to 3 times with exponential backoff
      let result;
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          result = await sendMessageWithTimeout(FINAL_PROMPT, 45000); // 45 second timeout
          console.log("AI Response:", result?.response?.text());
          break; // Success, exit the retry loop
        } catch (error) {
          lastError = error;
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt < 3) {
            setLoadingStep(`Retrying... (Attempt ${attempt + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
          }
        }
      }
      
      if (!result) {
        throw lastError || new Error("All attempts to generate trip failed");
      }
      
      if (!result?.response?.text()) {
        throw new Error("No response received from AI");
      }
      
      // Validate that the response contains JSON
      const responseText = result.response.text();
      if (!responseText.includes('{') || !responseText.includes('}')) {
        throw new Error("AI response is not in valid JSON format");
      }
      
      setLoadingStep("Saving trip to database...");
      await SaveAiTrip(responseText);
    } catch (error) {
      console.error("Error generating trip:", error);
      setLoading(false);
      setLoadingStep("");
      
      let errorMessage = "Failed to generate trip. Please try again.";
      if (error.message.includes("API key")) {
        errorMessage = "AI service is not properly configured. Please contact support.";
      } else if (error.message.includes("timed out")) {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.message.includes("JSON format")) {
        errorMessage = "Received invalid response from AI. Please try again.";
      }
      
      toast.error(errorMessage);
    }
  };

  const GetUserProfile = (tokenInfo) => {
    axios
      .get(
        `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokenInfo.access_token}`,
        {
          headers: {
            Authorization: `Bearer ${tokenInfo.access_token}`,
            Accept: "application/json",
          },
        }
      )
      .then((resp) => {
        console.log(resp.data);
        // Add timestamp to user data
        const userDataWithTimestamp = {
          ...resp.data,
          timestamp: Date.now()
        };
        localStorage.setItem("user", JSON.stringify(userDataWithTimestamp));
        setOpenDialog(false);
        onGenerateTrip();
      })
      .catch((error) => {
        console.error("Error fetching user profile:", error);
      });
  };

  const SaveAiTrip = async (TripData) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const docId = Date.now().toString();
      
      // Test Firestore connection first
      setLoadingStep("Testing database connection...");
      const isConnected = await testFirestoreConnection();
      if (!isConnected) {
        throw new Error("Database connection failed");
      }
      
      // Try to parse the AI response as JSON
      let parsedTripData;
      try {
        parsedTripData = JSON.parse(TripData);
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        console.log("Raw AI response:", TripData);
        toast.error("Invalid response format from AI. Please try again.");
        setLoading(false);
        setLoadingStep("");
        return;
      }
      
      setLoadingStep("Saving trip data...");
      const tripData = {
        userChoice: formData,
        tripData: parsedTripData,
        userEmail: user?.email,
        id: docId,
        createdAt: new Date().toISOString(),
      };
      
      // Use retry logic for saving data
      await saveDataWithRetry("AITrips", docId, tripData, 3);
      
      setLoading(false);
      setLoadingStep("");
      toast.success("Trip generated successfully!");
      navigate("/view-trip/" + docId);
    } catch (error) {
      console.error("Error saving trip:", error);
      setLoading(false);
      setLoadingStep("");
      
      let errorMessage = "Failed to save trip. Please try again.";
      if (error.message.includes("Database connection failed")) {
        errorMessage = "Database connection failed. Please check your internet connection.";
      } else if (error.message.includes("permission")) {
        errorMessage = "Permission denied. Please sign in again.";
      } else if (error.message.includes("quota")) {
        errorMessage = "Database quota exceeded. Please try again later.";
      }
      
      toast.error(errorMessage);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center bg-gradient-to-b from-blue-100 to-gray-100 min-h-screen py-8 px-4">
      {/* Heading */}
      <div className="mt-8 text-center w-full max-w-2xl">
        <h1 className="font-bold text-blue-900 text-4xl mb-4">
          Travel Preferences 🚢✈️⛱️
        </h1>
        <p className="text-gray-700 text-lg mb-8">
          Help us understand your travel plans by providing some details below.
          This information will help us tailor recommendations and make your
          travel experience as enjoyable as possible.
        </p>
      </div>

      {/* Destination Choice */}
      <div className="flex flex-col w-full max-w-2xl mb-8">
        <label className="text-black text-2xl font-semibold mb-2">
          What is your Destination?
        </label>
        <CustomPlacesAutocomplete onSelect={handleSelect} />
      </div>

      {/* Number of Days */}
      <div className="flex flex-col w-full max-w-2xl mb-8">
        <label className="text-black text-2xl font-semibold mb-2">
          For how many days are you planning?
        </label>
        <Input
          placeholder="e.g., 6"
          type="number"
          onChange={(e) => handleInputChange("noOfDays", e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      {/* Budget */}
      <div className="flex flex-col w-full max-w-2xl mb-8">
        <h2 className="text-black text-2xl font-semibold mb-4">
          What is your budget?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SelectBudgetOptions.map((item, index) => (
            <div
              key={index}
              className={`rounded-xl border-2 border-transparent hover:border-blue-500 hover:bg-white transition-all duration-300 p-6 cursor-pointer ${
                formData?.budget === item.title
                  ? "shadow-lg bg-blue-600 text-white"
                  : "bg-white"
              }`}
              onClick={() => handleInputChange("budget", item.title)}
            >
              <div className="flex flex-col items-center text-center">
                <div className="text-4xl mb-2">{item.icon}</div>
                <h2 className="text-lg font-bold mb-1">{item.title}</h2>
                <p className="text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Number of People */}
      <div className="flex flex-col w-full max-w-2xl mb-8">
        <h2 className="text-black text-2xl font-semibold mb-4">
          Who do you plan on travelling with?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SelectTravelList.map((item, index) => (
            <div
              key={index}
              className={`rounded-xl border-2 border-transparent hover:border-blue-500 hover:bg-white transition-all duration-300 p-6 cursor-pointer ${
                formData?.noOfPeople === item.people
                  ? "shadow-lg bg-blue-600 text-white"
                  : "bg-white"
              }`}
              onClick={() => handleInputChange("noOfPeople", item.people)}
            >
              <div className="flex items-center justify-center">
                <div className="text-4xl mr-2">{item.icon}</div>
                <h2 className="text-lg font-bold">{item.title}</h2>
              </div>
              <p className="text-center mt-2">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Loading Step Indicator */}
      {loading && loadingStep && (
        <div className="flex justify-center w-full max-w-2xl mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span className="text-blue-700 font-medium">{loadingStep}</span>
            </div>
          </div>
        </div>
      )}

      {/* Network Status Indicator */}
      {!isOnline && (
        <div className="flex justify-center w-full max-w-2xl mb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-red-700 font-medium">You are offline. Please check your internet connection.</span>
            </div>
          </div>
        </div>
      )}

      {/* Firebase Connection Status Indicator */}
      {!firebaseConnected && isOnline && (
        <div className="flex justify-center w-full max-w-2xl mb-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-700 font-medium">Database connection issue. Trying to reconnect...</span>
            </div>
          </div>
        </div>
      )}

      {/* Generate Trip Button */}
      <div className="flex justify-center w-full max-w-2xl">
        <Button
          onClick={onGenerateTrip}
          disabled={loading || !isOnline || !firebaseConnected}
          className="w-full py-3 text-lg"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span>Generating Trip...</span>
            </div>
          ) : !isOnline ? (
            "No Internet Connection"
          ) : !firebaseConnected ? (
            "Database Not Connected"
          ) : (
            "Generate Trip"
          )}
        </Button>
      </div>

      {/* Sign In Dialog */}
      <Dialog open={openDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign In</DialogTitle>
            <DialogDescription>
              <div className="flex flex-col items-center">
                <img src="/logo.png" alt="Logo" className="w-20 mb-4" />
                <span>Sign in with Google Authentication securely</span>
                <Button onClick={login} className="w-full mt-5">
                  Sign in with Google
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateTrip;
