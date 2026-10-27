"use client";

import dynamic from "next/dynamic";

export default dynamic(() => import("@/components/maps/FleetMap"), { ssr: false, loading: () => <div className="h-[380px] animate-pulse rounded-xl bg-lama-cloud" /> });
