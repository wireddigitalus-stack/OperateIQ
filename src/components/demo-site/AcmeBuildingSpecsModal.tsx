"use client";

import React from "react";
import Image from "next/image";
import {
  Building2, MapPin, X, CheckCircle2, Wifi, ShieldCheck,
  Calendar, Layers, ArrowUpRight, Award, Zap
} from "lucide-react";
import { PROPERTIES } from "@/lib/data";

interface AcmeBuildingSpecsModalProps {
  propertyId: string | null;
  onClose: () => void;
  onOpenTourModal: (propertyId: string) => void;
  properties?: any[];
}

export default function AcmeBuildingSpecsModal({
  propertyId,
  onClose,
  onOpenTourModal,
  properties,
}: AcmeBuildingSpecsModalProps) {
  if (!propertyId) return null;

  const propList = properties ?? PROPERTIES; // demo data only when no list is passed (/demo-site)
  const property = propList.find((p) => p.id === propertyId) || propList[0];
  if (!property) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#080C14] border border-white/20 shadow-[0_0_50px_rgba(56,189,248,0.2)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0A1020]/90">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/10 border border-sky-400/30 text-sky-300">
              {property.type}
            </span>
            <h3 className="text-base font-bold text-white tracking-wide">
              {property.name} — Asset Specifications
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Visual */}
          <div className="relative h-64 sm:h-80 w-full rounded-2xl overflow-hidden border border-white/10 shadow-lg">
            <Image
              src={property.image}
              alt={property.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080C14] via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="text-sm font-bold text-white bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
                {property.address}
              </span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-400/30">
                Contiguous RSF: {property.sqft}
              </span>
            </div>
          </div>

          {/* Description & Overview */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Asset Overview
            </h4>
            <p className="text-sm text-gray-200 leading-relaxed">
              {property.description}
            </p>
          </div>

          {/* Core Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-center">
              <p className="text-[10px] text-gray-400 uppercase font-bold">Total RSF Range</p>
              <p className="text-sm font-bold text-white mt-1">{property.sqft}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-center">
              <p className="text-[10px] text-gray-400 uppercase font-bold">Submarket</p>
              <p className="text-sm font-bold text-sky-400 mt-1">{property.city}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-center">
              <p className="text-[10px] text-gray-400 uppercase font-bold">Lease Type</p>
              <p className="text-sm font-bold text-emerald-400 mt-1">Direct NNN</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-center">
              <p className="text-[10px] text-gray-400 uppercase font-bold">Fiber Connectivity</p>
              <p className="text-sm font-bold text-purple-400 mt-1">Dual Dark Fiber</p>
            </div>
          </div>

          {/* Building Amenities & Engineering Highlights */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Building Amenities & Engineering Systems
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {((property as any).features || (property as any).highlights || []).map((feat: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center gap-2.5 text-xs text-gray-200"
                >
                  <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                  <span>{String(feat)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#0A1020]/95">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/15 text-gray-300 hover:text-white text-xs font-semibold transition-all"
          >
            Close Specs
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenTourModal(property.id);
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-95 transition-all flex items-center gap-1.5"
          >
            <Calendar size={13} />
            <span>Schedule Private Tour of {property.name}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
