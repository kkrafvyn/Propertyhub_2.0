export interface PracticeEstate {
  id: string;
  name: string;
  location: string;
  totalUnits: number;
  occupancyRatePct: number;
  monthlyRevenueGhs: number;
  units: Array<{
    unitCode: string;
    type: "1BR Apartment" | "2BR Luxury" | "3BR Penthouse" | "4BR Executive Villa";
    tenantName: string;
    monthlyRentGhs: number;
    arrearsGhs: number;
    status: "OCCUPIED" | "VACANT" | "MAINTENANCE";
    meterNo: string;
  }>;
}

export const PRACTICE_SANDBOX_ESTATES: PracticeEstate[] = [
  {
    id: "practice-estate-01",
    name: "East Legon Hills Prime Sanctuary",
    location: "East Legon Hills, Greater Accra",
    totalUnits: 12,
    occupancyRatePct: 91.6,
    monthlyRevenueGhs: 84000,
    units: [
      {
        unitCode: "ELH-A01",
        type: "4BR Executive Villa",
        tenantName: "Dr. Kwabena Addo",
        monthlyRentGhs: 12000,
        arrearsGhs: 0,
        status: "OCCUPIED",
        meterNo: "ECG-GH-981203",
      },
      {
        unitCode: "ELH-A02",
        type: "3BR Penthouse",
        tenantName: "Ama Serwaa Mensah",
        monthlyRentGhs: 8500,
        arrearsGhs: 8500, // 1 month overdue for practice collections
        status: "OCCUPIED",
        meterNo: "ECG-GH-981204",
      },
      {
        unitCode: "ELH-A03",
        type: "2BR Luxury",
        tenantName: "Emmanuel Boateng",
        monthlyRentGhs: 5500,
        arrearsGhs: 0,
        status: "OCCUPIED",
        meterNo: "ECG-GH-981205",
      },
      {
        unitCode: "ELH-A04",
        type: "2BR Luxury",
        tenantName: "Vacant (Ready for Lease Screening)",
        monthlyRentGhs: 6000,
        arrearsGhs: 0,
        status: "VACANT",
        meterNo: "ECG-GH-981206",
      },
    ],
  },
  {
    id: "practice-estate-02",
    name: "Cantonments Signature Enclaves",
    location: "Cantonments, Accra",
    totalUnits: 8,
    occupancyRatePct: 100,
    monthlyRevenueGhs: 72000,
    units: [
      {
        unitCode: "CS-101",
        type: "2BR Luxury",
        tenantName: "Jessica Sutherland",
        monthlyRentGhs: 9000,
        arrearsGhs: 0,
        status: "OCCUPIED",
        meterNo: "ECG-GH-552109",
      },
      {
        unitCode: "CS-102",
        type: "2BR Luxury",
        tenantName: "Michael Osei",
        monthlyRentGhs: 9000,
        arrearsGhs: 27000, // 3 months overdue for practice legal notice
        status: "OCCUPIED",
        meterNo: "ECG-GH-552110",
      },
    ],
  },
];

export const practiceModeService = {
  isPracticeMode(): boolean {
    return localStorage.getItem("bm_practice_mode") === "true";
  },

  setPracticeMode(enabled: boolean) {
    localStorage.setItem("bm_practice_mode", enabled ? "true" : "false");
    window.dispatchEvent(new CustomEvent("bm-practice-mode-changed", { detail: enabled }));
  },

  getSampleEstates(): PracticeEstate[] {
    return PRACTICE_SANDBOX_ESTATES;
  },
};
