"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Key, Home, Bed, Bath, Square, MapPin, CheckCircle, UploadCloud, AlertCircle } from "lucide-react";

export default function MlsImportMock() {
  const [mlsNumber, setMlsNumber] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleFetch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mlsNumber) return;
    
    setStatus("loading");
    
    // Simulate API delay
    setTimeout(() => {
      setStatus("success");
    }, 2000);
  };

  const reset = () => {
    setMlsNumber("");
    setStatus("idle");
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-vision-surface/50 border border-gray-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-vision-green/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Activation Pill */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-800/50">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-vision-green" />
            MLS Auto-Import
          </h2>
          <p className="text-gray-400 mt-1 text-sm">
            Save time by instantly pulling property data from the MLS registry.
          </p>
        </div>
        
        {/* The Pill requested by the CEO */}
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-full text-yellow-500 text-sm font-medium">
          <Key className="w-4 h-4" />
          <span>To activate system, get a Realty Mole account</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.form 
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleFetch}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="text"
                value={mlsNumber}
                onChange={(e) => setMlsNumber(e.target.value)}
                placeholder="Enter MLS # (e.g. 12345678) or Address"
                className="w-full pl-12 pr-4 py-4 bg-vision-black/50 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-vision-green focus:border-transparent transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!mlsNumber}
              className="px-8 py-4 bg-vision-green hover:bg-vision-green-dark text-vision-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2"
            >
              Fetch Data
            </button>
          </motion.form>
        )}

        {status === "loading" && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-12 flex flex-col items-center justify-center text-center space-y-4"
          >
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-800 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-vision-green border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
              <Search className="w-6 h-6 text-vision-green absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <h3 className="text-white font-medium text-lg">Querying MLS Database...</h3>
              <p className="text-gray-400 text-sm">Locating property records and images for #{mlsNumber}</p>
            </div>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-vision-black/40 border border-vision-green/30 rounded-xl p-6"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-vision-green/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-vision-green" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Property Found</h3>
                  <p className="text-vision-green text-sm font-medium">Data successfully imported</p>
                </div>
              </div>
              <button 
                onClick={reset}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Start Over
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Mock Image */}
              <div className="md:col-span-1 rounded-lg overflow-hidden bg-gray-900 aspect-[4/3] relative">
                <img 
                  src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=80" 
                  alt="Property" 
                  className="object-cover w-full h-full opacity-80"
                />
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-medium">
                  Primary Image
                </div>
              </div>

              {/* Mock Data */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">1234 Luxury Lane</p>
                    <p className="text-gray-400 text-sm">Beverly Hills, CA 90210</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-800">
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-500 text-xs uppercase flex items-center gap-1"><Bed className="w-3 h-3" /> Beds</span>
                    <span className="text-white font-semibold">4</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-500 text-xs uppercase flex items-center gap-1"><Bath className="w-3 h-3" /> Baths</span>
                    <span className="text-white font-semibold">3.5</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-500 text-xs uppercase flex items-center gap-1"><Square className="w-3 h-3" /> SqFt</span>
                    <span className="text-white font-semibold">3,250</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-gray-500 text-xs uppercase block mb-1">List Price</span>
                    <span className="text-2xl text-vision-green font-bold">$2,450,000</span>
                  </div>
                  <button className="px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors">
                    Continue to Form →
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-center gap-2 text-xs text-yellow-500/80 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
               <AlertCircle className="w-4 h-4 shrink-0" />
               <p><strong>Note:</strong> This is a mock preview. Activating Realty Mole API will connect this to live national MLS databases.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
